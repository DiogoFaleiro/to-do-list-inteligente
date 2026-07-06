(function (App) {
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

  // Converte a string de data em pt-BR do Todoist em {dueDate, dueTime,
  // recurrence, ok, original}. Datas absolutas (ISO/BR) são reconhecidas
  // aqui direto — não fazem parte do vocabulário de linguagem natural do
  // App.nlDate. Qualquer outra coisa delega pra App.nlDate.parse, que
  // reconhece um vocabulário bem maior (turnos do dia, dia útil, fim de
  // semana, dia do mês, n-ésimo dia da semana do mês, último dia do mês,
  // aniversário anual) — ver js/nlDate.js.
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

    const parsed = App.nlDate.parse(trimmed);
    const ok = !!parsed.match && !parsed.unsupported;
    return {
      dueDate: ok ? parsed.dueDate : null,
      dueTime: ok ? parsed.dueTime : null,
      recurrence: ok ? parsed.recurrence : null,
      ok,
      original
    };
  }

  App.importTodoist = { parseCsv, parseTodoistExport, parseTodoistDate };
})(window.App = window.App || {});
