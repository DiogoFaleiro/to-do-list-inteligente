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
    const dateLangIdx = header.indexOf('DATE_LANG');

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
        // Ausência da coluna (export antigo) ou valor vazio cai em 'pt' —
        // mesma leitura que parseTodoistDate já fazia implicitamente antes
        // de DATE_LANG existir.
        const dateLang = (row[dateLangIdx] || '').trim().toLowerCase() || 'pt';
        const description = (row[descriptionIdx] || '').trim() || null;
        const task = { title: stripMarkdown(content), dateRaw, dateLang, description, indent, children: [], comments: [] };

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

  // ---- Vocabulário PONTUAL/RECORRENTE em inglês (DATE_LANG='en') ----
  // Mini-parser local, independente de App.nlDate (que só entende pt-BR) —
  // resolve o vocabulário do Todoist em inglês antes de considerar delegar
  // pro parser pt. Sem competição por span como em js/nlDate.js: aqui as
  // frases não se sobrepõem (cada uma tem uma palavra-chave própria), então
  // uma cadeia de if/return em ordem fixa já é suficiente e mais simples.

  const WEEKDAY_EN = [
    { day: 0, names: ['sunday', 'sun'] },
    { day: 1, names: ['monday', 'mon'] },
    { day: 2, names: ['tuesday', 'tue'] },
    { day: 3, names: ['wednesday', 'wed'] },
    { day: 4, names: ['thursday', 'thu'] },
    { day: 5, names: ['friday', 'fri'] },
    { day: 6, names: ['saturday', 'sat'] }
  ];

  function englishWeekdayAlternation() {
    const all = [];
    WEEKDAY_EN.forEach((w) => all.push(...w.names));
    return all.sort((a, b) => b.length - a.length).join('|');
  }

  function findEnglishWeekday(name) {
    const found = WEEKDAY_EN.find((w) => w.names.includes(name));
    return found ? found.day : null;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  // Próxima ocorrência do dia da semana, inclusive hoje — mesma lógica de
  // nextWeekdayInclusive em js/nlDate.js, duplicada aqui de propósito (cada
  // módulo é seu próprio closure IIFE, sem compartilhar funções internas).
  function nextWeekdayInclusiveEn(todayISO, weekday) {
    const todayWeekday = utils.parseISO(todayISO).getDay();
    const diff = (weekday - todayWeekday + 7) % 7;
    return utils.addDaysISO(todayISO, diff);
  }

  // Primeira ocorrência inclusiva de hoje pras famílias diária/semanal —
  // mesmo truque de js/nlDate.js: base=ontem faz hoje virar candidato
  // válido, já que nextOccurrence só devolve datas estritamente > base.
  function firstOccurrenceEn(rule, todayISO) {
    const yesterday = utils.addDaysISO(todayISO, -1);
    return recurrence.nextOccurrence(rule, yesterday, yesterday);
  }

  function to24h(hh, mm, ap) {
    let h = Number(hh);
    const m = mm !== undefined && mm !== null ? Number(mm) : 0;
    if (ap) {
      const lower = ap.toLowerCase();
      if (lower === 'am' && h === 12) h = 0;
      else if (lower === 'pm' && h !== 12) h += 12;
    }
    return `${pad2(h)}:${pad2(m)}`;
  }

  // "at HH", "at HH:MM", "at H:MMam/pm", "HH:MM" solto (am/pm opcional em
  // qualquer forma com dois-pontos, com ou sem "at" na frente). Extraído
  // ANTES do vocabulário de data, e removido do texto restante, pra um
  // número de horário não se confundir com o N de "N days ago"/"in N days".
  const TIME_EN_RE = /\b(?:at\s+)?(\d{1,2}):(\d{2})\s*(am|pm)?\b|\bat\s+(\d{1,2})\b/i;

  function extractEnglishTime(text) {
    const m = text.match(TIME_EN_RE);
    if (!m) return { time: null, rest: text };
    const time = m[1] !== undefined ? to24h(m[1], m[2], m[3]) : to24h(m[4], null, null);
    const rest = (text.slice(0, m.index) + text.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim();
    return { time, rest };
  }

  // Devolve { dueDate, recurrence } ou null (nada do vocabulário em inglês
  // bateu). `text` já vem sem o trecho de horário e em minúsculas.
  function parseEnglishVocabulary(text, todayISO) {
    if (/\b(?:every\s+day|daily)\b/.test(text)) {
      const rule = { freq: 'daily', interval: 1, anchor: 'completed' };
      return { dueDate: firstOccurrenceEn(rule, todayISO), recurrence: rule };
    }

    let m = text.match(new RegExp(`\\bevery\\s+(${englishWeekdayAlternation()})\\b`));
    if (m) {
      const day = findEnglishWeekday(m[1]);
      const rule = { freq: 'weekly', interval: 1, byWeekday: [day], anchor: 'due' };
      return { dueDate: firstOccurrenceEn(rule, todayISO), recurrence: rule };
    }

    if (/\b(?:every\s+month|monthly)\b/.test(text)) {
      const day = Number(todayISO.slice(8, 10));
      const rule = { freq: 'monthly', interval: 1, byMonthDay: day, anchor: 'due' };
      return { dueDate: todayISO, recurrence: rule };
    }

    if (/\btoday\b/.test(text)) {
      return { dueDate: todayISO, recurrence: null };
    }

    if (/\btomorrow\b/.test(text)) {
      return { dueDate: utils.addDaysISO(todayISO, 1), recurrence: null };
    }

    if (/\byesterday\b/.test(text)) {
      return { dueDate: utils.addDaysISO(todayISO, -1), recurrence: null };
    }

    // "N days ago" — tarefa atrasada, o vencimento no passado é intencional
    // (não clampa pra hoje).
    m = text.match(/\b(\d{1,3})\s+days?\s+ago\b/);
    if (m) {
      return { dueDate: utils.addDaysISO(todayISO, -Number(m[1])), recurrence: null };
    }

    m = text.match(/\bin\s+(\d{1,3})\s+days?\b/);
    if (m) {
      return { dueDate: utils.addDaysISO(todayISO, Number(m[1])), recurrence: null };
    }

    m = text.match(new RegExp(`\\b(${englishWeekdayAlternation()})\\b`));
    if (m) {
      const day = findEnglishWeekday(m[1]);
      return { dueDate: nextWeekdayInclusiveEn(todayISO, day), recurrence: null };
    }

    return null;
  }

  // Converte a string de data do Todoist em {dueDate, dueTime, recurrence,
  // ok, original}. `lang` vem da coluna DATE_LANG do CSV (default 'pt',
  // mantendo compatibilidade com chamadas existentes). Datas absolutas
  // (ISO/BR com ano) são reconhecidas direto, independente do idioma — não
  // fazem parte do vocabulário de linguagem natural de nenhum dos dois
  // parsers. Pra lang='en', tenta primeiro o mini-vocabulário em inglês
  // acima; se não bater, cai no mesmo fallback de sempre (App.nlDate.parse,
  // pt-BR) — ou seja, um valor em inglês não reconhecido ainda tem chance
  // de bater por coincidência no vocabulário pt, e só falha (ok:false) se
  // não bater em nenhum dos dois. Pra lang!=='en' (inclui 'pt' e qualquer
  // outro valor/coluna ausente) o comportamento é idêntico ao de antes.
  function parseTodoistDate(raw, lang) {
    const original = raw;
    const effectiveLang = lang || 'pt';
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

    // Data curta sem ano ("N/N") é ambígua em inglês (MM/DD vs DD/MM) — em
    // vez de arriscar inverter dia e mês silenciosamente, não interpreta.
    if (effectiveLang === 'en' && /^\d{1,2}\/\d{1,2}$/.test(trimmed)) {
      return { dueDate: null, dueTime: null, recurrence: null, ok: false, original };
    }

    if (effectiveLang === 'en') {
      const todayISO = utils.todayISO();
      const { time, rest } = extractEnglishTime(trimmed.toLowerCase());
      const enResult = parseEnglishVocabulary(rest, todayISO);
      if (enResult) {
        return { dueDate: enResult.dueDate, dueTime: time, recurrence: enResult.recurrence, ok: true, original };
      }
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
