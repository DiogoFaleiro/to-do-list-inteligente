(function (App) {
  const { store, utils } = App;

  const els = {
    projectList: document.getElementById('projectList'),
    tagList: document.getElementById('tagList'),
    favoritesSection: document.getElementById('favoritesSection'),
    favoritesList: document.getElementById('favoritesList'),
    periodTabs: document.getElementById('periodTabs'),
    viewToggle: document.getElementById('viewToggle'),
    listView: document.getElementById('listView'),
    boardView: document.getElementById('boardView'),
    boardDots: document.getElementById('boardDots'),
    taskProjectSelect: document.getElementById('taskProject'),
    taskSessionRow: document.getElementById('taskSessionRow'),
    taskSessionSelect: document.getElementById('taskSession'),
    accountThemeIcon: document.getElementById('accountThemeIcon'),
    mobileViewTitle: document.getElementById('mobileViewTitle'),
    mobileTaskCount: document.getElementById('mobileTaskCount'),
    mobileBoardToggleBtn: document.getElementById('mobileBoardToggleBtn'),
    mobileNavToday: document.querySelector('.mobile-nav-btn[data-mobile-tab="today"]'),
    mobileNavUpcoming: document.querySelector('.mobile-nav-btn[data-mobile-tab="upcoming"]'),
    showCompletedToggleBtn: document.getElementById('showCompletedToggleBtn'),
    groupByProjectToggleBtn: document.getElementById('groupByProjectToggleBtn'),
    showCompletedMenuBtn: document.getElementById('showCompletedMenuBtn'),
    groupByProjectMenuBtn: document.getElementById('groupByProjectMenuBtn')
  };

  const PERIOD_TITLES = { today: 'Hoje', week: 'Em breve', month: 'Mês', all: 'Todas as tarefas' };

  // Quais tarefas estão com o checklist de subtarefas expandido na Lista/
  // Painel. Estado puramente visual, não persiste entre recarregamentos.
  const expandedTaskIds = new Set();

  function toggleTaskExpanded(taskId) {
    if (expandedTaskIds.has(taskId)) {
      expandedTaskIds.delete(taskId);
    } else {
      expandedTaskIds.add(taskId);
    }
    renderAll();
  }

  // Menu "⋯" (Editar/Data/Excluir) de uma tarefa por vez, na Lista ou no
  // Painel. Estado puramente visual, igual ao expandedTaskIds acima.
  let openMenuTaskId = null;

  function toggleTaskMenu(taskId) {
    openMenuTaskId = openMenuTaskId === taskId ? null : taskId;
    renderAll();
  }

  function closeTaskMenu() {
    if (openMenuTaskId === null) return;
    openMenuTaskId = null;
    renderAll();
  }

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

  // Item de projeto na sidebar. `compact` omite a estrela de favorito e o
  // lápis de editar (usado na seção Favoritos, que é só um atalho).
  function projectItemHtml(p, openCounts, { compact = false } = {}) {
    const state = store.getState();
    const active = !state.ui.tagFilter && state.ui.projectFilter === p.id;
    const extras = compact
      ? ''
      : `
      <span class="fav-toggle ${p.isFavorite ? 'is-favorite' : ''}" data-fav-project="${p.id}" title="${p.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}">${p.isFavorite ? '⭐' : '☆'}</span>
      <span class="edit-project" data-edit-project="${p.id}" title="Editar projeto">✏️</span>`;
    return `
      <button class="project-item ${active ? 'active' : ''}" data-project="${p.id}">
        <span class="dot" style="background:${p.color}"></span>
        <span class="project-name">${escapeHtml(p.name)}</span>
        <span class="badge">${openCounts[p.id] || 0}</span>
        ${extras}
      </button>`;
  }

  // Item de etiqueta na sidebar — mesmo visual do item de projeto.
  function tagItemHtml(tag, tagCounts, { compact = false } = {}) {
    const state = store.getState();
    const active = state.ui.tagFilter === tag.id;
    const extras = compact
      ? ''
      : `
      <span class="fav-toggle ${tag.isFavorite ? 'is-favorite' : ''}" data-fav-tag="${tag.id}" title="${tag.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}">${tag.isFavorite ? '⭐' : '☆'}</span>
      <span class="edit-project" data-edit-tag="${tag.id}" title="Editar etiqueta">✏️</span>`;
    return `
      <button class="project-item ${active ? 'active' : ''}" data-tag="${tag.id}">
        <span class="dot" style="background:${tag.color}"></span>
        <span class="project-name">${escapeHtml(tag.name)}</span>
        <span class="badge">${tagCounts[tag.id] || 0}</span>
        ${extras}
      </button>`;
  }

  function renderSidebar() {
    const state = store.getState();
    const openCounts = {};
    const tagCounts = {};
    state.tasks.forEach((t) => {
      if (t.parentTaskId || t.status === 'done') return; // subtarefas e concluídas não contam
      openCounts[t.projectId] = (openCounts[t.projectId] || 0) + 1;
      (state.taskTags[t.id] || []).forEach((tagId) => {
        tagCounts[tagId] = (tagCounts[tagId] || 0) + 1;
      });
    });
    const totalOpen = state.tasks.filter((t) => !t.parentTaskId && t.status !== 'done').length;

    const allBtn = `
      <button class="project-item ${state.ui.projectFilter === 'all' && !state.ui.tagFilter ? 'active' : ''}" data-project="all">
        <span class="dot" style="background:#636e72"></span>
        <span class="project-name">Todas as tarefas</span>
        <span class="badge">${totalOpen}</span>
      </button>`;

    els.projectList.innerHTML = allBtn + state.projects.map((p) => projectItemHtml(p, openCounts)).join('');
    els.tagList.innerHTML = state.tags.map((tag) => tagItemHtml(tag, tagCounts)).join('');

    const favProjects = state.projects.filter((p) => p.isFavorite);
    const favTags = state.tags.filter((t) => t.isFavorite);
    els.favoritesSection.hidden = favProjects.length === 0 && favTags.length === 0;
    els.favoritesList.innerHTML =
      favProjects.map((p) => projectItemHtml(p, openCounts, { compact: true })).join('') +
      favTags.map((tag) => tagItemHtml(tag, tagCounts, { compact: true })).join('');
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
    if (task.recurring) {
      parts.push('<span class="tag tag-recurring">🔁 Diária</span>');
      if (task.status !== 'done') {
        // "Congelado" no primeiro dia que ficou sem fazer: completedDate
        // guarda a última conclusão de verdade (não é mais zerado ao
        // reabrir/desmarcar, ver store.js); sem nunca ter concluído, usa a
        // data de criação como base. Só mostra depois que esse primeiro
        // dia perdido já passou — no próprio dia ainda não é "atraso".
        const baseDate = task.completedDate || utils.dateToISO(new Date(task.createdAt));
        const firstMissedDate = utils.addDaysISO(baseDate, 1);
        if (firstMissedDate < today) {
          parts.push(`<span class="tag tag-overdue">📅 ${utils.formatDateBR(firstMissedDate)}</span>`);
        }
      }
    }
    if (task.dueDate) {
      const overdue = utils.isOverdue(task.dueDate, today) && task.status !== 'done';
      parts.push(`<span class="tag ${overdue ? 'tag-overdue' : ''}">📅 ${utils.formatDateBR(task.dueDate)}</span>`);
    }
    if (task.sessionId) {
      const session = store.getState().sessions.find((s) => s.id === task.sessionId);
      if (session) parts.push(`<span class="tag">🗂️ ${escapeHtml(session.name)}</span>`);
    }
    store.getTaskTags(task.id).forEach((tag) => {
      parts.push(`<span class="tag" style="background:${tag.color}22;color:${tag.color}">@${escapeHtml(tag.name)}</span>`);
    });
    return parts.join('');
  }

  // Setinha de expandir/recolher (só existe quando a tarefa tem subtarefas)
  function subtaskToggleHtml(task, subtasks) {
    if (!subtasks.length) return '';
    const isExpanded = expandedTaskIds.has(task.id);
    return `<button type="button" class="subtask-toggle-btn" data-toggle-subtasks="${task.id}" title="${isExpanded ? 'Recolher' : 'Expandir'} subtarefas">${isExpanded ? '▾' : '▸'}</button>`;
  }

  // Tag "☑ 2/5" com o progresso das subtarefas (só existe quando há alguma)
  function subtaskProgressTagHtml(subtasks) {
    if (!subtasks.length) return '';
    const done = subtasks.filter((s) => s.status === 'done').length;
    return `<span class="tag subtask-progress-tag">☑ ${done}/${subtasks.length}</span>`;
  }

  // Menu "⋯" com Editar/Data/Excluir. Substitui os antigos botões soltos de
  // editar/excluir, reaproveitado tanto na Lista quanto no Painel.
  function taskMenuHtml(task) {
    const isOpen = openMenuTaskId === task.id;
    const dateRow = task.recurring
      ? ''
      : `
      <label class="task-menu-date-row">
        📅 Data
        <input type="date" data-menu-date="${task.id}" value="${task.dueDate || ''}">
      </label>`;
    return `
      <div class="task-menu-wrap">
        <button type="button" class="task-menu-btn" data-menu-toggle="${task.id}" title="Mais ações">⋯</button>
        <div class="task-menu" data-menu-for="${task.id}" ${isOpen ? '' : 'hidden'}>
          <button type="button" data-menu-edit="${task.id}">✏️ Editar</button>
          ${dateRow}
          <button type="button" class="danger" data-menu-delete="${task.id}">🗑️ Excluir</button>
        </div>
      </div>`;
  }

  // Painel expansível com o checklist de subtarefas + miniformulário de
  // adicionar. Reaproveitado tanto na Lista quanto no Painel (Kanban).
  function subtaskPanelHtml(task, subtasks) {
    if (!subtasks.length || !expandedTaskIds.has(task.id)) return '';
    return `
      <div class="subtask-panel">
        ${subtasks
          .map(
            (s) => `
          <div class="subtask-row ${s.status === 'done' ? 'done' : ''}" data-task-id="${s.id}">
            <input type="checkbox" class="task-check" data-toggle="${s.id}" ${s.status === 'done' ? 'checked' : ''}>
            <span class="subtask-title">${escapeHtml(s.title)}</span>
            <button type="button" class="subtask-delete" data-delete-task="${s.id}" title="Excluir">🗑️</button>
          </div>`
          )
          .join('')}
        <form class="subtask-add-form" data-add-subtask="${task.id}">
          <input type="text" placeholder="Adicionar subtarefa" maxlength="120">
          <button type="submit" class="btn-link">+ Adicionar</button>
        </form>
      </div>`;
  }

  function taskRowHtml(task) {
    const subtasks = store.getSubtasks(task.id);
    return `
      <div class="task-row-wrap" data-task-wrap="${task.id}">
        <div class="task-row ${task.status === 'done' ? 'done' : ''}" data-task-id="${task.id}">
          ${subtaskToggleHtml(task, subtasks)}
          <input type="checkbox" class="task-check" data-toggle="${task.id}" ${task.status === 'done' ? 'checked' : ''}>
          <div class="task-info">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-meta">${taskMetaHtml(task)}${subtaskProgressTagHtml(subtasks)}</div>
          </div>
          ${taskMenuHtml(task)}
        </div>
        ${subtaskPanelHtml(task, subtasks)}
      </div>`;
  }

  function visibleTasks() {
    const state = store.getState();
    const tasks = store.getFilteredTasks();
    return state.ui.showCompleted ? tasks : tasks.filter((t) => t.status !== 'done');
  }

  // Agrupa tarefas por projeto (usado tanto pela Lista quando "Agrupar por
  // projeto" está ligado, quanto sempre pelo Painel). Inclui um grupo
  // "Sem projeto" mesmo vazio, para o Painel mostrar a coluna.
  function groupTasksByProject(tasks) {
    const state = store.getState();
    const groups = state.projects.map((p) => ({ id: p.id, name: p.name, color: p.color, tasks: [] }));
    const groupById = {};
    groups.forEach((g) => {
      groupById[g.id] = g;
    });
    const none = { id: null, name: 'Sem projeto', color: '#636e72', tasks: [] };

    tasks.forEach((t) => {
      const group = t.projectId && groupById[t.projectId] ? groupById[t.projectId] : none;
      group.tasks.push(t);
    });

    return groups.concat(none);
  }

  // Sub-agrupa as tarefas de UM projeto por sessão (usado dentro do bloco/
  // coluna daquele projeto na Lista e no Painel). Se o projeto não tem
  // nenhuma sessão cadastrada, retorna null — sinal pra renderizar a lista
  // de tarefas "achatada", exatamente como projetos sem sessão sempre
  // mostraram (não muda nada pra quem não usa a funcionalidade).
  function groupTasksBySession(tasks, projectId) {
    const sessions = store.getSessionsForProject(projectId);
    if (!sessions.length) return null;

    const groups = sessions.map((s) => ({ id: s.id, name: s.name, tasks: [] }));
    const groupById = {};
    groups.forEach((g) => {
      groupById[g.id] = g;
    });
    const none = { id: null, name: 'Sem sessão', tasks: [] };

    tasks.forEach((t) => {
      const group = t.sessionId && groupById[t.sessionId] ? groupById[t.sessionId] : none;
      group.tasks.push(t);
    });

    return groups.concat(none).filter((g) => g.tasks.length > 0);
  }

  function renderList() {
    const state = store.getState();
    const tasks = sortTasks(visibleTasks());

    if (tasks.length === 0) {
      els.listView.innerHTML = `<p class="empty-state">Nenhuma tarefa por aqui. Que tal adicionar uma? 🎉</p>`;
      return;
    }

    if (!state.ui.groupByProject) {
      els.listView.innerHTML = tasks.map(taskRowHtml).join('');
      return;
    }

    const groups = groupTasksByProject(tasks).filter((g) => g.tasks.length > 0);
    els.listView.innerHTML = groups
      .map((g) => {
        const sessionGroups = groupTasksBySession(g.tasks, g.id);
        const body = sessionGroups
          ? sessionGroups
              .map(
                (sg) => `
          <h4 class="list-session-title">${escapeHtml(sg.name)}</h4>
          ${sg.tasks.map(taskRowHtml).join('')}`
              )
              .join('')
          : g.tasks.map(taskRowHtml).join('');
        return `
      <div class="list-section">
        <h3 class="list-section-title" style="color:${g.color}">${escapeHtml(g.name)}</h3>
        ${body}
      </div>`;
      })
      .join('');
  }

  function boardCardHtml(task) {
    const subtasks = store.getSubtasks(task.id);
    return `
      <div class="board-card ${task.status === 'done' ? 'done' : ''}" data-task-id="${task.id}">
        <div class="board-card-header">
          ${subtaskToggleHtml(task, subtasks)}
          <input type="checkbox" class="task-check" data-toggle="${task.id}" ${task.status === 'done' ? 'checked' : ''}>
          <div class="task-title">${escapeHtml(task.title)}</div>
          ${taskMenuHtml(task)}
        </div>
        <div class="task-meta">${taskMetaHtml(task)}${subtaskProgressTagHtml(subtasks)}</div>
        ${subtaskPanelHtml(task, subtasks)}
      </div>`;
  }

  // Monta a lista "achatada" de colunas do Painel: um projeto sem sessão
  // vira 1 coluna (como sempre foi); um projeto COM sessões vira várias
  // colunas, uma por sessão (+ "Sem sessão" se tiver tarefa solta) — cada
  // sessão passa a ter sua própria coluna e seu próprio botão de adicionar,
  // em vez de ficar sub-agrupada dentro da coluna do projeto.
  function buildBoardColumns(tasks) {
    const projectGroups = groupTasksByProject(tasks).filter((g) => g.tasks.length > 0);
    const columns = [];

    projectGroups.forEach((g) => {
      const sessionGroups = groupTasksBySession(g.tasks, g.id);
      if (!sessionGroups) {
        columns.push({ projectId: g.id, sessionId: null, name: g.name, color: g.color, tasks: g.tasks });
        return;
      }
      sessionGroups.forEach((sg) => {
        columns.push({ projectId: g.id, sessionId: sg.id, name: sg.name, color: g.color, tasks: sg.tasks });
      });
    });

    return columns;
  }

  function renderBoard() {
    const tasks = sortTasks(visibleTasks());
    const columns = buildBoardColumns(tasks);

    if (columns.length === 0) {
      els.boardView.innerHTML = `<p class="empty-state">Nenhuma tarefa por aqui. Que tal adicionar uma? 🎉</p>`;
      els.boardDots.innerHTML = '';
      return;
    }

    els.boardView.innerHTML = columns
      .map((col) => {
        // A bolinha colorida na coluna de sessão mantém o vínculo visual
        // com a cor do projeto dono dela (o nome do projeto já não cabe
        // repetido em cada coluna de sessão).
        const dot = col.sessionId ? `<span class="dot" style="background:${col.color}"></span> ` : '';
        return `
      <div class="board-column">
        <h2>${dot}${escapeHtml(col.name)} <span class="count">${col.tasks.length}</span></h2>
        <div class="board-cards">${col.tasks.map(boardCardHtml).join('')}</div>
        <button type="button" class="board-add-task-btn" data-add-task-project="${col.projectId || ''}" data-add-task-session="${col.sessionId || ''}">+ Adicionar tarefa</button>
      </div>`;
      })
      .join('');

    renderBoardDots(columns.length);
  }

  // Bolinhas indicadoras do carrossel do Painel (só ficam visíveis no
  // mobile via CSS) — uma por coluna com tarefa, destacando a que está
  // na tela no momento.
  function boardActiveDotIndex() {
    const width = els.boardView.clientWidth;
    if (!width) return 0;
    return Math.round(els.boardView.scrollLeft / width);
  }

  function renderBoardDots(count) {
    const activeIndex = boardActiveDotIndex();
    els.boardDots.innerHTML = Array.from(
      { length: count },
      (_, i) => `<span class="board-dot ${i === activeIndex ? 'active' : ''}"></span>`
    ).join('');
  }

  // Chamado num listener de scroll leve (sem re-renderizar nada) pra
  // manter a bolinha ativa em dia durante o arraste/scroll nativo.
  function updateBoardDotsActive() {
    const dots = els.boardDots.querySelectorAll('.board-dot');
    if (!dots.length) return;
    const activeIndex = Math.min(dots.length - 1, Math.max(0, boardActiveDotIndex()));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === activeIndex));
  }

  function renderTaskProjectOptions(selectedId) {
    const state = store.getState();
    els.taskProjectSelect.innerHTML =
      `<option value="">Sem projeto</option>` +
      state.projects
        .map((p) => `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`)
        .join('');
  }

  // Só mostra o campo "Sessão" quando o projeto selecionado tiver alguma
  // sessão cadastrada — projetos que nunca usarem sessão não ganham esse
  // campo extra no modal de tarefa.
  function renderTaskSessionOptions(projectId, selectedId) {
    const sessions = projectId ? store.getSessionsForProject(projectId) : [];
    els.taskSessionRow.hidden = sessions.length === 0;
    els.taskSessionSelect.innerHTML =
      `<option value="">Sem sessão</option>` +
      sessions
        .map((s) => `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${escapeHtml(s.name)}</option>`)
        .join('');
  }

  function renderToolbarState() {
    const state = store.getState();
    els.periodTabs.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.period === state.ui.period));
    els.viewToggle.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.view === state.ui.view));
    els.listView.hidden = state.ui.view !== 'list';
    els.boardView.hidden = state.ui.view !== 'board';
    els.boardDots.hidden = state.ui.view !== 'board';

    // Cabeçalho e rodapé de navegação mobile
    if (els.mobileViewTitle) {
      const project = state.ui.projectFilter !== 'all' ? projectById(state.ui.projectFilter) : null;
      els.mobileViewTitle.textContent = project ? project.name : PERIOD_TITLES[state.ui.period] || 'Tarefas';
    }
    if (els.mobileTaskCount) {
      const openCount = store.getFilteredTasks().filter((t) => t.status !== 'done').length;
      els.mobileTaskCount.textContent = `${openCount} tarefa${openCount === 1 ? '' : 's'}`;
    }
    if (els.mobileBoardToggleBtn) {
      els.mobileBoardToggleBtn.textContent = state.ui.view === 'board' ? '☰' : '▤';
    }
    if (els.mobileNavToday) {
      els.mobileNavToday.classList.toggle(
        'active',
        state.ui.period === 'today' && state.ui.projectFilter === 'all' && !state.ui.tagFilter
      );
    }
    if (els.mobileNavUpcoming) {
      els.mobileNavUpcoming.classList.toggle(
        'active',
        state.ui.period === 'week' && state.ui.projectFilter === 'all' && !state.ui.tagFilter
      );
    }

    // Toggles de "Agrupar por projeto" (só faz sentido na Lista, no Painel
    // já é sempre agrupado) e "Mostrar concluídas" (desktop + menu mobile)
    const isListView = state.ui.view === 'list';
    [els.groupByProjectToggleBtn, els.groupByProjectMenuBtn].forEach((btn) => {
      if (!btn) return;
      btn.hidden = !isListView;
      btn.classList.toggle('active', state.ui.groupByProject);
    });
    [els.showCompletedToggleBtn, els.showCompletedMenuBtn].forEach((btn) => {
      if (!btn) return;
      btn.classList.toggle('active', state.ui.showCompleted);
    });
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
      renderBoard();
    }
  }

  App.render = {
    renderAll,
    renderTaskProjectOptions,
    renderTaskSessionOptions,
    projectById,
    applyTheme,
    toggleTaskExpanded,
    toggleTaskMenu,
    closeTaskMenu,
    updateBoardDotsActive
  };
})(window.App = window.App || {});
