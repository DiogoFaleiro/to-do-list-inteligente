(function (App) {
  const { utils, recurrence } = App;

  // Parser CSV (RFC 4180) próprio, sem dependências. Máquina de estados
  // char-a-char: dentro de aspas, "" vira " escapado e qualquer outro
  // caractere (inclusive quebra de linha) entra literal no campo; fora de
  // aspas, vírgula fecha campo e \r\n/\r/\n fecham linha.
  function parseCsv(text) {
    const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    const len = input.length;

    function endField() {
      row.push(field);
      field = '';
    }
    function endRow() {
      endField();
      rows.push(row);
      row = [];
    }

    while (i < len) {
      const ch = input[i];
      if (inQuotes) {
        if (ch === '"') {
          if (input[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            inQuotes = false;
            i += 1;
          }
        } else {
          field += ch;
          i += 1;
        }
        continue;
      }
      if (ch === '"') {
        inQuotes = true;
        i += 1;
        continue;
      }
      if (ch === ',') {
        endField();
        i += 1;
        continue;
      }
      if (ch === '\r') {
        endRow();
        i += input[i + 1] === '\n' ? 2 : 1;
        continue;
      }
      if (ch === '\n') {
        endRow();
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
    }

    // Só fecha a última linha se sobrou algo depois da última quebra —
    // evita gerar uma linha vazia fantasma quando o arquivo termina
    // exatamente com uma quebra de linha.
    if (field !== '' || row.length > 0) {
      endRow();
    }

    return rows;
  }

  function stripMarkdown(title) {
    return title.replace(/^\*+/, '').replace(/\*+$/, '').trim();
  }

  // Notas com anexo (imagem, arquivo etc.) do Todoist trazem um marcador
  // [[file {json}]] no meio do texto — o anexo em si nunca é baixado/
  // importado (não há como, sem a API do Todoist), só um aviso textual no
  // lugar, preservando qualquer outro texto que a nota tiver. Se o JSON não
  // parsear (formato inesperado), mantém o trecho original intocado.
  function interpretNoteContent(raw) {
    return raw.replace(/\[\[file\s+(\{[\s\S]*?\})\]\]/g, (match, jsonStr) => {
      try {
        const parsed = JSON.parse(jsonStr);
        return `📎 ${parsed.file_name || 'arquivo'} (anexo do Todoist não importado)`;
      } catch (e) {
        return match;
      }
    });
  }

  // Interpreta o formato de template do Todoist (header TYPE,CONTENT,...).
  // Não interpreta a data (dateRaw fica cru) — isso é trabalho separado de
  // parseTodoistDate, função independente e composta por quem for usar.
  function parseTodoistExport(rows) {
    if (!rows || rows.length === 0) return { sections: [] };

    const header = rows[0];
    const typeIdx = header.indexOf('TYPE');
    const contentIdx = header.indexOf('CONTENT');
    const descriptionIdx = header.indexOf('DESCRIPTION');
    const indentIdx = header.indexOf('INDENT');
    const dateIdx = header.indexOf('DATE');

    const sections = [{ name: 'Sem seção', tasks: [] }];
    let currentSection = sections[0];
    // Última tarefa vista em cada nível de indentação — reseta a cada
    // nova seção (indentação não atravessa seções).
    let parentByIndent = {};
    // Última tarefa processada, de qualquer nível — é nela que uma nota
    // (type=note) logo em seguida vira comentário. Também reseta a cada
    // nova seção (uma nota não deveria "vazar" pra tarefa de outra seção).
    let lastTask = null;

    for (let r = 1; r < rows.length; r += 1) {
      const row = rows[r];
      if (!row || row.every((cell) => (cell || '').trim() === '')) continue;

      const type = (row[typeIdx] || '').trim().toLowerCase();
      const content = (row[contentIdx] || '').trim();

      if (type === '' || type === 'meta') continue;

      if (type === 'note') {
        if (lastTask) {
          // A coluna DATE de uma nota já é um timestamp ISO de verdade
          // (gerado pelo Todoist), diferente da data em texto livre de uma
          // tarefa — por isso não passa por parseTodoistDate aqui.
          const createdAt = (row[dateIdx] || '').trim() || new Date().toISOString();
          lastTask.comments.push({ content: interpretNoteContent(content), createdAt });
        }
        continue;
      }

      if (type === 'section') {
        currentSection = { name: content || 'Sem nome', tasks: [] };
        sections.push(currentSection);
        parentByIndent = {};
        lastTask = null;
        continue;
      }

      if (type === 'task') {
        const indent = parseInt(row[indentIdx], 10) || 1;
        const dateRaw = (row[dateIdx] || '').trim();
        const description = (row[descriptionIdx] || '').trim() || null;
        const task = { title: stripMarkdown(content), dateRaw, description, indent, children: [], comments: [] };

        const parent = indent > 1 ? parentByIndent[indent - 1] : null;
        if (parent) {
          parent.children.push(task);
        } else {
          currentSection.tasks.push(task);
        }

        parentByIndent[indent] = task;
        Object.keys(parentByIndent).forEach((key) => {
          if (Number(key) > indent) delete parentByIndent[key];
        });
        lastTask = task;
      }
    }

    return { sections };
  }

  // 0=domingo...6=sábado (Date.getDay()), nomes já sem acento (comparados
  // contra a string normalizada em parseTodoistDate).
  const WEEKDAY_PATTERNS = [
    { day: 0, names: ['domingo', 'dom'] },
    { day: 1, names: ['segunda-feira', 'segunda', 'seg'] },
    { day: 2, names: ['terca-feira', 'terca', 'ter'] },
    { day: 3, names: ['quarta-feira', 'quarta', 'qua'] },
    { day: 4, names: ['quinta-feira', 'quinta', 'qui'] },
    { day: 5, names: ['sexta-feira', 'sexta', 'sex'] },
    { day: 6, names: ['sabado', 'sab'] }
  ];

  // Faixa Unicode "Combining Diacritical Marks" (0x0300-0x036f) — construída
  // via charCode em vez de um literal \uXXXX no regex pra evitar qualquer
  // ambiguidade de encoding na origem do arquivo.
  const COMBINING_MARKS_RE = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

  function stripDiacritics(str) {
    return str.normalize('NFD').replace(COMBINING_MARKS_RE, '');
  }

  function normalizeForMatch(str) {
    return stripDiacritics(str).toLowerCase().trim().replace(/\s+/g, ' ');
  }

  // Tira um horário opcional do fim da string ("as/às HH", "as/às HH:MM"
  // ou "HH:MM" solto) — recebe a string já normalizada (sem acento, "às"
  // vira "as" pela própria normalização de acentos).
  function extractTime(normalized) {
    let m = normalized.match(/\bas\s+(\d{1,2})(?::(\d{2}))?\s*$/);
    if (m) {
      const hh = m[1].padStart(2, '0');
      const mm = (m[2] || '00').padStart(2, '0');
      return { rest: normalized.slice(0, m.index).trim(), dueTime: `${hh}:${mm}` };
    }
    m = normalized.match(/\b(\d{1,2}):(\d{2})\s*$/);
    if (m) {
      const hh = m[1].padStart(2, '0');
      return { rest: normalized.slice(0, m.index).trim(), dueTime: `${hh}:${m[2]}` };
    }
    return { rest: normalized, dueTime: null };
  }

  // App.recurrence.nextOccurrence sempre devolve uma data ESTRITAMENTE
  // maior que a data-base passada — é assim que uma recorrente atrasada
  // pula direto pro futuro ao ser concluída, e nunca "reconclui" o mesmo
  // dia duas vezes. Mas a PRIMEIRA ocorrência de uma tarefa importada é
  // diferente: se hoje já é o dia da regra (ex: importar "toda segunda"
  // numa segunda-feira), o Todoist considera hoje uma data válida, não
  // pula pra semana que vem. Por isso aqui a data-base é ontem, não hoje —
  // hoje passa a ser um candidato válido (estritamente maior que ontem).
  function firstOccurrence(rule, todayISO) {
    const yesterday = utils.addDaysISO(todayISO, -1);
    return recurrence.nextOccurrence(rule, yesterday, yesterday);
  }

  // Converte a string de data em pt-BR do Todoist em {dueDate, dueTime,
  // recurrence, ok, original}. dueDate de uma regra reconhecida vem de
  // firstOccurrence a partir de hoje (inclusive de hoje, diferente do
  // avanço usado ao concluir uma recorrente já existente).
  function parseTodoistDate(raw) {
    const original = raw;
    if (!raw || !raw.trim()) {
      return { dueDate: null, dueTime: null, recurrence: null, ok: true, original };
    }
    const trimmed = raw.trim();

    let m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      return { dueDate: trimmed, dueTime: null, recurrence: null, ok: true, original };
    }
    m = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      return { dueDate: `${m[3]}-${m[2]}-${m[1]}`, dueTime: null, recurrence: null, ok: true, original };
    }

    const normalized = normalizeForMatch(trimmed);
    const { rest, dueTime } = extractTime(normalized);
    const today = utils.todayISO();

    if (rest === 'todo dia' || rest === 'todos os dias') {
      const rule = { freq: 'daily', interval: 1, anchor: 'due' };
      return { dueDate: firstOccurrence(rule, today), dueTime, recurrence: rule, ok: true, original };
    }

    const weeklyMatch = rest.match(/^(?:toda|todo)\s+(\S+)$/);
    if (weeklyMatch) {
      const found = WEEKDAY_PATTERNS.find((w) => w.names.includes(weeklyMatch[1]));
      if (found) {
        const rule = { freq: 'weekly', interval: 1, byWeekday: [found.day], anchor: 'due' };
        return { dueDate: firstOccurrence(rule, today), dueTime, recurrence: rule, ok: true, original };
      }
    }

    return { dueDate: null, dueTime: null, recurrence: null, ok: false, original };
  }

  App.importTodoist = { parseCsv, parseTodoistExport, parseTodoistDate };
})(window.App = window.App || {});
