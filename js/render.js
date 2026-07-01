(function (App) {
  const { store, utils } = App;

  const els = {
    projectList: document.getElementById('projectList'),
    periodTabs: document.getElementById('periodTabs'),
    viewToggle: document.getElementById('viewToggle'),
    listView: document.getElementById('listView'),
    kanbanView: document.getElementById('kanbanView'),
    taskProjectSelect: document.getElementById('taskProject'),
    accountThemeIcon: document.getElementById('accountThemeIcon'),
    mobileViewTitle: document.getElementById('mobileViewTitle'),
    mobileTaskCount: document.getElementById('mobileTaskCount'),
    mobileKanbanToggleBtn: document.getElementById('mobileKanbanToggleBtn'),
    mobileNavToday: document.querySelector('.mobile-nav-btn[data-mobile-tab="today"]'),
    mobileNavUpcoming: document.querySelector('.mobile-nav-btn[data-mobile-tab="upcoming"]')
  };

  const PERIOD_TITLES = { today: 'Hoje', week: 'Em breve', month: 'Mês', all: 'Todas as tarefas' };

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
      const aDone = a.status === 'done';
      const bDone = b.status === 'done';
      if (aDone !== bDone) return aDone ? 1 : -1;
      if (a.recurring !== b.recurring) return a.recurring ? -1 : 1;
      const aKey = a.dueDate || '9999-99-99';
      const bKey = b.dueDate || '9999-99-99';
      if (aKey !== bKey) return aKey > bKey ? 1 : -1;
      return a.createdAt - b.createdAt;
    });
  }

  function projectById(id) {
    return store.getState().projects.find((p) => p.id === id);
  }

  function renderSidebar() {
    const state = store.getState();
    const openCounts = {};
    state.tasks.forEach((t) => {
      if (t.status !== 'done') openCounts[t.projectId] = (openCounts[t.projectId] || 0) + 1;
    });
    const totalOpen = state.tasks.filter((t) => t.status !== 'done').length;

    const allBtn = `
      <button class="project-item ${state.ui.projectFilter === 'all' ? 'active' : ''}" data-project="all">
        <span class="dot" style="background:#636e72"></span>
        <span class="project-name">Todas as tarefas</span>
        <span class="badge">${totalOpen}</span>
      </button>`;

    const items = state.projects
      .map(
        (p) => `
      <button class="project-item ${state.ui.projectFilter === p.id ? 'active' : ''}" data-project="${p.id}">
        <span class="dot" style="background:${p.color}"></span>
        <span class="project-name">${escapeHtml(p.name)}</span>
        <span class="badge">${openCounts[p.id] || 0}</span>
        <span class="edit-project" data-edit-project="${p.id}" title="Editar projeto">✏️</span>
      </button>`
      )
      .join('');

    els.projectList.innerHTML = allBtn + items;
  }

  function taskMetaHtml(task) {
    const project = projectById(task.projectId);
    const today = utils.todayISO();
    const parts = [];
    if (project) {
      parts.push(
        `<span class="tag" style="background:${project.color}22;color:${project.color}">${escapeHtml(project.name)}</span>`
      );
    }
    if (task.recurring) parts.push('<span class="tag tag-recurring">🔁 Diária</span>');
    if (task.dueDate) {
      const overdue = utils.isOverdue(task.dueDate, today) && task.status !== 'done';
      parts.push(`<span class="tag ${overdue ? 'tag-overdue' : ''}">📅 ${utils.formatDateBR(task.dueDate)}</span>`);
    }
    return parts.join('');
  }

  function renderList() {
    const tasks = sortTasks(store.getFilteredTasks());
    if (tasks.length === 0) {
      els.listView.innerHTML = `<p class="empty-state">Nenhuma tarefa por aqui. Que tal adicionar uma? 🎉</p>`;
      return;
    }
    els.listView.innerHTML = tasks
      .map(
        (task) => `
      <div class="task-row ${task.status === 'done' ? 'done' : ''}" data-task-id="${task.id}">
        <input type="checkbox" class="task-check" data-toggle="${task.id}" ${task.status === 'done' ? 'checked' : ''}>
        <div class="task-info">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-meta">${taskMetaHtml(task)}</div>
        </div>
        <div class="task-actions">
          <button data-edit-task="${task.id}" title="Editar">✏️</button>
          <button data-delete-task="${task.id}" title="Excluir">🗑️</button>
        </div>
      </div>`
      )
      .join('');
  }

  const KANBAN_ORDER = ['todo', 'doing', 'done'];
  const KANBAN_LABELS = { todo: 'A Fazer', doing: 'Fazendo', done: 'Concluído' };

  function kanbanMoveButtonsHtml(task) {
    const index = KANBAN_ORDER.indexOf(task.status);
    const prevStatus = KANBAN_ORDER[index - 1];
    const nextStatus = KANBAN_ORDER[index + 1];
    return `
      <div class="kanban-move">
        <button type="button" class="kanban-move-btn" data-move-task="${task.id}" data-move-status="${prevStatus || ''}" ${prevStatus ? '' : 'disabled'} title="${prevStatus ? `Mover para ${KANBAN_LABELS[prevStatus]}` : ''}">←</button>
        <button type="button" class="kanban-move-btn" data-move-task="${task.id}" data-move-status="${nextStatus || ''}" ${nextStatus ? '' : 'disabled'} title="${nextStatus ? `Mover para ${KANBAN_LABELS[nextStatus]}` : ''}">→</button>
      </div>`;
  }

  function renderKanban() {
    const tasks = sortTasks(store.getFilteredTasks());
    const columns = { todo: [], doing: [], done: [] };
    tasks.forEach((t) => {
      if (columns[t.status]) columns[t.status].push(t);
    });

    Object.keys(columns).forEach((status) => {
      const col = els.kanbanView.querySelector(`[data-column="${status}"]`);
      const countEl = els.kanbanView.querySelector(`[data-count="${status}"]`);
      countEl.textContent = columns[status].length;
      col.innerHTML =
        columns[status]
          .map(
            (task) => `
        <div class="kanban-card" draggable="true" data-task-id="${task.id}">
          <div class="kanban-card-header">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <button type="button" class="kanban-delete" data-delete-task="${task.id}" title="Excluir">🗑️</button>
          </div>
          <div class="task-meta">${taskMetaHtml(task)}</div>
          ${kanbanMoveButtonsHtml(task)}
        </div>`
          )
          .join('') || `<p class="empty-column">Vazio</p>`;
    });
  }

  function renderTaskProjectOptions(selectedId) {
    const state = store.getState();
    els.taskProjectSelect.innerHTML =
      `<option value="">Sem projeto</option>` +
      state.projects
        .map((p) => `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`)
        .join('');
  }

  function renderToolbarState() {
    const state = store.getState();
    els.periodTabs.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.period === state.ui.period));
    els.viewToggle.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.view === state.ui.view));
    els.listView.hidden = state.ui.view !== 'list';
    els.kanbanView.hidden = state.ui.view !== 'kanban';

    // Cabeçalho e rodapé de navegação mobile
    if (els.mobileViewTitle) {
      const project = state.ui.projectFilter !== 'all' ? projectById(state.ui.projectFilter) : null;
      els.mobileViewTitle.textContent = project ? project.name : PERIOD_TITLES[state.ui.period] || 'Tarefas';
    }
    if (els.mobileTaskCount) {
      const openCount = store.getFilteredTasks().filter((t) => t.status !== 'done').length;
      els.mobileTaskCount.textContent = `${openCount} tarefa${openCount === 1 ? '' : 's'}`;
    }
    if (els.mobileKanbanToggleBtn) {
      els.mobileKanbanToggleBtn.textContent = state.ui.view === 'kanban' ? '☰' : '▤';
    }
    if (els.mobileNavToday) {
      els.mobileNavToday.classList.toggle('active', state.ui.period === 'today' && state.ui.projectFilter === 'all');
    }
    if (els.mobileNavUpcoming) {
      els.mobileNavUpcoming.classList.toggle('active', state.ui.period === 'week' && state.ui.projectFilter === 'all');
    }
  }

  function resolveEffectiveTheme(pref) {
    if (pref !== 'system') return pref;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme() {
    const pref = store.getState().ui.theme;
    const effective = resolveEffectiveTheme(pref);
    document.documentElement.setAttribute('data-theme', effective);
    if (els.accountThemeIcon) {
      els.accountThemeIcon.textContent = effective === 'dark' ? '☀️' : '🌙';
    }
  }

  function renderAll() {
    renderSidebar();
    renderToolbarState();
    applyTheme();
    const state = store.getState();
    if (state.ui.view === 'list') {
      renderList();
    } else {
      renderKanban();
    }
  }

  App.render = {
    renderAll,
    renderTaskProjectOptions,
    projectById,
    applyTheme
  };
})(window.App = window.App || {});
