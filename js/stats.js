// Agregação específica da tela "Minhas estatísticas" (dashboard pessoal):
// transforma as rows cruas de state.statsDoneTasks/statsCompletions/
// statsTaskProjectMap (js/store.js) em séries por semana/mês/projeto. Karma,
// HTML dos cards e o desenho dos gráficos em si ficam em js/statsCharts.js
// (compartilhado com o drill-down de usuário do painel admin) — este módulo
// só conhece o formato de dados do app principal, nunca desenha nada.
(function (App) {
  const { utils, statsCharts } = App;

  // Cor de fallback pra conclusões sem projeto (tarefa/completions com
  // project_id nulo) — mesmo espírito do '#6c5ce7' default de addProject,
  // mas cinza neutro pra não competir visualmente com cores reais de projeto.
  const NO_PROJECT_COLOR = statsCharts.NO_PROJECT_COLOR;

  function normalizeEventDate(value, origin) {
    if (!value) {
      console.warn(`Minhas estatísticas: data ausente (${origin})`);
      return null;
    }
    const parsed = utils.parseISO(value);
    if (Number.isNaN(parsed.getTime())) {
      console.warn(`Minhas estatísticas: data inválida "${value}" (${origin})`);
      return null;
    }
    return value;
  }

  // Materialização única da definição canônica de conclusão: um evento por
  // tarefa done + um evento por linha de task_completions. Todas as
  // agregações abaixo partem daqui, nunca lendo doneTasks/completions direto.
  function buildCompletionEvents(doneTasks, completions, taskProjectMap) {
    const events = [];
    (doneTasks || []).forEach((t) => {
      events.push({
        date: normalizeEventDate(t.completedDate, `tarefa done id=${t.id}`),
        projectId: t.projectId || null
      });
    });
    (completions || []).forEach((c) => {
      const projectId = (taskProjectMap && taskProjectMap[c.taskId]) || null;
      events.push({
        date: normalizeEventDate(c.completedOn, `task_completions id=${c.id}`),
        projectId
      });
    });
    return events;
  }

  function weekStartISO(dateISO) {
    const d = utils.parseISO(dateISO);
    const diff = (d.getDay() + 6) % 7; // dias desde a última segunda-feira
    d.setDate(d.getDate() - diff);
    return utils.dateToISO(d);
  }

  function monthStartISO(dateISO) {
    const [y, m] = dateISO.split('-');
    return `${y}-${m}-01`;
  }

  // Ignora eventos com date: null (data ausente/inválida) — nunca gera um
  // bucket "Invalid Date", só fica de fora da série temporal (mas conta no
  // total, ver computeSummary). Mesma convenção de semana (segunda-feira) e
  // mês (dia 1) usada por admin_user_metrics (migration 0018) — é o que
  // garante os números baterem entre a dashboard pessoal e o admin.
  function aggregateByWeek(events, weeksBack) {
    const n = weeksBack || 12;
    const currentWeekStart = weekStartISO(utils.todayISO());
    const buckets = [];
    for (let i = n - 1; i >= 0; i--) {
      buckets.push({ weekStart: utils.addDaysISO(currentWeekStart, -7 * i), count: 0 });
    }
    const indexByStart = {};
    buckets.forEach((b, idx) => {
      indexByStart[b.weekStart] = idx;
    });
    (events || []).forEach((e) => {
      if (!e.date) return;
      const idx = indexByStart[weekStartISO(e.date)];
      if (idx !== undefined) buckets[idx].count += 1;
    });
    return buckets;
  }

  function aggregateByMonth(events, monthsBack) {
    const n = monthsBack || 12;
    const currentMonthStart = monthStartISO(utils.todayISO());
    const buckets = [];
    for (let i = n - 1; i >= 0; i--) {
      buckets.push({ monthStart: utils.addMonthsISO(currentMonthStart, -i), count: 0 });
    }
    const indexByStart = {};
    buckets.forEach((b, idx) => {
      indexByStart[b.monthStart] = idx;
    });
    (events || []).forEach((e) => {
      if (!e.date) return;
      const idx = indexByStart[monthStartISO(e.date)];
      if (idx !== undefined) buckets[idx].count += 1;
    });
    return buckets;
  }

  // Não depende de data — eventos com date: null ainda contam aqui.
  function aggregateByProject(events, projects, topN) {
    const n = topN || 10;
    const projectById = {};
    (projects || []).forEach((p) => {
      projectById[p.id] = p;
    });
    const countByKey = {};
    (events || []).forEach((e) => {
      const key = e.projectId || '__none__';
      countByKey[key] = (countByKey[key] || 0) + 1;
    });
    const rows = Object.keys(countByKey).map((key) => {
      const project = key === '__none__' ? null : projectById[key];
      return {
        projectId: key === '__none__' ? null : key,
        projectName: project ? project.name : 'Sem projeto',
        projectColor: project ? project.color : NO_PROJECT_COLOR,
        count: countByKey[key]
      };
    });
    rows.sort((a, b) => b.count - a.count);
    return rows.slice(0, n);
  }

  // total conta todos os eventos (inclusive date: null); thisWeek/thisMonth
  // só contam eventos com data válida dentro da janela atual.
  function computeSummary(events) {
    const weekStart = weekStartISO(utils.todayISO());
    const monthStart = monthStartISO(utils.todayISO());
    const countByProject = {};
    let total = 0;
    let thisWeek = 0;
    let thisMonth = 0;
    (events || []).forEach((e) => {
      total += 1;
      if (e.date) {
        if (e.date >= weekStart) thisWeek += 1;
        if (e.date >= monthStart) thisMonth += 1;
        const key = e.projectId || '__none__';
        countByProject[key] = (countByProject[key] || 0) + 1;
      }
    });
    let topProjectId = null;
    let topCount = 0;
    Object.keys(countByProject).forEach((key) => {
      if (countByProject[key] > topCount) {
        topCount = countByProject[key];
        topProjectId = key === '__none__' ? null : key;
      }
    });
    return { total, thisWeek, thisMonth, topProjectId };
  }

  // Handle próprio desta tela (dono das instâncias de Chart) — ver
  // js/statsCharts.js. Só existe UM handle aqui porque só existe uma tela
  // "Minhas estatísticas" ativa por vez nesta página.
  const chartHandle = {};

  // renderStatsView (js/render.js) roda a cada emit() do store, mutação em
  // QUALQUER tela — não só a de estatísticas. js/statsCharts.js já cuida de
  // não recriar os gráficos à toa (assinatura dos dados+tema); aqui só
  // montamos os dados agregados e repassamos.
  function renderCharts(state, options) {
    const events = buildCompletionEvents(state.statsDoneTasks, state.statsCompletions, state.statsTaskProjectMap);
    const weekData = aggregateByWeek(events);
    const monthData = aggregateByMonth(events);
    const projectData = aggregateByProject(events, state.projects);

    const canvases = {
      weekCanvas: document.getElementById('statsWeekChart'),
      monthCanvas: document.getElementById('statsMonthChart'),
      projectCanvas: document.getElementById('statsProjectChart'),
      errorEl: document.getElementById('statsChartsError')
    };

    statsCharts.renderChartsInto(chartHandle, canvases, { weekData, monthData, projectData }, options);
  }

  function resetCharts() {
    statsCharts.resetCharts(chartHandle);
  }

  App.stats = {
    buildCompletionEvents,
    aggregateByWeek,
    aggregateByMonth,
    aggregateByProject,
    computeSummary,
    renderCharts,
    resetCharts
  };
})(window.App = window.App || {});
