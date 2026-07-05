(function (App) {
  const { store, render, auth, migrate, api, utils } = App;

  // Autenticação
  const authLoadingScreen = document.getElementById('authLoadingScreen');
  const authScreen = document.getElementById('authScreen');
  const appEl = document.querySelector('.app');
  const authForm = document.getElementById('authForm');
  const authFormTitle = document.getElementById('authFormTitle');
  const authFormError = document.getElementById('authFormError');
  const authEmailInput = document.getElementById('authEmail');
  const authPasswordInput = document.getElementById('authPassword');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authSwitchText = document.getElementById('authSwitchText');
  const authSwitchBtn = document.getElementById('authSwitchBtn');

  const projectListEl = document.getElementById('projectList');
  const tagListEl = document.getElementById('tagList');
  const favoritesListEl = document.getElementById('favoritesList');
  const newTagBtn = document.getElementById('newTagBtn');
  const periodTabs = document.getElementById('periodTabs');
  const viewToggle = document.getElementById('viewToggle');
  const newTaskBtn = document.getElementById('newTaskBtn');
  const newProjectBtn = document.getElementById('newProjectBtn');
  const listView = document.getElementById('listView');
  const boardView = document.getElementById('boardView');
  const groupByProjectToggleBtn = document.getElementById('groupByProjectToggleBtn');
  const showCompletedToggleBtn = document.getElementById('showCompletedToggleBtn');

  // Busca (desktop: ícone + barra na toolbar; mobile: aba "Buscar" do rodapé)
  const searchToggleBtn = document.getElementById('searchToggleBtn');
  const desktopSearchBar = document.getElementById('desktopSearchBar');
  const desktopSearchInput = document.getElementById('desktopSearchInput');
  const desktopSearchCloseBtn = document.getElementById('desktopSearchCloseBtn');
  const mobileSearchBar = document.getElementById('mobileSearchBar');
  const mobileSearchInput = document.getElementById('mobileSearchInput');

  // Navegação mobile (rodapé, sidebar como painel "Navegar", menu de período)
  const sidebarEl = document.querySelector('.sidebar');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const mobileBoardToggleBtn = document.getElementById('mobileBoardToggleBtn');
  const periodMenuBtn = document.getElementById('periodMenuBtn');
  const periodMenu = document.getElementById('periodMenu');
  const groupByProjectMenuBtn = document.getElementById('groupByProjectMenuBtn');
  const showCompletedMenuBtn = document.getElementById('showCompletedMenuBtn');
  const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn');

  // Painel "Navegar": linha de conta (avatar + nome + menu de engrenagem)
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const sidebarAccountName = document.getElementById('sidebarAccountName');
  const accountMenuBtn = document.getElementById('accountMenuBtn');
  const accountMenu = document.getElementById('accountMenu');
  const accountThemeBtn = document.getElementById('accountThemeBtn');
  const accountAdminBtn = document.getElementById('accountAdminBtn');
  const accountLogoutBtn = document.getElementById('accountLogoutBtn');

  // Modal "Minha conta" (nome, foto, senha)
  const accountModal = document.getElementById('accountModal');
  const accountForm = document.getElementById('accountForm');
  const accountFormError = document.getElementById('accountFormError');
  const accountAvatarPreviewBtn = document.getElementById('accountAvatarPreviewBtn');
  const accountAvatarLetter = document.getElementById('accountAvatarLetter');
  const accountAvatarInput = document.getElementById('accountAvatarInput');
  const accountNameInput = document.getElementById('accountNameInput');
  const accountNewPasswordInput = document.getElementById('accountNewPasswordInput');
  const accountConfirmPasswordInput = document.getElementById('accountConfirmPasswordInput');
  const accountCancelBtn = document.getElementById('accountCancelBtn');
  const accountSaveBtn = document.getElementById('accountSaveBtn');

  // Integrações (tokens de API)
  const apiTokenList = document.getElementById('apiTokenList');
  const newTokenNameInput = document.getElementById('newTokenNameInput');
  const newTokenProject = document.getElementById('newTokenProject');
  const newTokenSession = document.getElementById('newTokenSession');
  const addTokenBtn = document.getElementById('addTokenBtn');
  const tokenRevealModal = document.getElementById('tokenRevealModal');
  const tokenRevealInput = document.getElementById('tokenRevealInput');
  const tokenCopyBtn = document.getElementById('tokenCopyBtn');
  const tokenRevealCloseBtn = document.getElementById('tokenRevealCloseBtn');

  let currentUser = null;
  let currentProfile = null;
  let pendingAvatarFile = null;

  // Modal de tarefa
  const taskModal = document.getElementById('taskModal');
  const taskForm = document.getElementById('taskForm');
  const taskModalTitle = document.getElementById('taskModalTitle');
  const taskIdInput = document.getElementById('taskId');
  const taskTitleInput = document.getElementById('taskTitle');
  const taskProjectSelect = document.getElementById('taskProject');
  const taskSessionSelect = document.getElementById('taskSession');
  const taskRecurringInput = document.getElementById('taskRecurring');
  const taskDueDateInput = document.getElementById('taskDueDate');
  const taskDueDateRow = document.getElementById('taskDueDateRow');
  const taskCancelBtn = document.getElementById('taskCancelBtn');
  const taskSubtaskList = document.getElementById('taskSubtaskList');
  const taskNewSubtaskInput = document.getElementById('taskNewSubtaskInput');
  const taskAddSubtaskBtn = document.getElementById('taskAddSubtaskBtn');
  const taskTagList = document.getElementById('taskTagList');
  const taskTagSuggest = document.getElementById('taskTagSuggest');

  // Subtarefas digitadas antes de a tarefa mãe existir de verdade (modo
  // "criar"); só viram tarefas reais depois que a tarefa mãe for salva.
  let pendingNewSubtasks = [];
  // Mesma ideia para etiquetas escolhidas/criadas via "@" antes de salvar.
  let pendingNewTagIds = [];

  // Modal de projeto
  const projectModal = document.getElementById('projectModal');
  const projectForm = document.getElementById('projectForm');
  const projectModalTitle = document.getElementById('projectModalTitle');
  const projectIdInput = document.getElementById('projectId');
  const projectNameInput = document.getElementById('projectName');
  const projectColorInput = document.getElementById('projectColor');
  const projectCancelBtn = document.getElementById('projectCancelBtn');
  const projectDeleteBtn = document.getElementById('projectDeleteBtn');
  const projectSessionEditor = document.getElementById('projectSessionEditor');
  const projectSessionList = document.getElementById('projectSessionList');
  const projectNewSessionInput = document.getElementById('projectNewSessionInput');
  const projectAddSessionBtn = document.getElementById('projectAddSessionBtn');

  // Modal de etiqueta
  const tagModal = document.getElementById('tagModal');
  const tagForm = document.getElementById('tagForm');
  const tagModalTitle = document.getElementById('tagModalTitle');
  const tagIdInput = document.getElementById('tagId');
  const tagNameInput = document.getElementById('tagName');
  const tagColorInput = document.getElementById('tagColor');
  const tagCancelBtn = document.getElementById('tagCancelBtn');
  const tagDeleteBtn = document.getElementById('tagDeleteBtn');

  function toggleDueDateRow() {
    const isRecurring = taskRecurringInput.checked;
    taskDueDateRow.style.display = isRecurring ? 'none' : '';
    // Sem isso, o campo fica "required" e vazio mesmo escondido — o
    // navegador bloqueia o submit em silêncio (não dá pra focar um campo
    // invisível pra mostrar o aviso), então salvar uma tarefa recorrente
    // parecia não fazer nada.
    if (isRecurring) {
      taskDueDateInput.removeAttribute('required');
    } else {
      taskDueDateInput.setAttribute('required', '');
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  // Mostra as subtarefas da tarefa em edição (vindas do store, ao vivo) ou,
  // no modo "criar", as subtarefas ainda só digitadas (pendingNewSubtasks).
  function renderModalSubtasks() {
    if (taskIdInput.value) {
      const subtasks = store.getSubtasks(taskIdInput.value);
      taskSubtaskList.innerHTML = subtasks
        .map(
          (s) => `
        <div class="subtask-editor-row ${s.status === 'done' ? 'done' : ''}" data-task-id="${s.id}">
          <input type="checkbox" data-toggle="${s.id}" ${s.status === 'done' ? 'checked' : ''}>
          <span class="subtask-editor-title">${escapeHtml(s.title)}</span>
          <button type="button" data-delete-task="${s.id}" title="Excluir">🗑️</button>
        </div>`
        )
        .join('');
    } else {
      taskSubtaskList.innerHTML = pendingNewSubtasks
        .map(
          (title, index) => `
        <div class="subtask-editor-row" data-pending-index="${index}">
          <span class="subtask-editor-title">${escapeHtml(title)}</span>
          <button type="button" data-remove-pending="${index}" title="Remover">🗑️</button>
        </div>`
        )
        .join('');
    }
  }

  function addSubtaskFromModal() {
    const title = taskNewSubtaskInput.value.trim();
    if (!title) return;
    if (taskIdInput.value) {
      store.addSubtask(taskIdInput.value, title);
    } else {
      pendingNewSubtasks.push(title);
    }
    taskNewSubtaskInput.value = '';
    renderModalSubtasks();
    taskNewSubtaskInput.focus();
  }

  // Mostra os chips de etiqueta já vinculados à tarefa em edição (vindos do
  // store, ao vivo) ou, no modo "criar", as escolhidas via "@" antes de
  // salvar (pendingNewTagIds) — mesmo papel do renderModalSubtasks acima.
  function renderModalTags() {
    const tags = taskIdInput.value
      ? store.getTaskTags(taskIdInput.value)
      : pendingNewTagIds.map((id) => store.getState().tags.find((t) => t.id === id)).filter(Boolean);
    taskTagList.innerHTML = tags
      .map(
        (tag) => `
      <span class="tag-chip" style="background:${tag.color}22;color:${tag.color}" data-tag-chip="${tag.id}">
        ${escapeHtml(tag.name)}
        <button type="button" data-remove-tag="${tag.id}" title="Remover">×</button>
      </span>`
      )
      .join('');
  }

  // Encontra o "@algo" (se houver) entre o último @ antes do cursor e o
  // próprio cursor, em #taskTitle. Um espaço encerra a menção.
  function currentMentionQuery() {
    const value = taskTitleInput.value;
    const caret = taskTitleInput.selectionStart;
    const atIndex = value.lastIndexOf('@', caret - 1);
    if (atIndex === -1) return null;
    const between = value.slice(atIndex + 1, caret);
    if (/\s/.test(between)) return null;
    return { atIndex, query: between };
  }

  function renderTagSuggestions() {
    const mention = currentMentionQuery();
    if (!mention) {
      taskTagSuggest.hidden = true;
      taskTagSuggest.innerHTML = '';
      return;
    }
    const query = mention.query.trim().toLowerCase();
    const allTags = store.getState().tags;
    const attachedIds = taskIdInput.value ? store.getTaskTags(taskIdInput.value).map((t) => t.id) : pendingNewTagIds;
    const matches = allTags.filter(
      (tag) => !attachedIds.includes(tag.id) && (!query || tag.name.toLowerCase().includes(query))
    );
    const exactMatch = allTags.some((tag) => tag.name.toLowerCase() === query);

    const items = matches
      .map(
        (tag) => `
      <button type="button" data-suggest-tag="${tag.id}"><span class="dot" style="background:${tag.color}"></span>${escapeHtml(tag.name)}</button>`
      )
      .join('');
    const createLabel = mention.query.trim();
    const createItem =
      createLabel && !exactMatch
        ? `<button type="button" data-suggest-create="${escapeHtml(createLabel)}">+ Criar etiqueta "${escapeHtml(createLabel)}"</button>`
        : '';

    if (!items && !createItem) {
      taskTagSuggest.hidden = true;
      taskTagSuggest.innerHTML = '';
      return;
    }
    taskTagSuggest.innerHTML = items + createItem;
    taskTagSuggest.hidden = false;
  }

  function attachTagToModal(tagId) {
    const mention = currentMentionQuery();
    if (mention) {
      const value = taskTitleInput.value;
      const caret = taskTitleInput.selectionStart;
      taskTitleInput.value = value.slice(0, mention.atIndex) + value.slice(caret);
      taskTitleInput.setSelectionRange(mention.atIndex, mention.atIndex);
    }
    if (taskIdInput.value) {
      store.addTagToTask(taskIdInput.value, tagId);
    } else if (!pendingNewTagIds.includes(tagId)) {
      pendingNewTagIds.push(tagId);
    }
    renderModalTags();
    taskTagSuggest.hidden = true;
    taskTagSuggest.innerHTML = '';
    taskTitleInput.focus();
  }

  // `forcedProjectId`: usado pelo botão "+ Adicionar tarefa" de cada coluna
  // do Painel, pra pré-selecionar o projeto daquela coluna em vez do filtro
  // atual da sidebar. Quando omitido, o comportamento de sempre continua.
  function openTaskModal(task, forcedProjectId, forcedSessionId) {
    taskForm.reset();
    pendingNewSubtasks = [];
    pendingNewTagIds = [];
    taskTagSuggest.hidden = true;
    taskTagSuggest.innerHTML = '';
    const state = store.getState();
    const defaultProject = task
      ? task.projectId
      : forcedProjectId !== undefined
      ? forcedProjectId
      : state.ui.projectFilter !== 'all'
      ? state.ui.projectFilter
      : '';
    const defaultSession = task ? task.sessionId : forcedSessionId !== undefined ? forcedSessionId : null;
    render.renderTaskProjectOptions(defaultProject);
    render.renderTaskSessionOptions(defaultProject || null, defaultSession);

    if (task) {
      taskModalTitle.textContent = 'Editar tarefa';
      taskIdInput.value = task.id;
      taskTitleInput.value = task.title;
      taskRecurringInput.checked = task.recurring;
      // Tarefas antigas sem data (não deveria mais acontecer daqui pra
      // frente) também ganham "hoje" como padrão ao serem editadas.
      taskDueDateInput.value = task.dueDate || (task.recurring ? '' : utils.todayISO());
    } else {
      taskModalTitle.textContent = 'Nova tarefa';
      taskIdInput.value = '';
      taskRecurringInput.checked = false;
      taskDueDateInput.value = utils.todayISO();
    }
    toggleDueDateRow();
    renderModalSubtasks();
    renderModalTags();
    taskModal.hidden = false;
    taskTitleInput.focus();
  }

  function closeTaskModal() {
    taskModal.hidden = true;
  }

  // Sessões só existem pra editar um projeto que já foi salvo (um projeto
  // novo ainda não tem id pra vincular sessões a ele).
  function renderProjectSessions() {
    if (!projectIdInput.value) return;
    const sessions = store.getSessionsForProject(projectIdInput.value);
    projectSessionList.innerHTML = sessions
      .map(
        (s) => `
      <div class="session-editor-row" data-session-id="${s.id}">
        <input type="text" class="session-editor-name-input" data-rename-session="${s.id}" value="${escapeHtml(s.name)}" maxlength="60">
        <button type="button" data-delete-session="${s.id}" title="Excluir">🗑️</button>
      </div>`
      )
      .join('');
  }

  function addSessionFromModal() {
    const name = projectNewSessionInput.value.trim();
    if (!name || !projectIdInput.value) return;
    store.addSession({ projectId: projectIdInput.value, name });
    projectNewSessionInput.value = '';
    projectNewSessionInput.focus();
  }

  function renderNewTokenProjectOptions() {
    const { projects } = store.getState();
    newTokenProject.innerHTML =
      `<option value="">Sem projeto</option>` + projects.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    renderNewTokenSessionOptions(newTokenProject.value || null);
  }

  function renderNewTokenSessionOptions(projectId) {
    const sessions = projectId ? store.getSessionsForProject(projectId) : [];
    newTokenSession.hidden = sessions.length === 0;
    newTokenSession.innerHTML =
      `<option value="">Sem sessão</option>` + sessions.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
  }

  function renderApiTokens() {
    const tokens = store.getApiTokens();
    const { projects } = store.getState();
    apiTokenList.innerHTML =
      tokens
        .map((t) => {
          const project = t.projectId ? projects.find((p) => p.id === t.projectId) : null;
          const session = project && t.sessionId ? store.getSessionsForProject(project.id).find((s) => s.id === t.sessionId) : null;
          const target = project ? escapeHtml(project.name) + (session ? ' / ' + escapeHtml(session.name) : '') : 'Sem projeto';
          const lastUsed = t.lastUsedAt ? `usado em ${new Date(t.lastUsedAt).toLocaleDateString('pt-BR')}` : 'nunca usado';
          return `
      <div class="session-editor-row" data-token-id="${t.id}">
        <span class="api-token-info">
          <strong>${escapeHtml(t.name)}</strong>
          <small>${target} · ${lastUsed}</small>
        </span>
        <button type="button" data-delete-token="${t.id}" title="Excluir">🗑️</button>
      </div>`;
        })
        .join('') || `<p class="empty-state" style="padding:4px 0;">Nenhum token criado ainda.</p>`;
  }

  async function addTokenFromModal() {
    const name = newTokenNameInput.value.trim();
    if (!name) {
      newTokenNameInput.focus();
      return;
    }
    addTokenBtn.disabled = true;
    const token = await store.createApiToken({
      name,
      projectId: newTokenProject.value || null,
      sessionId: newTokenSession.value || null
    });
    addTokenBtn.disabled = false;
    if (!token) return;
    newTokenNameInput.value = '';
    renderApiTokens();
    tokenRevealInput.value = token;
    tokenRevealModal.hidden = false;
  }

  function openProjectModal(project) {
    projectForm.reset();
    projectColorInput.value = project ? project.color : '#6c5ce7';
    if (project) {
      projectModalTitle.textContent = 'Editar projeto';
      projectIdInput.value = project.id;
      projectNameInput.value = project.name;
      projectDeleteBtn.hidden = false;
      projectSessionEditor.hidden = false;
      renderProjectSessions();
    } else {
      projectModalTitle.textContent = 'Novo projeto';
      projectIdInput.value = '';
      projectDeleteBtn.hidden = true;
      projectSessionEditor.hidden = true;
      projectSessionList.innerHTML = '';
    }
    projectModal.hidden = false;
    projectNameInput.focus();
  }

  function closeProjectModal() {
    projectModal.hidden = true;
  }

  function openTagModal(tag) {
    tagForm.reset();
    tagColorInput.value = tag ? tag.color : '#6c5ce7';
    if (tag) {
      tagModalTitle.textContent = 'Editar etiqueta';
      tagIdInput.value = tag.id;
      tagNameInput.value = tag.name;
      tagDeleteBtn.hidden = false;
    } else {
      tagModalTitle.textContent = 'Nova etiqueta';
      tagIdInput.value = '';
      tagDeleteBtn.hidden = true;
    }
    tagModal.hidden = false;
    tagNameInput.focus();
  }

  function closeTagModal() {
    tagModal.hidden = true;
  }

  // Fecha busca (desktop e mobile) e limpa o texto — usado sempre que o
  // usuário navega para outro filtro/aba.
  function closeAllSearch() {
    desktopSearchBar.hidden = true;
    desktopSearchInput.value = '';
    mobileSearchBar.hidden = true;
    mobileSearchInput.value = '';
    store.setSearchQuery('');
  }

  function selectProjectFilter(id) {
    store.setProjectFilter(id);
    closeAllSearch();
    setMobileNavActive(null);
    closeMobileSidebar();
  }

  // Etiqueta é um filtro global (não amarrado a projeto), mesma navegação
  // do filtro de projeto.
  function selectTagFilter(id) {
    store.setTagFilter(id);
    closeAllSearch();
    setMobileNavActive(null);
    closeMobileSidebar();
  }

  // Sidebar: seleção e edição de projetos
  projectListEl.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-project]');
    if (editBtn) {
      const project = render.projectById(editBtn.dataset.editProject);
      if (project) openProjectModal(project);
      return;
    }
    const favBtn = e.target.closest('[data-fav-project]');
    if (favBtn) {
      store.toggleProjectFavorite(favBtn.dataset.favProject);
      return;
    }
    const item = e.target.closest('[data-project]');
    if (item) selectProjectFilter(item.dataset.project);
  });

  // Sidebar: seleção, edição e favoritar etiquetas
  tagListEl.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-tag]');
    if (editBtn) {
      const tag = store.getState().tags.find((t) => t.id === editBtn.dataset.editTag);
      if (tag) openTagModal(tag);
      return;
    }
    const favBtn = e.target.closest('[data-fav-tag]');
    if (favBtn) {
      store.toggleTagFavorite(favBtn.dataset.favTag);
      return;
    }
    const item = e.target.closest('[data-tag]');
    if (item) selectTagFilter(item.dataset.tag);
  });

  // Sidebar: Favoritos (projetos e etiquetas fixados), sem ícones extras
  favoritesListEl.addEventListener('click', (e) => {
    const projectItem = e.target.closest('[data-project]');
    if (projectItem) {
      selectProjectFilter(projectItem.dataset.project);
      return;
    }
    const tagItem = e.target.closest('[data-tag]');
    if (tagItem) selectTagFilter(tagItem.dataset.tag);
  });

  periodTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-period]');
    if (btn) store.setPeriod(btn.dataset.period);
  });

  viewToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]');
    if (btn) store.setView(btn.dataset.view);
  });

  newTaskBtn.addEventListener('click', () => openTaskModal(null));
  newProjectBtn.addEventListener('click', () => openProjectModal(null));
  newTagBtn.addEventListener('click', () => openTagModal(null));

  // Navegação mobile: sidebar vira painel "Navegar", rodapé fixo, menu ⋮ de período
  function closeMobileSidebar() {
    sidebarEl.classList.remove('mobile-open');
  }

  function openMobileSidebar() {
    sidebarEl.classList.add('mobile-open');
  }

  function setMobileNavActive(tab) {
    mobileNavBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.mobileTab === tab));
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    store.setTheme(current === 'dark' ? 'light' : 'dark');
  }

  mobileBoardToggleBtn.addEventListener('click', () => {
    const current = store.getState().ui.view;
    store.setView(current === 'board' ? 'list' : 'board');
  });

  groupByProjectToggleBtn.addEventListener('click', () => {
    store.setGroupByProject(!store.getState().ui.groupByProject);
  });

  showCompletedToggleBtn.addEventListener('click', () => {
    store.setShowCompleted(!store.getState().ui.showCompleted);
  });

  groupByProjectMenuBtn.addEventListener('click', () => {
    store.setGroupByProject(!store.getState().ui.groupByProject);
  });

  showCompletedMenuBtn.addEventListener('click', () => {
    store.setShowCompleted(!store.getState().ui.showCompleted);
  });

  periodMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    periodMenu.hidden = !periodMenu.hidden;
  });

  periodMenu.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-period]');
    if (btn) {
      store.setPeriod(btn.dataset.period);
      periodMenu.hidden = true;
    }
  });

  accountMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    accountMenu.hidden = !accountMenu.hidden;
  });

  accountThemeBtn.addEventListener('click', () => {
    toggleTheme();
    accountMenu.hidden = true;
  });

  accountLogoutBtn.addEventListener('click', () => {
    accountMenu.hidden = true;
    auth.signOut();
  });

  document.addEventListener('click', (e) => {
    if (!periodMenu.hidden && !e.target.closest('#periodMenuBtn') && !e.target.closest('#periodMenu')) {
      periodMenu.hidden = true;
    }
    if (!accountMenu.hidden && !e.target.closest('#accountMenuBtn') && !e.target.closest('#accountMenu')) {
      accountMenu.hidden = true;
    }
    const openTaskMenu = document.querySelector('.task-menu:not([hidden])');
    if (openTaskMenu && !e.target.closest('.task-menu-wrap')) {
      render.closeTaskMenu();
    }
  });

  // Modal "Minha conta": editar nome, foto e senha
  function openAccountModal() {
    pendingAvatarFile = null;
    accountForm.reset();
    accountFormError.hidden = true;
    accountFormError.classList.remove('info');

    const displayName = (currentProfile && currentProfile.display_name) || currentUser.email.split('@')[0];
    const avatarUrl = currentProfile && currentProfile.avatar_url;
    accountNameInput.value = displayName;
    setAvatarBackground(accountAvatarPreviewBtn, avatarUrl);
    accountAvatarLetter.textContent = avatarUrl ? '' : displayName.charAt(0).toUpperCase();

    renderNewTokenProjectOptions();
    renderApiTokens();
    store.loadApiTokens().then(renderApiTokens);

    accountModal.hidden = false;
  }

  function closeAccountModal() {
    accountModal.hidden = true;
  }

  sidebarAvatar.addEventListener('click', openAccountModal);
  accountCancelBtn.addEventListener('click', closeAccountModal);

  accountModal.addEventListener('click', (e) => {
    if (e.target === accountModal) closeAccountModal();
  });

  newTokenProject.addEventListener('change', () => {
    renderNewTokenSessionOptions(newTokenProject.value || null);
  });

  addTokenBtn.addEventListener('click', addTokenFromModal);

  apiTokenList.addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-delete-token]');
    if (delBtn && confirm('Excluir este token? Qualquer integração usando ele vai parar de funcionar.')) {
      store.deleteApiToken(delBtn.dataset.deleteToken);
      renderApiTokens();
    }
  });

  tokenCopyBtn.addEventListener('click', () => {
    tokenRevealInput.select();
    navigator.clipboard.writeText(tokenRevealInput.value).catch(() => {
      document.execCommand('copy');
    });
  });

  tokenRevealCloseBtn.addEventListener('click', () => {
    tokenRevealModal.hidden = true;
    tokenRevealInput.value = '';
  });

  tokenRevealModal.addEventListener('click', (e) => {
    if (e.target === tokenRevealModal) {
      tokenRevealModal.hidden = true;
      tokenRevealInput.value = '';
    }
  });

  accountAvatarPreviewBtn.addEventListener('click', () => accountAvatarInput.click());

  accountAvatarInput.addEventListener('change', () => {
    const file = accountAvatarInput.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      accountFormError.hidden = false;
      accountFormError.textContent = 'A imagem deve ter no máximo 2MB.';
      accountAvatarInput.value = '';
      return;
    }
    pendingAvatarFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      accountAvatarPreviewBtn.style.backgroundImage = `url("${reader.result}")`;
      accountAvatarLetter.textContent = '';
    };
    reader.readAsDataURL(file);
  });

  accountForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    accountFormError.hidden = true;
    accountFormError.classList.remove('info');

    const newPassword = accountNewPasswordInput.value;
    const confirmPassword = accountConfirmPasswordInput.value;
    if (newPassword && newPassword !== confirmPassword) {
      accountFormError.hidden = false;
      accountFormError.textContent = 'As senhas não coincidem.';
      return;
    }

    accountSaveBtn.disabled = true;
    try {
      let avatarUrl = currentProfile && currentProfile.avatar_url;
      if (pendingAvatarFile) {
        avatarUrl = await api.uploadAvatar(currentUser.id, pendingAvatarFile);
      }

      const displayName = accountNameInput.value.trim();
      const { data: updatedProfile, error } = await api.updateProfile(currentUser.id, {
        displayName: displayName || null,
        avatarUrl
      });
      if (error) throw error;
      currentProfile = updatedProfile;

      if (newPassword) {
        const { error: passwordError } = await auth.updatePassword(newPassword);
        if (passwordError) throw passwordError;
      }

      pendingAvatarFile = null;
      renderAccountDisplay();
      closeAccountModal();
    } catch (err) {
      console.error('Falha ao salvar a conta', err);
      accountFormError.hidden = false;
      accountFormError.textContent = 'Não foi possível salvar. Tente novamente.';
    } finally {
      accountSaveBtn.disabled = false;
    }
  });

  mobileNavBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.mobileTab;
      setMobileNavActive(tab);
      if (tab === 'today') {
        closeAllSearch();
        closeMobileSidebar();
        store.setProjectFilter('all');
        store.setPeriod('today');
      } else if (tab === 'upcoming') {
        closeAllSearch();
        closeMobileSidebar();
        store.setProjectFilter('all');
        store.setPeriod('week');
      } else if (tab === 'search') {
        closeMobileSidebar();
        boardView.hidden = true;
        listView.hidden = false;
        mobileSearchBar.hidden = false;
        mobileSearchInput.focus();
      } else if (tab === 'browse') {
        closeAllSearch();
        const view = store.getState().ui.view;
        listView.hidden = view !== 'list';
        boardView.hidden = view !== 'board';
        openMobileSidebar();
      }
    });
  });

  sidebarToggleBtn.addEventListener('click', () => {
    appEl.classList.toggle('sidebar-collapsed');
    sidebarToggleBtn.textContent = appEl.classList.contains('sidebar-collapsed') ? '»' : '«';
  });

  const darkSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  darkSchemeQuery.addEventListener('change', () => {
    if (store.getState().ui.theme === 'system') render.applyTheme();
  });
  taskCancelBtn.addEventListener('click', closeTaskModal);
  projectCancelBtn.addEventListener('click', closeProjectModal);
  tagCancelBtn.addEventListener('click', closeTagModal);
  taskRecurringInput.addEventListener('change', toggleDueDateRow);

  // Trocar de projeto dentro do modal atualiza as sessões disponíveis
  // (cada sessão pertence a um projeto só).
  taskProjectSelect.addEventListener('change', () => {
    render.renderTaskSessionOptions(taskProjectSelect.value || null, null);
  });

  // Subtarefas dentro do modal de tarefa
  taskAddSubtaskBtn.addEventListener('click', addSubtaskFromModal);
  taskNewSubtaskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubtaskFromModal();
    }
  });

  taskSubtaskList.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      store.toggleComplete(toggle.dataset.toggle);
      return;
    }
    const delBtn = e.target.closest('[data-delete-task]');
    if (delBtn) {
      store.deleteTask(delBtn.dataset.deleteTask);
      return;
    }
    const removeBtn = e.target.closest('[data-remove-pending]');
    if (removeBtn) {
      pendingNewSubtasks.splice(Number(removeBtn.dataset.removePending), 1);
      renderModalSubtasks();
    }
  });

  // Etiquetas dentro do modal de tarefa: menção "@" no título + chips
  taskTitleInput.addEventListener('input', renderTagSuggestions);
  taskTitleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !taskTagSuggest.hidden) {
      taskTagSuggest.hidden = true;
      taskTagSuggest.innerHTML = '';
    }
  });
  taskTitleInput.addEventListener('blur', () => {
    // Delay pra não esconder antes do mousedown na sugestão poder rodar.
    setTimeout(() => {
      taskTagSuggest.hidden = true;
    }, 150);
  });

  taskTagSuggest.addEventListener('mousedown', (e) => {
    // mousedown (não click) evita que o input perca o foco/dispare blur
    // antes da seleção ser processada.
    e.preventDefault();
    const createBtn = e.target.closest('[data-suggest-create]');
    if (createBtn) {
      store.addTag({ name: createBtn.dataset.suggestCreate, color: '#6c5ce7' }).then((newTag) => {
        if (newTag) attachTagToModal(newTag.id);
      });
      return;
    }
    const suggestBtn = e.target.closest('[data-suggest-tag]');
    if (suggestBtn) attachTagToModal(suggestBtn.dataset.suggestTag);
  });

  taskTagList.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('[data-remove-tag]');
    if (!removeBtn) return;
    const tagId = removeBtn.dataset.removeTag;
    if (taskIdInput.value) {
      store.removeTagFromTask(taskIdInput.value, tagId);
    } else {
      pendingNewTagIds = pendingNewTagIds.filter((id) => id !== tagId);
      renderModalTags();
    }
  });

  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) closeTaskModal();
  });
  projectModal.addEventListener('click', (e) => {
    if (e.target === projectModal) closeProjectModal();
  });
  tagModal.addEventListener('click', (e) => {
    if (e.target === tagModal) closeTagModal();
  });

  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
      title: taskTitleInput.value,
      projectId: taskProjectSelect.value || null,
      sessionId: taskSessionSelect.value || null,
      dueDate: taskDueDateInput.value || null,
      recurring: taskRecurringInput.checked
    };
    if (!payload.title.trim()) return;
    if (taskIdInput.value) {
      store.updateTask(taskIdInput.value, payload);
    } else if (pendingNewSubtasks.length || pendingNewTagIds.length) {
      const subtaskTitles = pendingNewSubtasks.slice();
      const tagIds = pendingNewTagIds.slice();
      store.addTask(payload).then((newTask) => {
        if (!newTask) return;
        subtaskTitles.forEach((title) => store.addSubtask(newTask.id, title));
        tagIds.forEach((tagId) => store.addTagToTask(newTask.id, tagId));
      });
    } else {
      store.addTask(payload);
    }
    closeTaskModal();
  });

  projectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = { name: projectNameInput.value, color: projectColorInput.value };
    if (!payload.name.trim()) return;
    if (projectIdInput.value) {
      store.updateProject(projectIdInput.value, payload);
    } else {
      store.addProject(payload);
    }
    closeProjectModal();
  });

  projectDeleteBtn.addEventListener('click', () => {
    const id = projectIdInput.value;
    if (!id) return;
    const project = render.projectById(id);
    const ok = confirm(`Excluir o projeto "${project ? project.name : ''}"? As tarefas desse projeto também serão excluídas.`);
    if (ok) {
      store.deleteProject(id);
      closeProjectModal();
    }
  });

  // Sessões dentro do modal de "Editar projeto"
  projectAddSessionBtn.addEventListener('click', addSessionFromModal);
  projectNewSessionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSessionFromModal();
    }
  });

  projectSessionList.addEventListener('change', (e) => {
    const input = e.target.closest('[data-rename-session]');
    if (!input) return;
    const name = input.value.trim();
    if (!name) {
      renderProjectSessions();
      return;
    }
    store.updateSession(input.dataset.renameSession, { name });
  });

  projectSessionList.addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-delete-session]');
    if (!delBtn) return;
    if (confirm('Excluir esta sessão? As tarefas dela ficam sem sessão.')) {
      store.deleteSession(delBtn.dataset.deleteSession);
    }
  });

  tagForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = { name: tagNameInput.value, color: tagColorInput.value };
    if (!payload.name.trim()) return;
    if (tagIdInput.value) {
      store.updateTag(tagIdInput.value, payload);
    } else {
      store.addTag(payload);
    }
    closeTagModal();
  });

  tagDeleteBtn.addEventListener('click', () => {
    const id = tagIdInput.value;
    if (!id) return;
    const tag = store.getState().tags.find((t) => t.id === id);
    const ok = confirm(`Excluir a etiqueta "${tag ? tag.name : ''}"? Ela será removida de todas as tarefas vinculadas.`);
    if (ok) {
      store.deleteTag(id);
      closeTagModal();
    }
  });

  // Busca: ícone de lupa no desktop e aba "Buscar" no rodapé mobile
  function openDesktopSearch() {
    desktopSearchBar.hidden = false;
    desktopSearchInput.focus();
  }

  searchToggleBtn.addEventListener('click', () => {
    if (desktopSearchBar.hidden) openDesktopSearch();
    else closeAllSearch();
  });
  desktopSearchCloseBtn.addEventListener('click', closeAllSearch);
  desktopSearchInput.addEventListener('input', () => store.setSearchQuery(desktopSearchInput.value));
  mobileSearchInput.addEventListener('input', () => store.setSearchQuery(mobileSearchInput.value));

  // Menu "⋯" da tarefa (Editar/Data/Excluir): compartilhado entre Lista e
  // Painel, já que os dois usam os mesmos atributos data-menu-*.
  function handleTaskMenuClick(e) {
    const menuToggle = e.target.closest('[data-menu-toggle]');
    if (menuToggle) {
      render.toggleTaskMenu(menuToggle.dataset.menuToggle);
      return true;
    }
    const menuEdit = e.target.closest('[data-menu-edit]');
    if (menuEdit) {
      const task = store.getState().tasks.find((t) => t.id === menuEdit.dataset.menuEdit);
      if (task) openTaskModal(task);
      render.closeTaskMenu();
      return true;
    }
    const menuDelete = e.target.closest('[data-menu-delete]');
    if (menuDelete) {
      if (confirm('Excluir esta tarefa?')) store.deleteTask(menuDelete.dataset.menuDelete);
      return true;
    }
    return false;
  }

  function handleTaskMenuDateChange(e) {
    const dateInput = e.target.closest('[data-menu-date]');
    if (!dateInput) return;
    const id = dateInput.dataset.menuDate;
    const task = store.getState().tasks.find((t) => t.id === id);
    if (!task) return;
    store.updateTask(id, {
      title: task.title,
      projectId: task.projectId,
      recurring: task.recurring,
      dueDate: dateInput.value || null
    });
    render.closeTaskMenu();
  }

  // Lista: concluir, editar, excluir, expandir/adicionar subtarefas
  listView.addEventListener('click', (e) => {
    if (handleTaskMenuClick(e)) return;
    const expandBtn = e.target.closest('[data-toggle-subtasks]');
    if (expandBtn) {
      render.toggleTaskExpanded(expandBtn.dataset.toggleSubtasks);
      return;
    }
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      store.toggleComplete(toggle.dataset.toggle);
      return;
    }
    const delBtn = e.target.closest('[data-delete-task]');
    if (delBtn) {
      if (confirm('Excluir esta tarefa?')) store.deleteTask(delBtn.dataset.deleteTask);
    }
  });

  listView.addEventListener('change', handleTaskMenuDateChange);

  listView.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-add-subtask]');
    if (!form) return;
    e.preventDefault();
    const input = form.querySelector('input');
    const title = input.value.trim();
    if (!title) return;
    store.addSubtask(form.dataset.addSubtask, title);
    input.value = '';
  });

  // Painel: concluir, editar, excluir, expandir/adicionar subtarefas
  // (colunas por projeto, geradas dinamicamente)
  boardView.addEventListener('click', (e) => {
    if (handleTaskMenuClick(e)) return;
    const expandBtn = e.target.closest('[data-toggle-subtasks]');
    if (expandBtn) {
      render.toggleTaskExpanded(expandBtn.dataset.toggleSubtasks);
      return;
    }
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      store.toggleComplete(toggle.dataset.toggle);
      return;
    }
    const delBtn = e.target.closest('[data-delete-task]');
    if (delBtn) {
      if (confirm('Excluir esta tarefa?')) store.deleteTask(delBtn.dataset.deleteTask);
      return;
    }
    const addTaskBtn = e.target.closest('[data-add-task-project]');
    if (addTaskBtn) {
      openTaskModal(null, addTaskBtn.dataset.addTaskProject, addTaskBtn.dataset.addTaskSession || null);
      return;
    }
    if (e.target.closest('.subtask-panel') || e.target.closest('.task-menu')) return;
    const card = e.target.closest('.board-card');
    if (card) {
      const task = store.getState().tasks.find((t) => t.id === card.dataset.taskId);
      if (task) openTaskModal(task);
    }
  });

  boardView.addEventListener('change', handleTaskMenuDateChange);

  boardView.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-add-subtask]');
    if (!form) return;
    e.preventDefault();
    const input = form.querySelector('input');
    const title = input.value.trim();
    if (!title) return;
    store.addSubtask(form.dataset.addSubtask, title);
    input.value = '';
  });

  // Painel: arrastar (mouse ou toque) em qualquer ponto para rolar
  // horizontalmente, não só pela barra de rolagem física do navegador.
  // `onDragEnd` (opcional) roda só depois de um arraste de verdade.
  function enableDragScroll(el, { onDragEnd } = {}) {
    let isPointerDown = false;
    let dragged = false;
    let startX = 0;
    let startScrollLeft = 0;

    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      isPointerDown = true;
      dragged = false;
      startX = e.clientX;
      startScrollLeft = el.scrollLeft;
    });

    el.addEventListener('pointermove', (e) => {
      if (!isPointerDown) return;
      const delta = e.clientX - startX;
      if (dragged || Math.abs(delta) > 4) {
        dragged = true;
        el.classList.add('dragging');
        el.scrollLeft = startScrollLeft - delta;
      }
    });

    function endDrag() {
      const wasDragging = isPointerDown && dragged;
      isPointerDown = false;
      el.classList.remove('dragging');
      if (wasDragging && onDragEnd) onDragEnd();
    }
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointerleave', endDrag);
    el.addEventListener('pointercancel', endDrag);

    // Depois de um arraste de verdade, suprime o clique seguinte (fase de
    // captura, roda antes do listener de clique acima) para não abrir o
    // modal/marcar concluída sem querer por causa do gesto de arrastar.
    el.addEventListener(
      'click',
      (e) => {
        if (dragged) {
          e.stopPropagation();
          e.preventDefault();
          dragged = false;
        }
      },
      true
    );
  }

  const mobileCarouselQuery = window.matchMedia('(max-width: 600px)');

  enableDragScroll(boardView, {
    // No carrossel mobile (uma coluna = a tela toda), garante que sempre
    // pare encaixado numa coluna, mesmo se o scroll-snap do CSS não pegar
    // uma mudança de scrollLeft feita via script. No desktop (várias
    // colunas soltas) isso não roda, senão o arraste livre "grudaria" errado.
    onDragEnd: () => {
      if (!mobileCarouselQuery.matches) return;
      const width = boardView.clientWidth;
      if (!width) return;
      const index = Math.round(boardView.scrollLeft / width);
      boardView.scrollTo({ left: index * width, behavior: 'smooth' });
    }
  });

  // Mantém a bolinha ativa em dia durante qualquer scroll (arraste ou
  // nativo), sem precisar re-renderizar o Painel inteiro.
  boardView.addEventListener('scroll', () => {
    render.updateBoardDotsActive();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTaskModal();
      closeProjectModal();
      closeAccountModal();
      closeTagModal();
    }
  });

  // ---------------------------------------------------------------------
  // Autenticação: login/cadastro, logout, e boot da sessão
  // ---------------------------------------------------------------------

  let authMode = 'signin';
  let hasSubscribed = false;

  function ensureSubscribed() {
    if (hasSubscribed) return;
    hasSubscribed = true;
    store.subscribe(render.renderAll);
    // Mantém a lista de subtarefas/etiquetas do modal em dia com mudanças
    // assíncronas (ex.: rollback de uma mutação que falhou ao salvar).
    store.subscribe(() => {
      if (!taskModal.hidden && taskIdInput.value) {
        renderModalSubtasks();
        renderModalTags();
      }
      if (!projectModal.hidden && projectIdInput.value) {
        renderProjectSessions();
      }
    });
  }

  function showAuthLoading() {
    authLoadingScreen.hidden = false;
    authScreen.hidden = true;
    appEl.hidden = true;
  }

  function showAuthScreen() {
    authLoadingScreen.hidden = true;
    authScreen.hidden = false;
    appEl.hidden = true;
    authForm.reset();
  }

  function setAuthMode(mode) {
    authMode = mode;
    authFormError.hidden = true;
    authFormError.classList.remove('info');
    if (mode === 'signup') {
      authFormTitle.textContent = 'Criar conta';
      authSubmitBtn.textContent = 'Criar conta';
      authSwitchText.textContent = 'Já tem uma conta?';
      authSwitchBtn.textContent = 'Entrar';
    } else {
      authFormTitle.textContent = 'Bem-vindo(a) de volta!';
      authSubmitBtn.textContent = 'Entrar';
      authSwitchText.textContent = 'Não tem uma conta?';
      authSwitchBtn.textContent = 'Criar conta';
    }
  }

  function translateAuthError(message) {
    if (!message) return 'Ocorreu um erro. Tente novamente.';
    if (/invalid login credentials/i.test(message)) return 'E-mail ou senha inválidos.';
    if (/already registered/i.test(message) || /already exists/i.test(message)) return 'Este e-mail já está cadastrado.';
    if (/password should be at least/i.test(message)) return 'A senha precisa ter pelo menos 6 caracteres.';
    if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).';
    return message;
  }

  function setAvatarBackground(el, avatarUrl) {
    el.style.backgroundImage = avatarUrl ? `url("${avatarUrl}")` : '';
  }

  function renderAccountDisplay() {
    const displayName = (currentProfile && currentProfile.display_name) || currentUser.email.split('@')[0];
    const avatarUrl = currentProfile && currentProfile.avatar_url;
    sidebarAccountName.textContent = displayName;
    setAvatarBackground(sidebarAvatar, avatarUrl);
    sidebarAvatar.textContent = avatarUrl ? '' : displayName.charAt(0).toUpperCase();
  }

  async function enterApp(user) {
    showAuthLoading();
    try {
      const profile = await auth.getCurrentProfile(user.id);
      currentUser = user;
      currentProfile = profile;
      accountAdminBtn.hidden = !profile.is_admin;
      renderAccountDisplay();

      await migrate.migrateIfNeeded(user.id);
      ensureSubscribed();
      await store.loadInitialData(user.id);

      authLoadingScreen.hidden = true;
      authScreen.hidden = true;
      appEl.hidden = false;
      render.renderAll();
    } catch (err) {
      console.error('Falha ao carregar sessão/dados do usuário', err);
      authLoadingScreen.hidden = true;
      showAuthScreen();
    }
  }

  authSwitchBtn.addEventListener('click', () => {
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authFormError.hidden = true;
    authFormError.classList.remove('info');
    authSubmitBtn.disabled = true;
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;

    try {
      if (authMode === 'signup') {
        const { error } = await auth.signUp(email, password);
        if (error) throw error;
        authFormError.classList.add('info');
        authFormError.textContent = 'Conta criada! Verifique seu e-mail para confirmar antes de entrar.';
        authFormError.hidden = false;
      } else {
        const { error } = await auth.signIn(email, password);
        if (error) throw error;
        // onAuthStateChange cuida da transição para o app.
      }
    } catch (err) {
      authFormError.classList.remove('info');
      authFormError.textContent = translateAuthError(err.message);
      authFormError.hidden = false;
    } finally {
      authSubmitBtn.disabled = false;
    }
  });

  // Logout, tema e "Painel Admin" ficam no menu de engrenagem da linha de
  // conta (accountLogoutBtn/accountThemeBtn/accountAdminBtn), visibilidade
  // do admin controlada em enterApp conforme profile.is_admin.

  store.setAuthErrorHandler(() => {
    auth.signOut();
  });

  (async function boot() {
    const {
      data: { session }
    } = await auth.getSession();

    if (session && session.user) {
      await enterApp(session.user);
    } else {
      showAuthScreen();
    }

    auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_IN' && newSession && newSession.user) {
        enterApp(newSession.user);
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        currentProfile = null;
        store.clearState();
        showAuthScreen();
      }
    });
  })();
})(window.App = window.App || {});
