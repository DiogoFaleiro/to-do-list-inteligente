(function (App) {
  const { auth, api, statsCharts } = App;

  const loadingScreen = document.getElementById('adminLoadingScreen');
  const deniedScreen = document.getElementById('adminAccessDenied');
  const dashboard = document.getElementById('adminDashboard');
  const statsGrid = document.getElementById('adminStatsGrid');
  const usersTbody = document.getElementById('adminUsersTbody');
  const logoutBtn = document.getElementById('adminLogoutBtn');
  const weekdayCanvas = document.getElementById('adminWeekdayChart');
  const userDetailSection = document.getElementById('adminUserDetail');
  const userDetailTitle = document.getElementById('adminUserDetailTitle');
  const userDetailBody = document.getElementById('adminUserDetailBody');
  const userDetailCloseBtn = document.getElementById('adminUserDetailCloseBtn');

  const STAT_LABELS = [
    { key: 'total_users', label: 'Usuários cadastrados' },
    { key: 'total_tasks_done', label: 'Tarefas concluídas' },
    { key: 'total_tasks_active', label: 'Tarefas ativas' },
    { key: 'active_users_7d', label: 'Usuários ativos (7 dias)' },
    { key: 'avg_tasks_per_user', label: 'Média de tarefas/usuário' }
  ];

  // Postgres extract(dow): 0 = domingo ... 6 = sábado. Reordenado para Seg-Dom.
  const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
  const WEEKDAY_LABELS = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb' };

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function formatDateBR(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  function showDenied(message) {
    loadingScreen.hidden = true;
    dashboard.hidden = true;
    deniedScreen.hidden = false;
    if (message) deniedScreen.querySelector('p').textContent = message;
  }

  function renderStats(stats) {
    statsGrid.innerHTML = STAT_LABELS.map(
      ({ key, label }) => `
      <div class="admin-stat-card">
        <div class="admin-stat-value">${escapeHtml(stats[key])}</div>
        <div class="admin-stat-label">${label}</div>
      </div>`
    ).join('');
  }

  function renderWeekdayChart(rows) {
    const byDow = {};
    rows.forEach((r) => {
      byDow[r.dow] = r.total;
    });
    const labels = WEEKDAY_ORDER.map((d) => WEEKDAY_LABELS[d]);
    const data = WEEKDAY_ORDER.map((d) => byDow[d] || 0);

    const styles = getComputedStyle(document.documentElement);
    const primary = styles.getPropertyValue('--primary').trim() || '#6c5ce7';
    const textMuted = styles.getPropertyValue('--text-muted').trim() || '#636e72';
    const border = styles.getPropertyValue('--border').trim() || '#e0e3e8';

    new Chart(weekdayCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Tarefas concluídas',
            data,
            backgroundColor: primary,
            borderRadius: 6,
            maxBarThickness: 42
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: textMuted },
            grid: { color: border }
          },
          x: {
            ticks: { color: textMuted },
            grid: { display: false }
          }
        }
      }
    });
  }

  // Preenchido em boot() — usado pelo click delegado na tabela pra achar o
  // usuário clicado sem precisar buscar de novo (o email/nome já veio junto
  // de admin_user_list).
  let usersById = {};

  function renderUsers(users) {
    usersById = {};
    users.forEach((u) => {
      usersById[u.id] = u;
    });
    if (!users.length) {
      usersTbody.innerHTML = `<tr><td colspan="6">Nenhum usuário cadastrado ainda.</td></tr>`;
      return;
    }
    usersTbody.innerHTML = users
      .map(
        (u) => `
      <tr data-user-id="${u.id}" class="admin-table-row-clickable">
        <td>${escapeHtml(u.email)}</td>
        <td>${formatDateBR(u.created_at)}</td>
        <td>${escapeHtml(u.total_projects)}</td>
        <td>${escapeHtml(u.active_tasks)}</td>
        <td>${escapeHtml(u.done_tasks)}</td>
        <td>${u.is_admin ? '<span class="badge">Admin</span>' : ''}</td>
      </tr>`
      )
      .join('');
  }

  // Handle das instâncias de Chart do drill-down de usuário (ver
  // js/statsCharts.js) — só existe UM painel de detalhe aberto por vez
  // nesta página, então um handle de módulo já basta.
  const userDetailChartHandle = {};
  // Guardado pra o botão "Tentar de novo" reabrir o mesmo usuário sem
  // precisar re-clicar na linha da tabela.
  let currentDetailUser = null;
  // Última resposta da RPC com sucesso — o retry de gráfico (CDN do Chart.js
  // falhou, dados já estavam certos) reusa isso em vez de rebuscar a RPC.
  let lastMetrics = null;

  // admin_user_metrics (migration 0018) já devolve tudo agregado — nunca
  // re-agregamos aqui, só mapeamos os nomes de campo (snake_case da RPC)
  // pro formato genérico que js/statsCharts.js espera. A ordenação por
  // contagem no gráfico "por projeto" é só apresentação (não soma nada de
  // novo) — a RPC não ordena o array que devolve.
  function mapUserMetricsToChartData(metrics) {
    const weekData = (metrics.by_week || []).map((w) => ({ weekStart: w.week_start, count: w.count }));
    const monthData = (metrics.by_month || []).map((m) => ({ monthStart: m.month_start, count: m.count }));
    const projectData = (metrics.by_project || [])
      .map((p) => ({
        projectName: p.project_name || 'Sem projeto',
        count: (p.done || 0) + (p.recurring_completions || 0)
      }))
      .sort((a, b) => b.count - a.count);
    return { weekData, monthData, projectData };
  }

  function renderUserDetail(user, metrics) {
    const total = metrics.total_completions;

    // Usuário sem nenhuma conclusão: estado vazio digno, sem tentar montar
    // gráfico nenhum (um Chart.js com todas as séries em zero ainda seria
    // visualmente "quebrado" — três barras vazias não comunica nada útil).
    if (!total) {
      userDetailBody.innerHTML = `<p class="empty-state">Este usuário ainda não concluiu nenhuma tarefa.</p>`;
      return;
    }

    const karma = statsCharts.computeKarmaLevel(total);
    const { weekData, monthData, projectData } = mapUserMetricsToChartData(metrics);
    // this_week/this_month vêm da própria série já agregada pela RPC: o
    // último bucket de by_week/by_month É a semana/mês atual (mesma
    // convenção de weekStartISO/monthStartISO usada na dashboard pessoal —
    // ver js/stats.js), então ler o último elemento não é reagregar, é só
    // consumir o dado que a RPC já calculou.
    const thisWeek = weekData.length ? weekData[weekData.length - 1].count : 0;
    const thisMonth = monthData.length ? monthData[monthData.length - 1].count : 0;
    const topProject = projectData[0] || null;

    userDetailBody.innerHTML = `
      <div class="admin-stats">
        ${statsCharts.buildSummaryCardsHtml({
          total,
          thisWeek,
          thisMonth,
          topProjectName: topProject ? topProject.projectName : null
        })}
      </div>
      <div id="adminUserKarmaEl">${statsCharts.buildKarmaCardHtml(karma, total)}</div>
      <div id="adminUserChartsError" class="empty-state" hidden>
        <p>Não foi possível carregar os gráficos. Verifique sua conexão.</p>
        <button type="button" class="btn-secondary" data-user-detail-charts-retry>Tentar novamente</button>
      </div>
      <div class="stats-charts-grid">
        <div class="stats-chart-card"><h3>Conclusões por semana</h3><canvas id="adminUserWeekChart"></canvas></div>
        <div class="stats-chart-card"><h3>Conclusões por mês</h3><canvas id="adminUserMonthChart"></canvas></div>
        <div class="stats-chart-card"><h3>Por projeto</h3><canvas id="adminUserProjectChart"></canvas></div>
      </div>`;

    statsCharts.renderChartsInto(
      userDetailChartHandle,
      {
        weekCanvas: document.getElementById('adminUserWeekChart'),
        monthCanvas: document.getElementById('adminUserMonthChart'),
        projectCanvas: document.getElementById('adminUserProjectChart'),
        errorEl: document.getElementById('adminUserChartsError')
      },
      { weekData, monthData, projectData }
    );
  }

  async function openUserDetail(user) {
    currentDetailUser = user;
    userDetailSection.hidden = false;
    userDetailTitle.textContent = `Estatísticas de ${user.email}`;
    // Os <canvas> do usuário anterior (se houver) já saem do DOM no innerHTML
    // abaixo — reseta o handle ANTES pra não deixar as instâncias de Chart
    // órfãs (mesmo cuidado de js/render.js/js/stats.js).
    statsCharts.resetCharts(userDetailChartHandle);
    userDetailBody.innerHTML = `<p class="empty-state">Carregando estatísticas...</p>`;
    userDetailSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    try {
      const metrics = await api.fetchAdminUserMetrics(user.id);
      lastMetrics = metrics;
      renderUserDetail(user, metrics);
    } catch (err) {
      console.error('Falha ao carregar métricas do usuário', err);
      userDetailBody.innerHTML = `
        <div class="empty-state">
          <p>Não foi possível carregar as estatísticas deste usuário.</p>
          <button type="button" class="btn-secondary" data-user-detail-retry>Tentar de novo</button>
        </div>`;
    }
  }

  usersTbody.addEventListener('click', (e) => {
    const row = e.target.closest('[data-user-id]');
    if (!row) return;
    const user = usersById[row.dataset.userId];
    if (user) openUserDetail(user);
  });

  userDetailCloseBtn.addEventListener('click', () => {
    userDetailSection.hidden = true;
    statsCharts.resetCharts(userDetailChartHandle);
    currentDetailUser = null;
  });

  // Dois retries distintos, mesmo espírito do app principal (js/app.js):
  // [data-user-detail-retry] refaz o fetch da RPC; [data-user-detail-charts-retry]
  // só reaparece se os dados já carregaram e foi só o CDN do Chart.js que
  // falhou — não precisa rebuscar a RPC, só tentar a biblioteca de novo.
  userDetailBody.addEventListener('click', (e) => {
    if (e.target.closest('[data-user-detail-retry]')) {
      if (currentDetailUser) openUserDetail(currentDetailUser);
      return;
    }
    if (e.target.closest('[data-user-detail-charts-retry]') && lastMetrics) {
      const { weekData, monthData, projectData } = mapUserMetricsToChartData(lastMetrics);
      statsCharts.renderChartsInto(
        userDetailChartHandle,
        {
          weekCanvas: document.getElementById('adminUserWeekChart'),
          monthCanvas: document.getElementById('adminUserMonthChart'),
          projectCanvas: document.getElementById('adminUserProjectChart'),
          errorEl: document.getElementById('adminUserChartsError')
        },
        { weekData, monthData, projectData },
        { force: true }
      );
    }
  });

  async function boot() {
    const {
      data: { session }
    } = await auth.getSession();

    if (!session || !session.user) {
      window.location.href = '../index.html';
      return;
    }

    let profile;
    try {
      profile = await auth.getCurrentProfile(session.user.id);
    } catch (err) {
      console.error('Falha ao carregar perfil do usuário', err);
      window.location.href = '../index.html';
      return;
    }

    if (!profile.is_admin) {
      showDenied();
      return;
    }

    try {
      const [stats, weekday, users] = await Promise.all([
        api.fetchAdminStats(),
        api.fetchAdminTasksByWeekday(),
        api.fetchAdminUserList()
      ]);
      renderStats(stats);
      renderWeekdayChart(weekday);
      renderUsers(users);
      loadingScreen.hidden = true;
      dashboard.hidden = false;
    } catch (err) {
      console.error('Falha ao carregar métricas do admin', err);
      showDenied('Não foi possível carregar as métricas. Tente novamente mais tarde.');
    }
  }

  logoutBtn.addEventListener('click', async () => {
    await auth.signOut();
    window.location.href = '../index.html';
  });

  boot();
})(window.App = window.App || {});
