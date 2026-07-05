(function (App) {
  const { utils } = App;

  // 0=domingo ... 6=sábado, igual Date.getDay() — é o mesmo formato usado
  // no campo tasks.recurrence.byWeekday (ver 0011_recurrence_todoist.sql).
  const WEEKDAY_ABBR = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  // Ordem de exibição de dias da semana começando na segunda (domingo por
  // último), só pra ficar mais natural de ler ("seg, qua, sex").
  const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

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
      if (rule.byMonthDay) {
        base = interval === 1 ? `Todo dia ${rule.byMonthDay}` : `A cada ${interval} meses no dia ${rule.byMonthDay}`;
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
      if (!rule.byMonthDay) {
        return addMonthsClamped(candidate, interval);
      }
      const startMonth1 = start.slice(0, 8) + '01';
      const candidateMonths = monthsBetween(startMonth1, candidate.slice(0, 8) + '01');
      const maxMonths = interval * 24; // salvaguarda: 2 anos de meses candidatos
      for (let i = 1; i <= maxMonths; i += 1) {
        const monthsAhead = candidateMonths + i;
        if (monthsAhead % interval !== 0) continue;
        return addMonthsClamped(startMonth1, monthsAhead, rule.byMonthDay);
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
