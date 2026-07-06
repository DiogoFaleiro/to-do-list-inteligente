(function (App) {
  const { utils } = App;

  // 0=domingo ... 6=sábado, igual Date.getDay() — é o mesmo formato usado
  // no campo tasks.recurrence.byWeekday (ver 0011_recurrence_todoist.sql).
  const WEEKDAY_ABBR = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  // Ordem de exibição de dias da semana começando na segunda (domingo por
  // último), só pra ficar mais natural de ler ("seg, qua, sex").
  const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
  // Nome por extenso do n-ésimo (usado só em byNthWeekday) — 'last' é o
  // sentinel de "última ocorrência do mês", não um número.
  const ORDINAL_NAMES = { 1: 'primeira', 2: 'segunda', 3: 'terceira', 4: 'quarta', last: 'última' };

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatShort(dateISO, includeYear) {
    const [y, m, d] = dateISO.split('-');
    return includeYear ? `${d}/${m}/${y}` : `${d}/${m}`;
  }

  function untilSuffix(rule) {
    if (!rule.until) return '';
    const sameYear = rule.until.slice(0, 4) === utils.todayISO().slice(0, 4);
    return ` até ${formatShort(rule.until, !sameYear)}`;
  }

  function sortedWeekdayNames(byWeekday) {
    return WEEKDAY_DISPLAY_ORDER.filter((d) => byWeekday.includes(d)).map((d) => WEEKDAY_ABBR[d]);
  }

  // Descreve uma regra de recorrência em texto (pt-BR). Regra ausente ou
  // sem freq reconhecido cai num texto neutro em vez de quebrar.
  function describeRule(rule) {
    if (!rule || !rule.freq) return 'Recorrente';
    const interval = rule.interval && rule.interval > 0 ? rule.interval : 1;
    let base;

    if (rule.freq === 'daily') {
      base = interval === 1 ? 'Todo dia' : `A cada ${interval} dias`;
    } else if (rule.freq === 'weekly') {
      if (rule.byWeekday && rule.byWeekday.length > 0) {
        const names = sortedWeekdayNames(rule.byWeekday).join(', ');
        base = interval === 1 ? `Toda ${names}` : `A cada ${interval} semanas (${names})`;
      } else {
        base = interval === 1 ? 'Toda semana' : `A cada ${interval} semanas`;
      }
    } else if (rule.freq === 'monthly') {
      if (rule.byNthWeekday) {
        const ordinalName = ORDINAL_NAMES[rule.byNthWeekday.n] || `${rule.byNthWeekday.n}ª`;
        const weekdayName = sortedWeekdayNames([rule.byNthWeekday.weekday])[0];
        base =
          interval === 1
            ? `Toda ${ordinalName} ${weekdayName}`
            : `A cada ${interval} meses na ${ordinalName} ${weekdayName}`;
      } else if (rule.byMonthDay === 'last') {
        base = interval === 1 ? 'Todo último dia do mês' : `A cada ${interval} meses no último dia`;
      } else if (rule.byMonthDay) {
        base = interval === 1 ? `Todo dia ${rule.byMonthDay}` : `A cada ${interval} meses no dia ${rule.byMonthDay}`;
      } else if (interval % 12 === 0) {
        // "Todo ano" da UI vira monthly/interval=12 por baixo (addMonthsClamped
        // já lida certo com qualquer múltiplo de 12) — mostra em anos aqui.
        const years = interval / 12;
        base = years === 1 ? 'Todo ano' : `A cada ${years} anos`;
      } else {
        base = interval === 1 ? 'Todo mês' : `A cada ${interval} meses`;
      }
    } else {
      return 'Recorrente';
    }

    return base + untilSuffix(rule);
  }

  function getWeekday(dateISO) {
    return utils.parseISO(dateISO).getDay();
  }

  // Segunda-feira da semana que contém a data (semana começa na segunda,
  // mesma convenção usada no resto do app).
  function mondayOfWeek(dateISO) {
    const day = (getWeekday(dateISO) + 6) % 7; // segunda=0 ... domingo=6
    return utils.addDaysISO(dateISO, -day);
  }

  function weeksBetween(mondayA, mondayB) {
    const ms = utils.parseISO(mondayB).getTime() - utils.parseISO(mondayA).getTime();
    return Math.round(ms / (7 * 24 * 60 * 60 * 1000));
  }

  function monthsBetween(dateAISO, dateBISO) {
    const a = utils.parseISO(dateAISO);
    const b = utils.parseISO(dateBISO);
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  }

  // Soma meses a uma data, "grudando" no último dia do mês de destino
  // quando ele não tem dias suficientes (ex: 31/jan + 1 mês -> 28/29 fev).
  function addMonthsClamped(dateISO, months, forceDay) {
    const d = utils.parseISO(dateISO);
    const day = forceDay || d.getDate();
    d.setDate(1); // evita que setMonth "role" pro mês seguinte num dia alto
    d.setMonth(d.getMonth() + months);
    const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, lastDayOfMonth));
    return utils.dateToISO(d);
  }

  // m: mês 1-12 (não 0-indexado, diferente de Date nativo).
  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  // n-ésima ocorrência (1-4) ou última ('last') de um dia da semana num mês
  // específico. n=1..4 sempre existe em qualquer mês (28-31 dias garantem
  // pelo menos 4 ocorrências de cada dia da semana); um hipotético n=5 pode
  // não existir, e nesse caso devolve null (chamador decide pular pro
  // próximo mês candidato).
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

  // Um passo à frente a partir de `candidate`, respeitando freq/interval/
  // byWeekday/byMonthDay. `start` é a referência fixa (data de onde a
  // contagem de semanas/meses do interval é medida) — ver nextOccurrence.
  function advanceOnce(candidate, rule, interval, start) {
    if (rule.freq === 'daily') {
      return utils.addDaysISO(candidate, interval);
    }

    if (rule.freq === 'weekly') {
      if (!rule.byWeekday || rule.byWeekday.length === 0) {
        return utils.addDaysISO(candidate, 7 * interval);
      }
      const startMonday = mondayOfWeek(start);
      let next = candidate;
      const maxDays = 7 * interval + 7; // salvaguarda: nunca precisa de mais que isso
      for (let i = 0; i < maxDays; i += 1) {
        next = utils.addDaysISO(next, 1);
        if (!rule.byWeekday.includes(getWeekday(next))) continue;
        if (weeksBetween(startMonday, mondayOfWeek(next)) % interval === 0) return next;
      }
      return next;
    }

    if (rule.freq === 'monthly') {
      if (!rule.byMonthDay && !rule.byNthWeekday) {
        return addMonthsClamped(candidate, interval);
      }
      const startMonth1 = start.slice(0, 8) + '01';
      const candidateMonths = monthsBetween(startMonth1, candidate.slice(0, 8) + '01');
      const maxMonths = interval * 24; // salvaguarda: 2 anos de meses candidatos
      // Começa em i=0 (testa o mês de `candidate` também, não só os
      // seguintes) — a guarda `result <= candidate` abaixo garante que isso
      // só muda o resultado quando o dia-alvo do mês corrente ainda não
      // passou; num recálculo normal (candidate = due_date já vencida ou
      // igual a hoje) o dia-alvo do mês corrente já ficou pra trás, então
      // cai exatamente no mesmo resultado de antes (a partir de i=1).
      for (let i = 0; i <= maxMonths; i += 1) {
        const monthsAhead = candidateMonths + i;
        if (monthsAhead % interval !== 0) continue;
        const monthStart = addMonthsClamped(startMonth1, monthsAhead);
        const [ty, tm] = monthStart.split('-').map(Number);
        let result;
        if (rule.byNthWeekday) {
          const day = nthWeekdayOfMonth(ty, tm, rule.byNthWeekday.weekday, rule.byNthWeekday.n);
          if (day == null) continue; // mês sem essa n-ésima ocorrência, tenta o próximo
          result = `${monthStart.slice(0, 8)}${pad2(day)}`;
        } else if (rule.byMonthDay === 'last') {
          result = `${monthStart.slice(0, 8)}${pad2(daysInMonth(ty, tm))}`;
        } else {
          result = addMonthsClamped(startMonth1, monthsAhead, rule.byMonthDay);
        }
        if (result <= candidate) continue;
        return result;
      }
      return candidate;
    }

    return candidate;
  }

  // Calcula a próxima data de vencimento de uma tarefa recorrente.
  // - anchor='due': conta a partir de fromDateISO (agenda fixa, tipo "toda
  //   segunda", não muda se a tarefa atrasar).
  // - anchor='completed': conta a partir de todayISO (empurra a partir de
  //   quando foi concluída de verdade).
  //
  // O resultado é SEMPRE uma data estritamente futura (> todayISO): se a
  // tarefa ficou várias ocorrências sem ser concluída, pula direto pra
  // próxima data futura de verdade, sem empilhar as ocorrências perdidas
  // no meio do caminho. É o mesmo comportamento do Todoist — uma
  // recorrente atrasada não vira uma fila de pendências, ela só
  // re-agenda pra frente.
  function nextOccurrence(rule, fromDateISO, todayISO) {
    if (!rule || !rule.freq) return null;
    const interval = rule.interval && rule.interval > 0 ? rule.interval : 1;
    const start = rule.anchor === 'due' ? fromDateISO : todayISO;

    let candidate = start;
    let guard = 0;
    const SAFETY_LIMIT = 1000; // regra inconsistente não deve travar o app
    do {
      candidate = advanceOnce(candidate, rule, interval, start);
      guard += 1;
      if (guard > SAFETY_LIMIT) return null;
    } while (candidate <= todayISO);

    if (rule.until && candidate > rule.until) return null;
    return candidate;
  }

  App.recurrence = { describeRule, nextOccurrence };
})(window.App = window.App || {});
