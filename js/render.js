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
    pageTitle: document.getElementById('pageTitle'),
    mobileViewTitle: document.getElementById('mobileViewTitle'),
    mobileTaskCount: document.getElementById('mobileTaskCount'),
    mobileBoardToggleBtn: document.getElementById('mobileBoardToggleBtn'),
    mobileNavToday: document.querySelector('.mobile-nav-btn[data-mobile-tab="today"]'),
    mobileNavUpcoming: document.querySelector('.mobile-nav-btn[data-mobile-tab="upcoming"]'),
    quickFilterToday: document.getElementById('quickFilterToday'),
    quickFilterUpcoming: document.getElementById('quickFilterUpcoming'),
    quickFilterRecurring: document.getElementById('quickFilterRecurring'),
    showCompletedToggleBtn: document.getElementById('showCompletedToggleBtn'),
    groupByProjectToggleBtn: document.getElementById('groupByProjectToggleBtn'),
    showCompletedMenuBtn: document.getElementById('showCompletedMenuBtn'),
    groupByProjectMenuBtn: document.getElementById('groupByProjectMenuBtn'),
    importTodoistTree: document.getElementById('importTodoistTree'),
    importTodoistWarnings: document.getElementById('importTodoistWarnings'),
    importTagsSection: document.getElementById('importTagsSection'),
    tasksScreen: document.getElementById('tasksScreen'),
    campaignsView: document.getElementById('campaignsView'),
    campaignsListEl: document.getElementById('campaignsListEl'),
    quickFilterCampaigns: document.getElementById('quickFilterCampaigns'),
    campaignProjectSelect: document.getElementById('campaignProjectSelect'),
    campaignSessionRow: document.getElementById('campaignSessionRow'),
    campaignSessionSelect: document.getElementById('campaignSessionSelect'),
    campaignImportTable: document.getElementById('campaignImportTable'),
    campaignImportTableBody: document.getElementById('campaignImportTableBody'),
    campaignImportWarnings: document.getElementById('campaignImportWarnings'),
    showEncerradasToggle: document.getElementById('showEncerradasToggle'),
    campaignDetailView: document.getElementById('campaignDetailView')
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
      const aKey = a.dueDate || '9999-99-99';
      const bKey = b.dueDate || '9999-99-99';
      if (aKey !== bKey) return aKey > bKey ? 1 : -1;
      const aTime = a.dueTime || '99:99:99';
      const bTime = b.dueTime || '99:99:99';
      if (aTime !== bTime) return aTime > bTime ? 1 : -1;
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
      <span class="drag-handle" data-drag-handle title="Arrastar para reordenar">⠿</span>
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

    const sortedProjects = state.projects.slice().sort((a, b) => a.position - b.position);
    els.projectList.innerHTML = allBtn + sortedProjects.map((p) => projectItemHtml(p, openCounts)).join('');
    els.tagList.innerHTML = state.tags.map((tag) => tagItemHtml(tag, tagCounts)).join('');

    const favProjects = sortedProjects.filter((p) => p.isFavorite);
    const favTags = state.tags.filter((t) => t.isFavorite);
    els.favoritesSection.hidden = favProjects.length === 0 && favTags.length === 0;
    els.favoritesList.innerHTML =
      favProjects.map((p) => projectItemHtml(p, openCounts, { compact: true })).join('') +
      favTags.map((tag) => tagItemHtml(tag, tagCounts, { compact: true })).join('');
  }

  function taskMetaHtml(task, { hideSessionTag = false } = {}) {
    const project = projectById(task.projectId);
    const today = utils.todayISO();
    const parts = [];
    if (project) {
      parts.push(
        `<span class="tag" style="background:${project.color}22;color:${project.color}">${escapeHtml(project.name)}</span>`
      );
    }
    if (task.recurrence) {
      parts.push(`<span class="tag tag-recurring">🔁 ${escapeHtml(App.recurrence.describeRule(task.recurrence))}</span>`);
    }
    if (task.dueDate) {
      const overdue = utils.isOverdue(task.dueDate, today) && task.status !== 'done';
      const timeSuffix = task.dueTime ? ` · ${task.dueTime.slice(0, 5).replace(':', 'h')}` : '';
      parts.push(`<span class="tag ${overdue ? 'tag-overdue' : ''}">📅 ${utils.formatDateBR(task.dueDate)}${timeSuffix}</span>`);
    }
    if (task.sessionId && !hideSessionTag) {
      const session = store.getState().sessions.find((s) => s.id === task.sessionId);
      if (session) parts.push(`<span class="tag">🗂️ ${escapeHtml(session.name)}</span>`);
    }
    store.getTaskTags(task.id).forEach((tag) => {
      parts.push(`<span class="tag" style="background:${tag.color}22;color:${tag.color}">@${escapeHtml(tag.name)}</span>`);
    });
    return parts.join('');
  }

  // Setinha de expandir/recolher (só existe quando há subtarefas — a
  // descrição já tem prévia própria direto no card, ver
  // taskDescriptionPreviewHtml; não faz sentido expandir se não há nada a
  // mais pra mostrar).
  function subtaskToggleHtml(task, subtasks) {
    if (!subtasks.length) return '';
    const isExpanded = expandedTaskIds.has(task.id);
    return `<button type="button" class="subtask-toggle-btn" data-toggle-subtasks="${task.id}" title="${isExpanded ? 'Recolher' : 'Expandir'} detalhes">${isExpanded ? '▾' : '▸'}</button>`;
  }

  // Tag "☑ 2/5" com o progresso das subtarefas (só existe quando há alguma)
  function subtaskProgressTagHtml(subtasks) {
    if (!subtasks.length) return '';
    const done = subtasks.filter((s) => s.status === 'done').length;
    return `<span class="tag subtask-progress-tag">☑ ${done}/${subtasks.length}</span>`;
  }

  // Prévia da descrição direto no card/linha (Lista e Painel), abaixo do
  // título — estilo Todoist. Truncada em até 2 linhas via CSS
  // (-webkit-line-clamp, ver .task-description-preview); nada é renderizado
  // quando a tarefa não tem descrição (sem placeholder vazio ocupando
  // espaço). O texto completo (sem truncar) continua disponível ao
  // expandir a tarefa — ver subtaskPanelHtml, não alterado por esta função.
  function taskDescriptionPreviewHtml(task) {
    if (!task.description) return '';
    return `<div class="task-description-preview">${escapeHtml(task.description)}</div>`;
  }

  // Menu "⋯" com Editar/Data/Excluir. Substitui os antigos botões soltos de
  // editar/excluir, reaproveitado tanto na Lista quanto no Painel.
  function taskMenuHtml(task) {
    const isOpen = openMenuTaskId === task.id;
    const dateRow = task.recurrence
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
  // adicionar. Reaproveitado tanto na Lista quanto no Painel (Kanban). A
  // descrição NÃO entra aqui — já tem sua própria prévia direto no card
  // (ver taskDescriptionPreviewHtml); mostrá-la de novo aqui duplicava o
  // texto quando a tarefa também tinha subtarefas.
  function subtaskPanelHtml(task, subtasks) {
    if (!subtasks.length || !expandedTaskIds.has(task.id)) return '';
    const subtasksHtml = `
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
        </form>`;
    return `
      <div class="subtask-panel">
        ${subtasksHtml}
      </div>`;
  }

  function taskRowHtml(task, options) {
    const subtasks = store.getSubtasks(task.id);
    return `
      <div class="task-row-wrap" data-task-wrap="${task.id}">
        <div class="task-row ${task.status === 'done' ? 'done' : ''}" data-task-id="${task.id}">
          ${subtaskToggleHtml(task, subtasks)}
          <input type="checkbox" class="task-check" data-toggle="${task.id}" ${task.status === 'done' ? 'checked' : ''}>
          <div class="task-info">
            <div class="task-title">${escapeHtml(task.title)}</div>
            ${taskDescriptionPreviewHtml(task)}
            <div class="task-meta">${taskMetaHtml(task, options)}${subtaskProgressTagHtml(subtasks)}</div>
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
    const groups = state.projects.map((p) => ({ id: p.id, name: p.name, color: p.color, boardPosition: p.boardPosition, tasks: [] }));
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

    // Sessões de verdade sempre aparecem, mesmo vazias — já que o usuário
    // as criou de propósito e quer ver a coluna pronta pra adicionar
    // tarefas nela. "Sem sessão" não é uma sessão de verdade, então só
    // aparece quando tiver alguma tarefa solta ali.
    return none.tasks.length > 0 ? groups.concat(none) : groups;
  }

  function renderList() {
    const state = store.getState();
    const tasks = sortTasks(visibleTasks());

    if (!state.ui.groupByProject) {
      if (tasks.length === 0) {
        els.listView.innerHTML = `<p class="empty-state">Nenhuma tarefa por aqui. Que tal adicionar uma? 🎉</p>`;
        return;
      }
      els.listView.innerHTML = tasks.map((t) => taskRowHtml(t)).join('');
      return;
    }

    // Só considera os grupos de projeto relevantes pro filtro atual: com um
    // projeto específico filtrado, mantém só ele (mesmo com 0 tarefas, pra
    // suas sessões aparecerem como sub-seção mesmo vazias); sem filtro de
    // projeto, só quem tem tarefa de verdade — senão sessões de OUTROS
    // projetos (sem nenhuma tarefa nesta visão) vazam como cabeçalhos vazios.
    const splitBySession = state.ui.projectFilter !== 'all';
    const relevantGroups = splitBySession
      ? groupTasksByProject(tasks).filter((g) => g.id === state.ui.projectFilter)
      : groupTasksByProject(tasks).filter((g) => g.tasks.length > 0);

    const sections = relevantGroups
      .map((g) => {
        const sessionGroups = splitBySession ? groupTasksBySession(g.tasks, g.id) : null;
        if (sessionGroups) {
          const body = sessionGroups
            .map(
              (sg) => `
          <h4 class="list-session-title">${escapeHtml(sg.name)}</h4>
          ${sg.tasks.map((t) => taskRowHtml(t, { hideSessionTag: true })).join('')}`
            )
            .join('');
          return `
      <div class="list-section">
        <h3 class="list-section-title" style="color:${g.color}">${escapeHtml(g.name)}</h3>
        ${body}
      </div>`;
        }
        // Projeto sem sessão: só vira seção se tiver alguma tarefa —
        // continua igual a antes.
        if (g.tasks.length === 0) return '';
        return `
      <div class="list-section">
        <h3 class="list-section-title" style="color:${g.color}">${escapeHtml(g.name)}</h3>
        ${g.tasks.map((t) => taskRowHtml(t)).join('')}
      </div>`;
      })
      .filter(Boolean);

    if (sections.length === 0) {
      els.listView.innerHTML = `<p class="empty-state">Nenhuma tarefa por aqui. Que tal adicionar uma? 🎉</p>`;
      return;
    }
    els.listView.innerHTML = sections.join('');
  }

  function boardCardHtml(task, options) {
    const subtasks = store.getSubtasks(task.id);
    return `
      <div class="board-card ${task.status === 'done' ? 'done' : ''}" data-task-id="${task.id}">
        <div class="board-card-header">
          ${subtaskToggleHtml(task, subtasks)}
          <input type="checkbox" class="task-check" data-toggle="${task.id}" ${task.status === 'done' ? 'checked' : ''}>
          <div class="task-title">${escapeHtml(task.title)}</div>
          ${taskMenuHtml(task)}
        </div>
        ${taskDescriptionPreviewHtml(task)}
        <div class="task-meta">${taskMetaHtml(task, options)}${subtaskProgressTagHtml(subtasks)}</div>
        ${subtaskPanelHtml(task, subtasks)}
      </div>`;
  }

  const WEEKDAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  // Colunas do Painel de "Em breve": uma por dia (hoje + próximos 7), com
  // "Atrasada" na frente quando existe alguma tarefa vencida. Os dias
  // sempre aparecem mesmo vazios (dá pra adicionar tarefa direto neles);
  // "Atrasada" só existe quando tem conteúdo.
  function buildDateColumns(tasks) {
    const today = utils.todayISO();
    const columns = [];

    // Toda tarefa (recorrente ou não) tem due_date real agora — recorrente
    // avança pra próxima ocorrência só na conclusão (ver setTaskStatus em
    // store.js), então cai na coluna certa pelo mesmo filtro simples de
    // qualquer outra tarefa, sem tratamento especial.
    const overdueTasks = tasks.filter((t) => t.status !== 'done' && utils.isOverdue(t.dueDate, today));
    if (overdueTasks.length > 0) {
      columns.push({ isDateColumn: true, dateISO: null, name: 'Atrasada', tasks: overdueTasks });
    }

    for (let n = 0; n <= 7; n += 1) {
      const dateISO = utils.addDaysISO(today, n);
      const name =
        n === 0
          ? 'Hoje'
          : n === 1
          ? 'Amanhã'
          : `${WEEKDAY_NAMES[utils.parseISO(dateISO).getDay()]} · ${utils.formatDateBR(dateISO)}`;
      columns.push({ isDateColumn: true, dateISO, name, tasks: tasks.filter((t) => t.dueDate === dateISO) });
    }

    return columns;
  }

  // Monta a lista "achatada" de colunas do Painel: um projeto sem sessão
  // vira 1 coluna (como sempre foi). Um projeto COM sessões só vira uma
  // coluna por sessão quando um projeto específico está filtrado — em
  // "Todas as tarefas" (ou filtrando por etiqueta), isso bagunçava a tela
  // misturando colunas de sessão de vários projetos diferentes lado a
  // lado; nesse caso o projeto continua como 1 coluna só, com todas as
  // suas tarefas juntas (a tag de sessão volta a aparecer no card, já que
  // a coluna deixa de indicar uma sessão específica).
  function buildBoardColumns(tasks) {
    const ui = store.getState().ui;
    const projectFilter = ui.projectFilter;
    // "Em breve" sem projeto/etiqueta filtrado vira colunas de data em vez
    // de colunas de projeto — se um projeto/etiqueta específico estiver
    // filtrado mesmo dentro de "Em breve", continua o agrupamento normal.
    // A visão "Recorrentes" nunca usa colunas de data, mesmo que period
    // ainda esteja em 'week' de uma navegação anterior.
    if (ui.period === 'week' && projectFilter === 'all' && !ui.tagFilter && !ui.recurringOnly) {
      return buildDateColumns(tasks);
    }
    const splitBySession = projectFilter !== 'all';
    // Só considera os grupos de projeto relevantes pro filtro atual: com um
    // projeto específico filtrado, mantém só ele (mesmo com 0 tarefas, pra
    // suas sessões aparecerem como coluna mesmo vazias); sem filtro de
    // projeto, só quem tem tarefa de verdade — senão sessões de OUTROS
    // projetos (sem nenhuma tarefa nesta visão) vazam como colunas fantasmas.
    const relevantGroups = splitBySession
      ? groupTasksByProject(tasks).filter((g) => g.id === projectFilter)
      : groupTasksByProject(tasks).filter((g) => g.tasks.length > 0);

    // Ordem das colunas de projeto no Painel é própria (boardPosition),
    // independente da position da sidebar — só se aplica quando NÃO
    // dividimos por sessão (sub-colunas de sessão continuam na ordem que
    // já vinha de groupTasksBySession/sessions.position). "Sem projeto"
    // (id null) não tem boardPosition — fica sempre por último, como já
    // era antes desta mudança.
    if (!splitBySession) {
      const none = relevantGroups.find((g) => g.id === null);
      const real = relevantGroups.filter((g) => g.id !== null).sort((a, b) => a.boardPosition - b.boardPosition);
      relevantGroups.length = 0;
      relevantGroups.push(...real);
      if (none) relevantGroups.push(none);
    }

    const columns = [];

    relevantGroups.forEach((g) => {
      const sessionGroups = splitBySession ? groupTasksBySession(g.tasks, g.id) : null;
      if (sessionGroups) {
        sessionGroups.forEach((sg) => {
          columns.push({ projectId: g.id, sessionId: sg.id, name: sg.name, color: g.color, tasks: sg.tasks, isSessionColumn: true });
        });
        return;
      }
      // Projeto sem sessão (ou fora do filtro de projeto específico): só
      // vira coluna se tiver alguma tarefa — continua igual a antes.
      if (g.tasks.length > 0) {
        columns.push({ projectId: g.id, sessionId: null, name: g.name, color: g.color, tasks: g.tasks, isSessionColumn: false });
      }
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
        const cardOptions = { hideSessionTag: col.isSessionColumn };
        const addTaskAttrs = col.isDateColumn
          ? `data-add-task-date="${col.dateISO || ''}"`
          : `data-add-task-project="${col.projectId || ''}" data-add-task-session="${col.sessionId || ''}"`;
        // Só colunas de projeto inteiro (sem divisão por sessão, sem ser
        // "Sem projeto" nem coluna de data) são reordenáveis — o atributo
        // data-board-project dobra como seletor de linha do
        // enableReorderDrag, então colunas inelegíveis já saem
        // automaticamente de jogo como origem e como alvo do arraste.
        const isReorderable = !!col.projectId && !col.isSessionColumn;
        const colAttrs = isReorderable ? ` data-board-project="${col.projectId}"` : '';
        const handle = isReorderable
          ? `<span class="drag-handle" data-drag-handle title="Arrastar para reordenar">⠿</span>`
          : '';
        return `
      <div class="board-column"${colAttrs}>
        <h2>${dot}${escapeHtml(col.name)} <span class="count">${col.tasks.length}</span>${handle}</h2>
        <div class="board-cards">${col.tasks.map((t) => boardCardHtml(t, cardOptions)).join('')}</div>
        <button type="button" class="board-add-task-btn" ${addTaskAttrs}>+ Adicionar tarefa</button>
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

  function renderCampaignProjectOptions(selectedId) {
    const state = store.getState();
    els.campaignProjectSelect.innerHTML =
      `<option value="">Sem projeto</option>` +
      state.projects
        .map((p) => `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`)
        .join('');
  }

  // Mesmo padrão de renderTaskSessionOptions: só mostra o campo "Sessão"
  // quando o projeto selecionado tiver alguma sessão cadastrada.
  function renderCampaignSessionOptions(projectId, selectedId) {
    const sessions = projectId ? store.getSessionsForProject(projectId) : [];
    els.campaignSessionRow.hidden = sessions.length === 0;
    els.campaignSessionSelect.innerHTML =
      `<option value="">Sem sessão</option>` +
      sessions
        .map((s) => `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${escapeHtml(s.name)}</option>`)
        .join('');
  }

  // Preview do import de clientes (planilha .xlsx do Conexa) — todos os
  // checkboxes vêm marcados por padrão; texto de origem externa (nome/
  // celular/plano vindos da planilha) sempre passa por escapeHtml.
  function renderCampaignImportPreview(parsed) {
    els.campaignImportWarnings.hidden = !parsed.warnings.length;
    els.campaignImportWarnings.innerHTML = parsed.warnings.length
      ? `<ul>${parsed.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`
      : '';
    els.campaignImportTable.hidden = parsed.clients.length === 0;
    els.campaignImportTableBody.innerHTML = parsed.clients
      .map(
        (c, i) => `
        <tr>
          <td><input type="checkbox" data-campaign-client-check="${i}" checked></td>
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.phone || '')}</td>
          <td>${escapeHtml(c.plan || '')}</td>
        </tr>`
      )
      .join('');
  }

  const CAMPAIGN_STATUS_LABEL = { ativa: 'Ativa', encerrada: 'Encerrada' };
  const CAMPAIGN_CLIENT_STATUS_LABEL = {
    sem_resposta: 'Sem resposta',
    respondeu: 'Respondeu',
    trial: 'Trial ativado',
    convertido: 'Convertido',
    recusou: 'Recusou'
  };

  function renderCampaignsList() {
    const state = store.getState();
    if (els.showEncerradasToggle) {
      els.showEncerradasToggle.checked = !!state.ui.showEncerradas;
    }
    // Três estados possíveis: erro (com retry), carregando (ainda não
    // carregou com sucesso nenhuma vez) e carregado (lista ou empty state).
    // Nunca "loading eterno": loadCampaigns sempre sai de campaignsLoading
    // pra um dos outros dois, sucesso ou erro (ver js/store.js).
    if (state.campaignsError) {
      els.campaignsListEl.innerHTML = `
        <div class="empty-state">
          <p>Não foi possível carregar as campanhas.</p>
          <button type="button" class="btn-secondary" data-campaigns-retry>Tentar de novo</button>
        </div>`;
      return;
    }
    if (!state.campaignsLoaded) {
      els.campaignsListEl.innerHTML = `<p class="empty-state">Carregando campanhas...</p>`;
      return;
    }
    // "Encerrar" tira a campanha da lista padrão, mas ela continua
    // acessível via este toggle (nunca é escondida de vez).
    const visibleCampaigns = state.campaigns.filter(
      (c) => state.ui.showEncerradas || c.status === 'ativa'
    );
    if (!visibleCampaigns.length) {
      els.campaignsListEl.innerHTML = `<p class="empty-state">Nenhuma campanha ainda. Crie a primeira acima.</p>`;
      return;
    }
    els.campaignsListEl.innerHTML = visibleCampaigns
      .map((c) => {
        const counts = store.getCampaignClientCounts(c.id);
        const project = c.followupProjectId ? projectById(c.followupProjectId) : null;
        return `
        <div class="campaign-row" data-campaign-id="${c.id}">
          <div class="campaign-row-name">${escapeHtml(c.name)}
            <span class="campaign-status-badge campaign-status-${c.status}">${escapeHtml(CAMPAIGN_STATUS_LABEL[c.status] || c.status)}</span>
          </div>
          <div class="campaign-row-meta">
            ${counts.total} cliente${counts.total === 1 ? '' : 's'}
            · ${counts.trial} em trial · ${counts.convertido} convertido${counts.convertido === 1 ? '' : 's'}
            ${project ? `· ${escapeHtml(project.name)}` : ''}
          </div>
        </div>`;
      })
      .join('');
  }

  // Tela de detalhe: controla o próprio conteúdo inteiro via innerHTML
  // (mesmo padrão de renderCampaignsList) — não precisa de sub-referências
  // em `els`, só o container. campaignDetailId pode ficar stale (campanha
  // excluída em outra aba, já que persiste em localStorage) — trata isso
  // como estado vazio com botão voltar, nunca quebra.
  function renderCampaignDetail() {
    const state = store.getState();
    const campaign = state.campaigns.find((c) => c.id === state.ui.campaignDetailId);
    if (!campaign) {
      els.campaignDetailView.innerHTML = `
        <div class="empty-state">
          <p>Campanha não encontrada.</p>
          <button type="button" class="btn-secondary" data-back-to-campaigns>← Campanhas</button>
        </div>`;
      return;
    }

    const metrics = store.getCampaignMetrics(campaign.id);
    const project = campaign.followupProjectId ? projectById(campaign.followupProjectId) : null;
    const statusToggleLabel = campaign.status === 'ativa' ? 'Encerrar' : 'Reativar';

    const clients = state.campaignClients
      .filter((c) => c.campaignId === campaign.id)
      .filter((c) => state.campaignClientStatusFilter === 'all' || c.status === state.campaignClientStatusFilter);

    const statusFilterButtons = ['all', ...Object.keys(CAMPAIGN_CLIENT_STATUS_LABEL)]
      .map((status) => {
        const label = status === 'all' ? 'Todos' : CAMPAIGN_CLIENT_STATUS_LABEL[status];
        const active = state.campaignClientStatusFilter === status ? 'active' : '';
        return `<button type="button" class="${active}" data-client-status-filter="${status}">${escapeHtml(label)}</button>`;
      })
      .join('');

    const messagesHtml = [1, 2, 3]
      .map((n) => {
        const msg = campaign[`fup${n}Message`] || '';
        const dateLabel = campaign[`fup${n}Date`] ? ` — ${utils.formatDateBR(campaign[`fup${n}Date`])}` : '';
        return `
        <div class="campaign-detail-message">
          <label>FUP${n}${dateLabel}</label>
          <textarea readonly data-message-idx="${n}">${escapeHtml(msg)}</textarea>
          <button type="button" class="btn-secondary" data-copy-message="${n}">Copiar</button>
        </div>`;
      })
      .join('');

    const tableRows = clients
      .map((c) => {
        const trialEnd = c.trialStart ? utils.formatDateBR(utils.addDaysISO(c.trialStart, campaign.trialDays)) : '—';
        const statusOptions = Object.keys(CAMPAIGN_CLIENT_STATUS_LABEL)
          .map(
            (s) =>
              `<option value="${s}" ${c.status === s ? 'selected' : ''}>${escapeHtml(CAMPAIGN_CLIENT_STATUS_LABEL[s])}</option>`
          )
          .join('');
        return `
        <tr data-client-id="${c.id}">
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.phone || '')}</td>
          <td>${escapeHtml(c.plan || '')}</td>
          <td><select data-client-status-select>${statusOptions}</select></td>
          <td><input type="checkbox" data-client-fup-toggle="1" ${c.fup1Sent ? 'checked' : ''}></td>
          <td><input type="checkbox" data-client-fup-toggle="2" ${c.fup2Sent ? 'checked' : ''}></td>
          <td><input type="checkbox" data-client-fup-toggle="3" ${c.fup3Sent ? 'checked' : ''}></td>
          <td><input type="date" data-client-trial-start value="${c.trialStart || ''}"></td>
          <td>${trialEnd}</td>
          <td><input type="number" step="0.01" min="0" data-client-mrr value="${c.mrr}" ${c.status !== 'convertido' ? 'disabled' : ''}></td>
          <td><textarea data-client-notes>${escapeHtml(c.notes || '')}</textarea></td>
        </tr>`;
      })
      .join('');

    const fup1Header = campaign.fup1Date ? utils.formatDateBR(campaign.fup1Date) : '—';
    const fup2Header = campaign.fup2Date ? utils.formatDateBR(campaign.fup2Date) : '—';
    const fup3Header = campaign.fup3Date ? utils.formatDateBR(campaign.fup3Date) : '—';

    els.campaignDetailView.innerHTML = `
      <header class="campaign-detail-header">
        <button type="button" class="btn-secondary" data-back-to-campaigns>← Campanhas</button>
        <h2 class="campaign-detail-name">${escapeHtml(campaign.name)}</h2>
        <span class="campaign-status-badge campaign-status-${campaign.status}">${escapeHtml(CAMPAIGN_STATUS_LABEL[campaign.status] || campaign.status)}</span>
        <div class="campaign-detail-header-actions">
          <button type="button" class="btn-secondary" data-campaign-status-toggle="${campaign.id}">${statusToggleLabel}</button>
          <button type="button" class="btn-danger" data-campaign-delete="${campaign.id}">Excluir campanha</button>
        </div>
      </header>

      <div class="campaign-detail-metrics">
        <div class="campaign-metric-tile"><span class="campaign-metric-value">${metrics.total}</span><span class="campaign-metric-label">Clientes</span></div>
        <div class="campaign-metric-tile"><span class="campaign-metric-value">${metrics.responded}</span><span class="campaign-metric-label">Responderam</span></div>
        <div class="campaign-metric-tile"><span class="campaign-metric-value">${metrics.trial}</span><span class="campaign-metric-label">Trials ativados</span></div>
        <div class="campaign-metric-tile"><span class="campaign-metric-value">${metrics.convertido}</span><span class="campaign-metric-label">Convertidos</span></div>
        <div class="campaign-metric-tile"><span class="campaign-metric-value">R$ ${metrics.mrrAdicional.toFixed(2)}</span><span class="campaign-metric-label">MRR adicional</span></div>
        <div class="campaign-metric-tile"><span class="campaign-metric-value">${(metrics.conversionRate * 100).toFixed(1)}%</span><span class="campaign-metric-label">Taxa de conversão</span></div>
      </div>
      ${project ? `<p class="campaign-detail-project">Projeto de destino: ${escapeHtml(project.name)}</p>` : ''}

      <div class="campaign-detail-messages">${messagesHtml}</div>

      <div class="campaign-detail-filter">${statusFilterButtons}</div>

      <div class="campaign-clients-table-wrap">
        <table class="campaign-clients-table">
          <thead>
            <tr>
              <th>Nome</th><th>Celular</th><th>Plano</th><th>Status</th>
              <th>FUP1 (${fup1Header})</th><th>FUP2 (${fup2Header})</th><th>FUP3 (${fup3Header})</th>
              <th>Trial início</th><th>Trial fim</th><th>MRR</th><th>Observações</th>
            </tr>
          </thead>
          <tbody>${tableRows || `<tr><td colspan="11" class="empty-state">Nenhum cliente com esse filtro.</td></tr>`}</tbody>
        </table>
      </div>
    `;
  }

  function renderToolbarState() {
    const state = store.getState();
    if (els.quickFilterCampaigns) {
      els.quickFilterCampaigns.classList.toggle(
        'active',
        state.ui.screen === 'campaigns' || state.ui.screen === 'campaignDetail'
      );
    }
    els.periodTabs.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.period === state.ui.period));
    els.viewToggle.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.view === state.ui.view));
    els.listView.hidden = state.ui.view !== 'list';
    els.boardView.hidden = state.ui.view !== 'board';
    els.boardDots.hidden = state.ui.view !== 'board';

    // Título da página/projeto atual — mostrado tanto no cabeçalho mobile
    // quanto no canto superior esquerdo do conteúdo (desktop/tablet).
    const currentProject = state.ui.projectFilter !== 'all' ? projectById(state.ui.projectFilter) : null;
    const currentTitle = state.ui.recurringOnly
      ? 'Recorrentes'
      : currentProject
      ? currentProject.name
      : PERIOD_TITLES[state.ui.period] || 'Tarefas';
    if (els.pageTitle) {
      els.pageTitle.textContent = currentTitle;
    }
    if (els.mobileViewTitle) {
      els.mobileViewTitle.textContent = currentTitle;
    }
    if (els.mobileTaskCount) {
      const openCount = store.getFilteredTasks().filter((t) => t.status !== 'done').length;
      els.mobileTaskCount.textContent = `${openCount} tarefa${openCount === 1 ? '' : 's'}`;
    }
    if (els.mobileBoardToggleBtn) {
      els.mobileBoardToggleBtn.textContent = state.ui.view === 'board' ? '☰' : '▤';
    }
    const isGlobalFilter = state.ui.projectFilter === 'all' && !state.ui.tagFilter;
    const isTodayActive = isGlobalFilter && state.ui.period === 'today';
    const isUpcomingActive = isGlobalFilter && state.ui.period === 'week';
    if (els.mobileNavToday) els.mobileNavToday.classList.toggle('active', isTodayActive);
    if (els.mobileNavUpcoming) els.mobileNavUpcoming.classList.toggle('active', isUpcomingActive);
    if (els.quickFilterToday) els.quickFilterToday.classList.toggle('active', isTodayActive);
    if (els.quickFilterUpcoming) els.quickFilterUpcoming.classList.toggle('active', isUpcomingActive);
    if (els.quickFilterRecurring) els.quickFilterRecurring.classList.toggle('active', !!state.ui.recurringOnly);

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

  // Texto que descreve a data/recorrência interpretada de uma linha do CSV,
  // no mesmo estilo do taskMetaHtml (📅 data simples, 🔁 regra recorrente).
  // Quando a data não é reconhecida, empilha um aviso em `warnings` e marca
  // a linha com ⚠️ em vez de inventar uma data.
  function importDateMetaHtml(dateRaw, dateLang, warnings) {
    if (!dateRaw) return '';
    const d = App.importTodoist.parseTodoistDate(dateRaw, dateLang);
    if (!d.ok) {
      warnings.push(`Data não reconhecida: "${utils.escapeHtml(dateRaw)}"`);
      return ` <span class="import-tree-task-meta">⚠️ data não reconhecida</span>`;
    }
    const timeSuffix = d.dueTime ? ` · ${d.dueTime}` : '';
    if (d.recurrence) {
      return ` <span class="import-tree-task-meta">🔁 ${utils.escapeHtml(App.recurrence.describeRule(d.recurrence))}${timeSuffix}</span>`;
    }
    if (d.dueDate) {
      return ` <span class="import-tree-task-meta">📅 ${utils.formatDateBR(d.dueDate)}${timeSuffix}</span>`;
    }
    return '';
  }

  function importTaskHtml(task, warnings, isSubtask) {
    const meta = importDateMetaHtml(task.dateRaw, task.dateLang, warnings);
    const descIcon = task.description ? ` <span class="import-tree-task-meta" title="Tem descrição">📄</span>` : '';
    const cls = isSubtask ? 'import-tree-task import-tree-subtask' : 'import-tree-task';
    const childrenHtml = (task.children || []).map((child) => importTaskHtml(child, warnings, true)).join('');
    return `<div class="${cls}"><span>${utils.escapeHtml(task.title)}</span>${descIcon}${meta}</div>${childrenHtml}`;
  }

  // Soma os comentários (notas do Todoist) de uma tarefa e de toda a
  // descendência dela (subtarefas em qualquer nível de indentação).
  function countImportComments(tasks) {
    return tasks.reduce((sum, task) => sum + (task.comments || []).length + countImportComments(task.children || []), 0);
  }

  // Uma linha "@nome -> seletor" da seção Etiquetas do preview. O select
  // mistura as etiquetas existentes do usuário com uma opção "criar nova" —
  // pré-selecionada quando não há correspondência, ou a etiqueta casada
  // quando há (editável nos dois casos).
  function importTagRowHtml(match, existingTags) {
    const selectedId = match.matchedTag ? match.matchedTag.id : null;
    const createOption = `<option value="create"${selectedId ? '' : ' selected'}>+ Criar etiqueta "@${utils.escapeHtml(match.name)}"</option>`;
    const tagOptions = existingTags
      .map((t) => `<option value="tag:${t.id}"${t.id === selectedId ? ' selected' : ''}>${utils.escapeHtml(t.name)}</option>`)
      .join('');
    return `
      <div class="import-tag-row">
        <span class="import-tag-name">@${utils.escapeHtml(match.name)}</span>
        <select class="import-tag-select" data-import-tag-name="${utils.escapeHtml(match.name)}">${createOption}${tagOptions}</select>
      </div>`;
  }

  // Seção "Etiquetas" do preview: uma lista das que já batem com etiquetas
  // existentes (vinculação automática, editável) e outra das sem
  // correspondência (criação nova por padrão, editável). Some inteira
  // quando o CSV não tem nenhum @token — não polui o preview à toa.
  function renderImportTagsSection(tagMatches) {
    if (!tagMatches.length) {
      els.importTagsSection.hidden = true;
      els.importTagsSection.innerHTML = '';
      return;
    }
    const existingTags = store.getState().tags;
    const matched = tagMatches.filter((m) => m.matchedTag);
    const unmatched = tagMatches.filter((m) => !m.matchedTag);
    const group = (label, items) =>
      items.length
        ? `<p class="import-tags-label">${label}</p>${items.map((m) => importTagRowHtml(m, existingTags)).join('')}`
        : '';
    els.importTagsSection.innerHTML =
      `<div class="import-tags-heading">Etiquetas</div>` +
      group('Serão vinculadas automaticamente', matched) +
      group('Sem correspondência — serão criadas', unmatched);
    els.importTagsSection.hidden = false;
  }

  // Pré-visualização do import do Todoist: monta a árvore de seções/tarefas/
  // subtarefas e a lista de avisos (datas não reconhecidas + comentários a
  // importar) numa só passada recursiva pela estrutura de parseTodoistExport,
  // e a seção de etiquetas extraídas dos títulos (tagMatches, ver
  // App.importTodoist.collectImportTagNames).
  function renderImportPreview(parsed, tagMatches) {
    const warnings = [];
    const sectionsHtml = parsed.sections
      .filter((section) => section.tasks.length > 0)
      .map((section, i) => {
        // sections[0] é sempre a seção sintética "Sem seção" — não tem
        // cabeçalho próprio (é a lista de tarefas soltas do projeto).
        const heading = i === 0 ? '' : `<div class="import-tree-section">${utils.escapeHtml(section.name)}</div>`;
        return heading + section.tasks.map((task) => importTaskHtml(task, warnings, false)).join('');
      })
      .join('');

    els.importTodoistTree.innerHTML =
      sectionsHtml || `<p class="empty-state">Nenhuma tarefa encontrada no arquivo.</p>`;

    const totalComments = parsed.sections.reduce((sum, section) => sum + countImportComments(section.tasks), 0);
    if (totalComments > 0) {
      warnings.push(
        `${totalComments} comentário${totalComments === 1 ? '' : 's'} ${totalComments === 1 ? 'será' : 'serão'} importado${totalComments === 1 ? '' : 's'}.`
      );
    }

    els.importTodoistWarnings.hidden = warnings.length === 0;
    els.importTodoistWarnings.innerHTML =
      warnings.length === 0 ? '' : `<ul>${warnings.map((w) => `<li>${w}</li>`).join('')}</ul>`;

    renderImportTagsSection(tagMatches || []);
  }

  function renderAll() {
    renderSidebar();
    renderToolbarState();
    applyTheme();
    const state = store.getState();
    const screen = state.ui.screen;
    els.tasksScreen.hidden = screen !== 'tasks';
    els.campaignsView.hidden = screen !== 'campaigns';
    els.campaignDetailView.hidden = screen !== 'campaignDetail';
    if (screen === 'campaigns') {
      renderCampaignsList();
    } else if (screen === 'campaignDetail') {
      renderCampaignDetail();
    } else if (state.ui.view === 'list') {
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
    updateBoardDotsActive,
    renderImportPreview,
    renderCampaignProjectOptions,
    renderCampaignSessionOptions,
    renderCampaignImportPreview,
    renderCampaignsList,
    renderCampaignDetail
  };
})(window.App = window.App || {});
