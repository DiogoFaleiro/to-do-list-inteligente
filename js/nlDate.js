(function (App) {
  const { utils, recurrence } = App;

  // Faixa Unicode "Combining Diacritical Marks" (0x0300-0x036f) — construída
  // via charCode em vez de um literal \uXXXX no regex pra evitar qualquer
  // ambiguidade de encoding na origem do arquivo (mesmo truque já usado em
  // js/importTodoist.js).
  const COMBINING_MARKS_RE = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

  // Remove acentos preservando o comprimento da string (letra acentuada
  // precomposta -> exatamente 1 caractere sem acento), pra que os índices
  // start/end calculados aqui continuem válidos direto no texto original.
  function stripDiacritics(str) {
    return str.normalize('NFD').replace(COMBINING_MARKS_RE, '');
  }

  function normalizeForMatch(str) {
    return stripDiacritics(str).toLowerCase();
  }

  // 0=domingo...6=sábado (Date.getDay()). Nomes de cada dia ordenados do
  // mais longo pro mais curto — o motor de regex do JS usa a PRIMEIRA
  // alternativa que bate dentro de (a|b|c), não a mais longa (diferente de
  // POSIX), então "segunda-feira" precisa vir antes de "segunda" na
  // alternação, senão "segunda-feira" seria casado só como "segunda".
  const WEEKDAY_PATTERNS = [
    { day: 0, names: ['domingo', 'dom'] },
    { day: 1, names: ['segunda-feira', 'segunda', 'seg'] },
    { day: 2, names: ['terca-feira', 'terca', 'ter'] },
    { day: 3, names: ['quarta-feira', 'quarta', 'qua'] },
    { day: 4, names: ['quinta-feira', 'quinta', 'qui'] },
    { day: 5, names: ['sexta-feira', 'sexta', 'sex'] },
    { day: 6, names: ['sabado', 'sab'] }
  ];

  const MONTH_PATTERNS = [
    { month: 1, names: ['janeiro', 'jan'] },
    { month: 2, names: ['fevereiro', 'fev'] },
    { month: 3, names: ['marco', 'mar'] },
    { month: 4, names: ['abril', 'abr'] },
    { month: 5, names: ['maio', 'mai'] },
    { month: 6, names: ['junho', 'jun'] },
    { month: 7, names: ['julho', 'jul'] },
    { month: 8, names: ['agosto', 'ago'] },
    { month: 9, names: ['setembro', 'set'] },
    { month: 10, names: ['outubro', 'out'] },
    { month: 11, names: ['novembro', 'nov'] },
    { month: 12, names: ['dezembro', 'dez'] }
  ];

  // primeira/segunda/terceira/quarta -> 1..4; última -> 'last' (sentinel,
  // não um número — ver App.recurrence byMonthDay/byNthWeekday).
  const ORDINAL_TO_N = { primeira: 1, segunda: 2, terceira: 3, quarta: 4, ultima: 'last' };

  function namesSortedByLength(list) {
    const all = [];
    list.forEach((item) => item.names.forEach((n) => all.push(n)));
    return all.sort((a, b) => b.length - a.length).join('|');
  }

  function findByName(list, key, name) {
    const found = list.find((item) => item.names.includes(name));
    return found ? found[key] : null;
  }

  // Horário combinável com qualquer expressão de recorrência, nos formatos
  // "as"/"às" (já sem o acento, removido na normalização) é um prefixo
  // OPCIONAL que pode vir antes de qualquer formato numérico — "às HH",
  // "às HHh", "às HHhMM" e "às HH:MM" são todos válidos (ex. do próprio
  // pedido: "toda terceira sexta às 18h30", "todo dia 5 às 10h") — só o
  // formato puramente numérico "HH" sozinho (sem "h" nem ":") exige o
  // prefixo "as", senão seria fácil casar qualquer número solto por engano.
  // Ordem importa: "h"/":" são testados antes do "HH" puro, senão "as 18"
  // dentro de "as 18:30" já bateria sozinho e deixaria ":30" de fora.
  const TIME_SRC =
    '(?:\\s+(?:as\\s+)?(?<hhH>\\d{1,2})h(?<mmH>\\d{2})?\\b' +
    '|\\s+(?:as\\s+)?(?<hhC>\\d{1,2}):(?<mmC>\\d{2})\\b' +
    '|\\s+as\\s+(?<hhA>\\d{1,2})\\b)';

  function extractTime(groups) {
    if (!groups) return null;
    if (groups.hhH !== undefined) return `${groups.hhH.padStart(2, '0')}:${(groups.mmH || '00').padStart(2, '0')}`;
    if (groups.hhC !== undefined) return `${groups.hhC.padStart(2, '0')}:${groups.mmC.padStart(2, '0')}`;
    if (groups.hhA !== undefined) return `${groups.hhA.padStart(2, '0')}:00`;
    return null;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  // n-ésima ocorrência (1-4) ou última ('last') de um dia da semana num mês
  // específico — mesmo algoritmo usado em js/recurrence.js (duplicado aqui
  // de propósito: este cálculo é pra achar a PRIMEIRA ocorrência direto,
  // sem depender do laço de recálculo do recurrence.js, ver plano).
  function nthWeekdayOfMonth(y, m, weekday, n) {
    const firstWeekday = new Date(y, m - 1, 1).getDay();
    const firstOccurrenceDay = 1 + ((weekday - firstWeekday + 7) % 7);
    if (n === 'last') {
      let day = firstOccurrenceDay;
      while (day + 7 <= daysInMonth(y, m)) day += 7;
      return day;
    }
    const day = firstOccurrenceDay + (n - 1) * 7;
    return day <= daysInMonth(y, m) ? day : null;
  }

  function addMonthsYM(y, m, monthsAhead) {
    const total = y * 12 + (m - 1) + monthsAhead;
    return { y: Math.floor(total / 12), m: (total % 12) + 1 };
  }

  // ---- Cálculo direto da PRIMEIRA ocorrência pras famílias mensais ----
  // (dia-do-mês, n-ésimo-dia-da-semana, último-dia, aniversário-anual) —
  // não reaproveita App.recurrence.nextOccurrence pra isso (ver descoberta
  // no plano: o truque de "base=ontem" não funciona pra regras mensais no
  // laço atual do advanceOnce). App.recurrence.nextOccurrence continua
  // sendo o mecanismo usado pelo RECÁLCULO depois que a tarefa já existe.

  function firstMonthlyByMonthDay(todayISO, day) {
    const [y, mo] = todayISO.split('-').map(Number);
    const candidate = `${y}-${pad2(mo)}-${pad2(Math.min(day, daysInMonth(y, mo)))}`;
    if (candidate >= todayISO) return candidate;
    const next = addMonthsYM(y, mo, 1);
    return `${next.y}-${pad2(next.m)}-${pad2(Math.min(day, daysInMonth(next.y, next.m)))}`;
  }

  function firstMonthlyLastDay(todayISO) {
    const [y, mo] = todayISO.split('-').map(Number);
    const candidate = `${y}-${pad2(mo)}-${pad2(daysInMonth(y, mo))}`;
    if (candidate >= todayISO) return candidate;
    const next = addMonthsYM(y, mo, 1);
    return `${next.y}-${pad2(next.m)}-${pad2(daysInMonth(next.y, next.m))}`;
  }

  function firstMonthlyNthWeekday(todayISO, n, weekday) {
    const [y, mo] = todayISO.split('-').map(Number);
    const day = nthWeekdayOfMonth(y, mo, weekday, n);
    if (day != null) {
      const candidate = `${y}-${pad2(mo)}-${pad2(day)}`;
      if (candidate >= todayISO) return candidate;
    }
    const next = addMonthsYM(y, mo, 1);
    const nextDay = nthWeekdayOfMonth(next.y, next.m, weekday, n); // n=1..4/last sempre existe
    return `${next.y}-${pad2(next.m)}-${pad2(nextDay)}`;
  }

  function nextYearlyMonthDay(todayISO, month, day) {
    const [y] = todayISO.split('-').map(Number);
    const candidate = `${y}-${pad2(month)}-${pad2(Math.min(day, daysInMonth(y, month)))}`;
    if (candidate >= todayISO) return candidate;
    return `${y + 1}-${pad2(month)}-${pad2(Math.min(day, daysInMonth(y + 1, month)))}`;
  }

  // Primeira ocorrência inclusiva de hoje pras famílias diária/semanal —
  // delega pro App.recurrence.nextOccurrence já testado (base=ontem faz
  // hoje virar um candidato válido, já que nextOccurrence só devolve datas
  // estritamente maiores que a data-base).
  function firstOccurrence(rule, todayISO) {
    const yesterday = utils.addDaysISO(todayISO, -1);
    return recurrence.nextOccurrence(rule, yesterday, yesterday);
  }

  // ---- Lista de pattern specs ----
  // Cada spec: { src (regex sem sufixo de hora), build(groups, todayISO) }.
  // build devolve { dueDate, recurrence, defaultDueTime? } ou { unsupported:true }
  // ou null (candidato inválido, descartado antes da escolha por maior span).
  function buildSpecs() {
    const weekdayAlt = namesSortedByLength(WEEKDAY_PATTERNS);
    const monthAlt = namesSortedByLength(MONTH_PATTERNS);
    const ordinalAlt = Object.keys(ORDINAL_TO_N).sort((a, b) => b.length - a.length).join('|');

    return [
      {
        id: 'weekday-util',
        src: '\\btodos?\\s+(?:os\\s+)?dias?\\s+(?:util|uteis|de\\s+semana)\\b',
        build: (g, todayISO) => {
          const rule = { freq: 'weekly', interval: 1, byWeekday: [1, 2, 3, 4, 5], anchor: 'due' };
          return { dueDate: firstOccurrence(rule, todayISO), recurrence: rule };
        }
      },
      {
        id: 'daily',
        src: '\\b(?:todo\\s+dia|todos\\s+os\\s+dias|diariamente)\\b',
        build: (g, todayISO) => {
          // anchor 'completed' (não 'due') de propósito — comportamento do
          // Todoist pra diária: o recálculo conta a partir de quando a
          // tarefa foi concluída de verdade, não da data agendada original.
          const rule = { freq: 'daily', interval: 1, anchor: 'completed' };
          return { dueDate: firstOccurrence(rule, todayISO), recurrence: rule };
        }
      },
      {
        id: 'turno',
        src: '\\btoda\\s+(?<turno>manha|tarde|noite)\\b',
        build: (g, todayISO) => {
          const rule = { freq: 'daily', interval: 1, anchor: 'completed' };
          const defaults = { manha: '09:00', tarde: '12:00', noite: '22:00' };
          return { dueDate: firstOccurrence(rule, todayISO), recurrence: rule, defaultDueTime: defaults[g.turno] };
        }
      },
      {
        id: 'weekend',
        src: '\\btodo\\s+fi(?:m|nal)\\s+de\\s+semana\\b',
        build: (g, todayISO) => {
          const rule = { freq: 'weekly', interval: 1, byWeekday: [6], anchor: 'due' };
          return { dueDate: firstOccurrence(rule, todayISO), recurrence: rule };
        }
      },
      {
        id: 'weekly-plain',
        src: '\\b(?:toda\\s+semana|semanal(?:mente)?)\\b',
        build: (g, todayISO) => {
          const weekday = utils.parseISO(todayISO).getDay();
          const rule = { freq: 'weekly', interval: 1, byWeekday: [weekday], anchor: 'due' };
          return { dueDate: todayISO, recurrence: rule };
        }
      },
      {
        id: 'weekday-single',
        src: `\\btod[oa]s?\\s+(?<weekday>${weekdayAlt})\\b`,
        build: (g, todayISO) => {
          const day = findByName(WEEKDAY_PATTERNS, 'day', g.weekday);
          if (day == null) return null;
          const rule = { freq: 'weekly', interval: 1, byWeekday: [day], anchor: 'due' };
          return { dueDate: firstOccurrence(rule, todayISO), recurrence: rule };
        }
      },
      {
        id: 'monthly-plain',
        src: '\\b(?:todo\\s+mes|mensal(?:mente)?)\\b',
        build: (g, todayISO) => {
          const day = Number(todayISO.slice(8, 10));
          const rule = { freq: 'monthly', interval: 1, byMonthDay: day, anchor: 'due' };
          return { dueDate: todayISO, recurrence: rule };
        }
      },
      {
        id: 'monthly-day-of-month',
        src: '\\btodo\\s+(?:dia\\s+)?(?<n>\\d{1,2})\\b',
        build: (g, todayISO) => {
          const n = Number(g.n);
          if (n < 1 || n > 31) return null; // dia inválido — descarta o candidato
          const rule = { freq: 'monthly', interval: 1, byMonthDay: n, anchor: 'due' };
          return { dueDate: firstMonthlyByMonthDay(todayISO, n), recurrence: rule };
        }
      },
      {
        id: 'nth-weekday',
        src: `\\btod[oa]s?\\s+(?<ord>${ordinalAlt})\\s+(?<weekday>${weekdayAlt})\\b`,
        build: (g, todayISO) => {
          const n = ORDINAL_TO_N[g.ord];
          const weekday = findByName(WEEKDAY_PATTERNS, 'day', g.weekday);
          if (n === undefined || weekday == null) return null;
          const rule = { freq: 'monthly', interval: 1, byNthWeekday: { n, weekday }, anchor: 'due' };
          return { dueDate: firstMonthlyNthWeekday(todayISO, n, weekday), recurrence: rule };
        }
      },
      {
        id: 'monthly-last-day',
        src: '\\btodo\\s+ultimo\\s+dia(?:\\s+do\\s+mes)?\\b',
        build: (g, todayISO) => {
          const rule = { freq: 'monthly', interval: 1, byMonthDay: 'last', anchor: 'due' };
          return { dueDate: firstMonthlyLastDay(todayISO), recurrence: rule };
        }
      },
      {
        id: 'yearly-plain',
        src: '\\b(?:todo\\s+ano|anual(?:mente)?)\\b',
        build: (g, todayISO) => {
          const rule = { freq: 'monthly', interval: 12, anchor: 'due' };
          return { dueDate: todayISO, recurrence: rule };
        }
      },
      {
        id: 'yearly-month-day',
        src: `\\btodo\\s+(?<n>\\d{1,2})\\s+de\\s+(?<mes>${monthAlt})\\b`,
        build: (g, todayISO) => {
          const n = Number(g.n);
          const month = findByName(MONTH_PATTERNS, 'month', g.mes);
          if (n < 1 || n > 31 || month == null) return null;
          const rule = { freq: 'monthly', interval: 12, anchor: 'due' };
          return { dueDate: nextYearlyMonthDay(todayISO, month, n), recurrence: rule };
        }
      },
      {
        id: 'unsupported-hourly',
        src: '\\b(?:toda\\s+hora|a\\s+cada\\s+hora|de\\s+hora\\s+em\\s+hora)\\b',
        build: () => ({ unsupported: true })
      }
    ];
  }

  function collectCandidates(specs, normalizedText, todayISO) {
    const candidates = [];
    specs.forEach((spec) => {
      const re = new RegExp(spec.src + '(?:' + TIME_SRC + ')?', 'g');
      let m = re.exec(normalizedText);
      while (m !== null) {
        const built = spec.build(m.groups || {}, todayISO);
        if (built) {
          candidates.push({
            start: m.index,
            end: m.index + m[0].length,
            groups: m.groups || {},
            built
          });
        }
        if (re.lastIndex === m.index) re.lastIndex += 1; // salvaguarda contra match vazio
        m = re.exec(normalizedText);
      }
    });
    return candidates;
  }

  // Acha a expressão de data/recorrência dentro de `text` (não precisa ser
  // o texto inteiro) e devolve a interpretação. Ver contrato completo no
  // plano da fase — resumo: { match:{start,end,raw}|null, dueDate, dueTime,
  // recurrence, description, unsupported }.
  function parse(text) {
    const empty = { match: null, dueDate: null, dueTime: null, recurrence: null, description: null, unsupported: false };
    if (!text) return empty;

    const todayISO = utils.todayISO();
    const normalized = normalizeForMatch(text);
    const candidates = collectCandidates(buildSpecs(), normalized, todayISO);

    // Maior span vence; empate resolvido pelo start mais à esquerda — isso
    // já reproduz toda a ordem de especificidade pedida (ver plano), porque
    // toda frase mais específica também é textualmente mais longa.
    let winner = null;
    candidates.forEach((c) => {
      const length = c.end - c.start;
      if (!winner || length > winner.end - winner.start || (length === winner.end - winner.start && c.start < winner.start)) {
        winner = c;
      }
    });

    if (!winner) return empty;

    const match = { start: winner.start, end: winner.end, raw: text.slice(winner.start, winner.end) };

    if (winner.built.unsupported) {
      return { match, dueDate: null, dueTime: null, recurrence: null, description: null, unsupported: true };
    }

    const explicitTime = extractTime(winner.groups);
    const dueTime = explicitTime || winner.built.defaultDueTime || null;
    const description = recurrence.describeRule(winner.built.recurrence) + (dueTime ? ` às ${dueTime}` : '');

    return {
      match,
      dueDate: winner.built.dueDate,
      dueTime,
      recurrence: winner.built.recurrence,
      description,
      unsupported: false
    };
  }

  App.nlDate = { parse };
})(window.App = window.App || {});
