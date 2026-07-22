// Módulo compartilhado entre index.html (dashboard pessoal, via js/stats.js)
// e admin/index.html (drill-down de usuário, via js/adminDashboard.js).
// Sem dependência de App.store nem de qualquer estado de sessão — só funções
// puras (karma, HTML dos cards) e um wrapper de Chart.js que recebe os dados
// já agregados e os elementos de DOM prontos. Cada chamador é dono do seu
// próprio "handle" (objeto simples que guarda as instâncias de Chart e a
// última assinatura renderizada) — nunca há estado de módulo compartilhado
// entre os dois usos, mesmo estando no mesmo arquivo.
(function (App) {
  // Níveis de karma por total de conclusões (tarefa done + cada linha de
  // task_completions). Ordem crescente; o nível exibido é o maior cujo
  // "min" o total já alcançou. Ajustar aqui não exige mudar mais nada.
  const KARMA_LEVELS = [
    { key: 'iniciante', label: 'Iniciante', min: 0, emoji: '🌱' },
    { key: 'bronze', label: 'Bronze', min: 50, emoji: '🥉' },
    { key: 'prata', label: 'Prata', min: 200, emoji: '🥈' },
    { key: 'ouro', label: 'Ouro', min: 500, emoji: '🥇' },
    { key: 'platina', label: 'Platina', min: 1000, emoji: '💠' },
    { key: 'diamante', label: 'Diamante', min: 2500, emoji: '💎' },
    { key: 'lenda', label: 'Lenda', min: 5000, emoji: '🏆' }
  ];

  const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  // Paleta de fallback pro gráfico "por projeto" quando o chamador não tem a
  // cor real do projeto à mão (ex.: admin_user_metrics não devolve project
  // color — só project_id/project_name). Cores fixas, só pra distinguir
  // barras visualmente; nunca a cor real escolhida pelo usuário.
  const PROJECT_PALETTE = ['#6c5ce7', '#00b894', '#e17055', '#0984e3', '#fdcb6e', '#e84393', '#00cec9', '#636e72'];
  const NO_PROJECT_COLOR = '#8395a7';

  // Cópia local de escapeHtml — cada módulo tem a sua (ver CLAUDE.md).
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  // No nível máximo (Lenda), next é null e progressPct é 100 — quem renderiza
  // deve checar next === null explicitamente e nunca ler next.min/next.label
  // sem essa checagem.
  function computeKarmaLevel(total) {
    let level = KARMA_LEVELS[0];
    for (let i = 0; i < KARMA_LEVELS.length; i++) {
      if (total >= KARMA_LEVELS[i].min) level = KARMA_LEVELS[i];
    }
    const idx = KARMA_LEVELS.indexOf(level);
    const next = idx + 1 < KARMA_LEVELS.length ? KARMA_LEVELS[idx + 1] : null;
    const progressPct = next
      ? Math.max(0, Math.min(100, Math.round(((total - level.min) / (next.min - level.min)) * 100)))
      : 100;
    return { level, next, progressPct };
  }

  // 4 cards (.admin-stat-card) — o chamador envolve num container próprio
  // (.admin-stats já existe em css/style.css e é usado por index.html e
  // admin/index.html). topProjectName já vem resolvido pelo chamador (esse
  // módulo não sabe nada sobre onde os projetos de cada app estão guardados).
  function buildSummaryCardsHtml({ total, thisWeek, thisMonth, topProjectName }) {
    return `
      <div class="admin-stat-card">
        <div class="admin-stat-value">${total}</div>
        <div class="admin-stat-label">Total de conclusões</div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-value">${thisWeek}</div>
        <div class="admin-stat-label">Esta semana</div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-value">${thisMonth}</div>
        <div class="admin-stat-label">Este mês</div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-value">${topProjectName ? escapeHtml(topProjectName) : '—'}</div>
        <div class="admin-stat-label">Projeto mais produtivo</div>
      </div>`;
  }

  // karma = resultado de computeKarmaLevel(total). Mesma checagem de
  // next === null (nível máximo) que qualquer chamador precisaria fazer —
  // fica centralizada aqui pra não duplicar o "Nível máximo"/100% em cada tela.
  function buildKarmaCardHtml(karma, total) {
    if (karma.next === null) {
      return `
      <div class="stats-karma-card">
        <span class="stats-karma-emoji" aria-hidden="true">${karma.level.emoji}</span>
        <div class="stats-karma-info">
          <div class="stats-karma-level">${escapeHtml(karma.level.label)} · Nível máximo</div>
          <div class="stats-karma-total">${total} conclusões</div>
          <div class="stats-karma-progress"><div class="stats-karma-progress-fill" style="width:100%"></div></div>
        </div>
      </div>`;
    }
    return `
      <div class="stats-karma-card">
        <span class="stats-karma-emoji" aria-hidden="true">${karma.level.emoji}</span>
        <div class="stats-karma-info">
          <div class="stats-karma-level">${escapeHtml(karma.level.label)}</div>
          <div class="stats-karma-total">${total} conclusões · faltam ${karma.next.min - total} para ${escapeHtml(karma.next.label)}</div>
          <div class="stats-karma-progress"><div class="stats-karma-progress-fill" style="width:${karma.progressPct}%"></div></div>
        </div>
      </div>`;
  }

  // Soma dias a uma data ISO (YYYY-MM-DD) sem depender de App.utils — este
  // módulo é carregado também por admin/index.html, que não inclui
  // js/utils.js (ver header do arquivo: "sem dependência de App.store" —
  // o mesmo vale aqui, propositalmente, pra não exigir mais scripts na
  // página do admin).
  function addDaysToISO(dateISO, days) {
    const [y, m, d] = dateISO.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  // Mostra o intervalo inteiro da semana (início-fim), não só o dia de
  // início — só "20/07" na última barra gerava a leitura errada de que a
  // contagem "parava" naquele dia, quando na verdade a semana vai até 6
  // dias depois e já soma tudo até hoje.
  function formatWeekLabel(weekStart) {
    const weekEnd = addDaysToISO(weekStart, 6);
    const [, sm, sd] = weekStart.split('-');
    const [, em, ed] = weekEnd.split('-');
    return sm === em ? `${sd}-${ed}/${sm}` : `${sd}/${sm}-${ed}/${em}`;
  }

  function formatMonthLabel(monthStart) {
    const [y, m] = monthStart.split('-');
    return `${MONTH_LABELS[Number(m) - 1]}/${y.slice(2)}`;
  }

  function currentThemeName() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  const CHARTJS_SRC = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
  let chartJsPromise = null;

  // Mesmo padrão de loadSheetJs (js/importCampaigns.js): Promise cacheada
  // pra nunca injetar o <script> duas vezes; reset em erro (CDN
  // offline/bloqueado) pra permitir nova tentativa sem precisar de F5.
  // Se window.Chart já existir (ex.: admin/index.html carrega Chart.js
  // estaticamente pro gráfico "por dia da semana"), resolve na hora sem
  // tocar no DOM — nunca injeta um segundo <script>.
  function loadChartJs() {
    if (window.Chart) return Promise.resolve(window.Chart);
    if (chartJsPromise) return chartJsPromise;
    chartJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHARTJS_SRC;
      script.onload = () => {
        if (window.Chart) resolve(window.Chart);
        else reject(new Error('Biblioteca de gráficos carregou mas não expôs window.Chart'));
      };
      script.onerror = () => {
        chartJsPromise = null;
        reject(new Error('Falha ao carregar a biblioteca de gráficos (CDN indisponível)'));
      };
      document.head.appendChild(script);
    });
    return chartJsPromise;
  }

  function baseChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false } }
    };
  }

  function destroyHandleCharts(handle) {
    if (handle.weekChart) {
      handle.weekChart.destroy();
      handle.weekChart = null;
    }
    if (handle.monthChart) {
      handle.monthChart.destroy();
      handle.monthChart = null;
    }
    if (handle.projectChart) {
      handle.projectChart.destroy();
      handle.projectChart = null;
    }
  }

  // Chamado pelo dono do handle sempre que os <canvas> forem recriados do
  // zero no DOM (ex.: saiu de um estado de erro/vazio e voltou a mostrar
  // gráficos, ou trocou de usuário no admin) — os <canvas> antigos já não
  // estão mais no DOM nesse ponto, e sem isso as instâncias de Chart
  // guardadas no handle ficariam órfãs (vazando) e a checagem de assinatura
  // abaixo poderia achar que nada mudou e pular a criação nos <canvas> novos.
  function resetCharts(handle) {
    destroyHandleCharts(handle);
    handle.lastSignature = null;
  }

  // handle: objeto simples { weekChart, monthChart, projectChart,
  //   lastSignature } — o chamador declara `const handle = {};` uma vez (por
  //   tela/painel) e passa a mesma referência em toda chamada; este módulo só
  //   lê/escreve os campos acima nele, nunca guarda nada em variável própria.
  // canvases: { weekCanvas, monthCanvas, projectCanvas, errorEl } — elementos
  //   de DOM já resolvidos pelo chamador (ids diferentes em cada tela).
  // data: { weekData: [{weekStart, count}], monthData: [{monthStart, count}],
  //   projectData: [{projectName, count, projectColor?}] } — já agregado
  //   pelo chamador (ou por uma RPC, no caso do admin); este módulo nunca
  //   agrega, só desenha.
  function renderChartsInto(handle, canvases, data, options) {
    const force = !!(options && options.force);
    const { weekCanvas, monthCanvas, projectCanvas, errorEl } = canvases;
    const { weekData, monthData, projectData } = data;
    if (!weekCanvas || !monthCanvas || !projectCanvas) return;

    const theme = currentThemeName();
    const signature = JSON.stringify({ weekData, monthData, projectData, theme });

    if (!force && signature === handle.lastSignature && handle.weekChart && handle.monthChart && handle.projectChart) {
      return;
    }

    loadChartJs()
      .then((Chart) => {
        const styles = getComputedStyle(document.documentElement);
        const primary = styles.getPropertyValue('--primary').trim() || '#6c5ce7';
        const textMuted = styles.getPropertyValue('--text-muted').trim() || '#636e72';
        const border = styles.getPropertyValue('--border').trim() || '#e0e3e8';

        destroyHandleCharts(handle);

        handle.weekChart = new Chart(weekCanvas, {
          type: 'bar',
          data: {
            labels: weekData.map((w) => formatWeekLabel(w.weekStart)),
            datasets: [
              { label: 'Conclusões', data: weekData.map((w) => w.count), backgroundColor: primary, borderRadius: 6, maxBarThickness: 32 }
            ]
          },
          options: {
            ...baseChartOptions(),
            scales: {
              y: { beginAtZero: true, ticks: { precision: 0, color: textMuted }, grid: { color: border } },
              x: { ticks: { color: textMuted }, grid: { display: false } }
            }
          }
        });

        handle.monthChart = new Chart(monthCanvas, {
          type: 'bar',
          data: {
            labels: monthData.map((m) => formatMonthLabel(m.monthStart)),
            datasets: [
              { label: 'Conclusões', data: monthData.map((m) => m.count), backgroundColor: primary, borderRadius: 6, maxBarThickness: 32 }
            ]
          },
          options: {
            ...baseChartOptions(),
            scales: {
              y: { beginAtZero: true, ticks: { precision: 0, color: textMuted }, grid: { color: border } },
              x: { ticks: { color: textMuted }, grid: { display: false } }
            }
          }
        });

        handle.projectChart = new Chart(projectCanvas, {
          type: 'bar',
          data: {
            labels: projectData.map((p) => p.projectName),
            datasets: [
              {
                label: 'Conclusões',
                data: projectData.map((p) => p.count),
                backgroundColor: projectData.map((p, i) => p.projectColor || PROJECT_PALETTE[i % PROJECT_PALETTE.length]),
                borderRadius: 6
              }
            ]
          },
          options: {
            ...baseChartOptions(),
            indexAxis: 'y',
            scales: {
              x: { beginAtZero: true, ticks: { precision: 0, color: textMuted }, grid: { color: border } },
              y: { ticks: { color: textMuted }, grid: { display: false } }
            }
          }
        });

        handle.lastSignature = signature;
        if (errorEl) errorEl.hidden = true;
      })
      .catch((err) => {
        console.error('Falha ao carregar gráficos de estatísticas', err);
        if (errorEl) errorEl.hidden = false;
      });
  }

  App.statsCharts = {
    KARMA_LEVELS,
    NO_PROJECT_COLOR,
    computeKarmaLevel,
    buildSummaryCardsHtml,
    buildKarmaCardHtml,
    loadChartJs,
    renderChartsInto,
    resetCharts
  };
})(window.App = window.App || {});
