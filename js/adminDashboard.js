(function (App) {
  const { auth, api } = App;

  const loadingScreen = document.getElementById('adminLoadingScreen');
  const deniedScreen = document.getElementById('adminAccessDenied');
  const dashboard = document.getElementById('adminDashboard');
  const statsGrid = document.getElementById('adminStatsGrid');
  const usersTbody = document.getElementById('adminUsersTbody');
  const logoutBtn = document.getElementById('adminLogoutBtn');
  const weekdayCanvas = document.getElementById('adminWeekdayChart');

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

  function renderUsers(users) {
    if (!users.length) {
      usersTbody.innerHTML = `<tr><td colspan="6">Nenhum usuário cadastrado ainda.</td></tr>`;
      return;
    }
    usersTbody.innerHTML = users
      .map(
        (u) => `
      <tr>
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
