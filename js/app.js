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
  const quickFilters = document.getElementById('quickFilters');
  const viewToggle = document.getElementById('viewToggle');
  const newTaskBtn = document.getElementById('newTaskBtn');
  const newProjectBtn = document.getElementById('newProjectBtn');
  const importTodoistBtn = document.getElementById('importTodoistBtn');
  const importTodoistFileInput = document.getElementById('importTodoistFileInput');
  const importTodoistModal = document.getElementById('importTodoistModal');
  const importProjectNameInput = document.getElementById('importProjectName');
  const importTodoistCancelBtn = document.getElementById('importTodoistCancelBtn');
  const importTodoistConfirmBtn = document.getElementById('importTodoistConfirmBtn');
  const importTagsSection = document.getElementById('importTagsSection');

  // Tela "Campanhas" e modal de criação (com import de clientes via xlsx)
  const newCampaignBtn = document.getElementById('newCampaignBtn');
  const campaignsListEl = document.getElementById('campaignsListEl');
  const campaignCreateModal = document.getElementById('campaignCreateModal');
  const campaignNameInput = document.getElementById('campaignNameInput');
  const campaignKindSelect = document.getElementById('campaignKindSelect');
  const campaignVendasFields = document.getElementById('campaignVendasFields');
  const campaignCertFields = document.getElementById('campaignCertFields');
  const campaignAlertDaysInput = document.getElementById('campaignAlertDaysInput');
  const campaignTrialDaysInput = document.getElementById('campaignTrialDaysInput');
  const campaignProjectSelect = document.getElementById('campaignProjectSelect');
  const campaignSessionSelect = document.getElementById('campaignSessionSelect');
  const campaignFup1Date = document.getElementById('campaignFup1Date');
  const campaignFup2Date = document.getElementById('campaignFup2Date');
  const campaignFup3Date = document.getElementById('campaignFup3Date');
  const campaignFup1Message = document.getElementById('campaignFup1Message');
  const campaignFup2Message = document.getElementById('campaignFup2Message');
  const campaignFup3Message = document.getElementById('campaignFup3Message');
  const campaignChooseFileBtn = document.getElementById('campaignChooseFileBtn');
  const campaignImportFileInput = document.getElementById('campaignImportFileInput');
  const campaignImportFileName = document.getElementById('campaignImportFileName');
  const campaignImportTableBody = document.getElementById('campaignImportTableBody');
  const campaignImportWarnings = document.getElementById('campaignImportWarnings');
  const campaignImportTable = document.getElementById('campaignImportTable');
  const campaignCreateCancelBtn = document.getElementById('campaignCreateCancelBtn');
  const campaignCreateConfirmBtn = document.getElementById('campaignCreateConfirmBtn');
  const campaignDetailView = document.getElementById('campaignDetailView');
  const campaignAddClientModal = document.getElementById('campaignAddClientModal');
  const campaignAddClientForm = document.getElementById('campaignAddClientForm');
  const campaignAddClientName = document.getElementById('campaignAddClientName');
  const campaignAddClientPhone = document.getElementById('campaignAddClientPhone');
  const campaignAddClientNotes = document.getElementById('campaignAddClientNotes');
  const campaignAddClientCancelBtn = document.getElementById('campaignAddClientCancelBtn');

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
  // Estrutura parseada do .csv escolhido, em espera até o usuário confirmar
  // o import no modal de preview (ou cancelar, o que descarta ela).
  let pendingImportParsed = null;
  // Clientes parseados da planilha .xlsx escolhida no modal de criação de
  // campanha — a seleção via checkbox é lida direto do DOM na confirmação
  // (mesmo padrão de pendingImportParsed/data-import-tag-name).
  let pendingCampaignClients = null;

  // Modal de tarefa
  const taskModal = document.getElementById('taskModal');
  const taskForm = document.getElementById('taskForm');
  const taskModalTitle = document.getElementById('taskModalTitle');
  const taskIdInput = document.getElementById('taskId');
  const taskTitleInput = document.getElementById('taskTitle');
  const taskDescriptionInput = document.getElementById('taskDescription');
  const taskDescriptionToggle = document.getElementById('taskDescriptionToggle');
  const taskDescriptionLabel = document.getElementById('taskDescriptionLabel');
  const taskProjectSelect = document.getElementById('taskProject');
  const taskSessionSelect = document.getElementById('taskSession');
  const taskDueDateInput = document.getElementById('taskDueDate');
  const taskDueDateClearBtn = document.getElementById('taskDueDateClearBtn');
  const taskDueDateRow = document.getElementById('taskDueDateRow');
  const taskDueTimeInput = document.getElementById('taskDueTime');
  const taskRepeatSelect = document.getElementById('taskRepeat');
  const taskRepeatCustom = document.getElementById('taskRepeatCustom');
  const taskRepeatInterval = document.getElementById('taskRepeatInterval');
  const taskRepeatUnit = document.getElementById('taskRepeatUnit');
  const taskRepeatWeekdays = document.getElementById('taskRepeatWeekdays');
  const taskRepeatAnchor = document.getElementById('taskRepeatAnchor');
  const taskRepeatUntilToggle = document.getElementById('taskRepeatUntilToggle');
  const taskRepeatUntilRow = document.getElementById('taskRepeatUntilRow');
  const taskRepeatUntil = document.getElementById('taskRepeatUntil');
  const taskCancelBtn = document.getElementById('taskCancelBtn');
  const taskSubtaskList = document.getElementById('taskSubtaskList');
  const taskNewSubtaskInput = document.getElementById('taskNewSubtaskInput');
  const taskAddSubtaskBtn = document.getElementById('taskAddSubtaskBtn');
  const taskCommentSection = document.getElementById('taskCommentSection');
  const taskCommentList = document.getElementById('taskCommentList');
  const taskNewCommentInput = document.getElementById('taskNewCommentInput');
  const taskAddCommentBtn = document.getElementById('taskAddCommentBtn');
  const taskTagList = document.getElementById('taskTagList');
  const taskTagSuggest = document.getElementById('taskTagSuggest');
  const taskNlDateChip = document.getElementById('taskNlDateChip');
  const taskRepeatNlNote = document.getElementById('taskRepeatNlNote');

  // Subtarefas digitadas antes de a tarefa mãe existir de verdade (modo
  // "criar"); só viram tarefas reais depois que a tarefa mãe for salva.
  let pendingNewSubtasks = [];
  // Mesma ideia para etiquetas escolhidas/criadas via "@" antes de salvar.
  let pendingNewTagIds = [];

  // Estado do chip de sugestão de data/recorrência (App.nlDate) sobre o título.
  let pendingNlMatch = null; // resultado atual do App.nlDate.parse (null = sem match ou descartado)
  let dismissedNlText = null; // título no momento do ✕ — não sugere de novo até mudar
  let nlDateManualOverride = false; // true assim que qualquer campo de data/repetição é editado a mão
  let nlDateTouchedFields = new Set(); // subconjunto de {'dueDate','dueTime','repeat'} editado a mão nesta sessão
  let nlDateSnapshot = null; // valores dos campos ANTES da primeira aplicação automática (pro ✕ restaurar)
  let nlDateDebounceTimer = null;

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

  // Presets fixos do seletor "Repetir" — "Personalizar" só revela os
  // mesmos campos abaixo pra edição fina, não é um estado separado.
  // anchor sempre 'completed' nos presets (mesma convenção que a
  // recorrente "diária" antiga já usava, ver backfill da migration 0011).
  const REPEAT_PRESETS = {
    daily: { unit: 'daily', interval: 1 },
    weekly: { unit: 'weekly', interval: 1 },
    monthly: { unit: 'monthly', interval: 1 },
    yearly: { unit: 'monthly', interval: 12 }
  };

  function applyRepeatPreset(key) {
    const preset = REPEAT_PRESETS[key];
    taskRepeatUnit.value = preset.unit;
    taskRepeatInterval.value = preset.interval;
    taskRepeatWeekdays.querySelectorAll('input').forEach((cb) => {
      cb.checked = false;
    });
    taskRepeatAnchor.value = 'completed';
    taskRepeatUntilToggle.checked = false;
    taskRepeatUntil.value = '';
  }

  function toggleRepeatWeekdaysVisibility() {
    taskRepeatWeekdays.hidden = taskRepeatUnit.value !== 'weekly';
  }

  function toggleRepeatUntilRow() {
    taskRepeatUntilRow.hidden = !taskRepeatUntilToggle.checked;
  }

  function toggleRepeatCustom() {
    const value = taskRepeatSelect.value;
    taskRepeatCustom.hidden = value !== 'custom';
    if (value !== 'never' && value !== 'custom') {
      applyRepeatPreset(value);
    }
    toggleRepeatWeekdaysVisibility();
    toggleRepeatUntilRow();
  }

  // Monta o objeto recurrence (js/recurrence.js) a partir dos campos atuais
  // do modal — usado tanto pros presets quanto por "Personalizar", já que
  // os dois escrevem nos mesmos campos por baixo.
  function buildRecurrenceFromForm() {
    if (taskRepeatSelect.value === 'never') return null;
    const freq = taskRepeatUnit.value;
    const interval = Math.max(1, parseInt(taskRepeatInterval.value, 10) || 1);
    const rule = { freq, interval, anchor: taskRepeatAnchor.value };
    if (freq === 'weekly') {
      const days = Array.from(taskRepeatWeekdays.querySelectorAll('input:checked')).map((cb) => Number(cb.value));
      if (days.length > 0) rule.byWeekday = days;
    }
    if (taskRepeatUntilToggle.checked && taskRepeatUntil.value) rule.until = taskRepeatUntil.value;
    return rule;
  }

  // Caminho inverso de buildRecurrenceFromForm — usado ao abrir o modal
  // pra editar. Se a regra salva bate exatamente com um preset nomeado
  // (sem dias específicos, sem término, âncora padrão), mostra o preset;
  // senão cai em "Personalizar".
  function populateRepeatFields(recurrence) {
    if (!recurrence) {
      taskRepeatSelect.value = 'never';
      applyRepeatPreset('daily');
      toggleRepeatCustom();
      return;
    }

    taskRepeatUnit.value = recurrence.freq;
    taskRepeatInterval.value = recurrence.interval || 1;
    taskRepeatAnchor.value = recurrence.anchor || 'completed';
    taskRepeatWeekdays.querySelectorAll('input').forEach((cb) => {
      cb.checked = !!(recurrence.byWeekday && recurrence.byWeekday.includes(Number(cb.value)));
    });
    taskRepeatUntilToggle.checked = !!recurrence.until;
    taskRepeatUntil.value = recurrence.until || '';

    const isPlainPreset =
      !recurrence.byWeekday &&
      !recurrence.until &&
      recurrence.anchor === 'completed' &&
      ((recurrence.freq === 'daily' && recurrence.interval === 1) ||
        (recurrence.freq === 'weekly' && recurrence.interval === 1) ||
        (recurrence.freq === 'monthly' && (recurrence.interval === 1 || recurrence.interval === 12)));

    if (isPlainPreset) {
      taskRepeatSelect.value = recurrence.freq === 'monthly' && recurrence.interval === 12 ? 'yearly' : recurrence.freq;
    } else {
      taskRepeatSelect.value = 'custom';
    }
    toggleRepeatCustom();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  // App.recurrence.byMonthDay (numérico ou 'last') e byNthWeekday não têm
  // nenhum campo correspondente no formulário (populateRepeatFields/
  // buildRecurrenceFromForm só conhecem freq/interval/anchor/byWeekday/
  // until) — pra essas regras, os campos granulares não são preenchidos,
  // uma nota mostra a descrição em texto, e a regra do chip é salva como
  // está (ver runNlDateParse/applyNlDateToFields e o submit do form).
  function isRecurrenceFormRepresentable(rule) {
    return !rule || (!rule.byMonthDay && !rule.byNthWeekday);
  }

  function snapshotRepeatFields() {
    return {
      dueDate: taskDueDateInput.value,
      dueTime: taskDueTimeInput.value,
      repeatSelect: taskRepeatSelect.value,
      repeatInterval: taskRepeatInterval.value,
      repeatUnit: taskRepeatUnit.value,
      repeatWeekdays: Array.from(taskRepeatWeekdays.querySelectorAll('input')).map((cb) => cb.checked),
      repeatAnchor: taskRepeatAnchor.value,
      repeatUntilToggle: taskRepeatUntilToggle.checked,
      repeatUntil: taskRepeatUntil.value
    };
  }

  // Preenche due_date/due_time e, quando a regra cabe no formulário, os
  // campos granulares de repetição também — senão só mostra uma nota
  // (a regra em si continua sendo salva certa, ver o submit do form).
  // Tira um snapshot dos campos na primeira vez que aplica, pro ✕ poder
  // restaurar depois (ver restoreNlDateSnapshot).
  function applyNlDateToFields(parsed) {
    if (nlDateSnapshot === null) nlDateSnapshot = snapshotRepeatFields();
    if (parsed.dueDate) taskDueDateInput.value = parsed.dueDate;
    taskDueTimeInput.value = parsed.dueTime || '';
    if (isRecurrenceFormRepresentable(parsed.recurrence)) {
      populateRepeatFields(parsed.recurrence);
      taskRepeatNlNote.hidden = true;
      taskRepeatNlNote.textContent = '';
    } else {
      taskRepeatNlNote.hidden = false;
      taskRepeatNlNote.textContent = `Sugestão: ${parsed.description} — será aplicada ao salvar (os campos abaixo não representam esse tipo de regra).`;
    }
  }

  // Descartar o chip (✕) restaura os campos ao estado de antes da primeira
  // aplicação automática — exceto os que o usuário já tinha editado à mão,
  // esses ficam como o usuário deixou.
  function restoreNlDateSnapshot() {
    if (!nlDateSnapshot) return;
    if (!nlDateTouchedFields.has('dueDate')) taskDueDateInput.value = nlDateSnapshot.dueDate;
    if (!nlDateTouchedFields.has('dueTime')) taskDueTimeInput.value = nlDateSnapshot.dueTime;
    if (!nlDateTouchedFields.has('repeat')) {
      taskRepeatSelect.value = nlDateSnapshot.repeatSelect;
      taskRepeatInterval.value = nlDateSnapshot.repeatInterval;
      taskRepeatUnit.value = nlDateSnapshot.repeatUnit;
      Array.from(taskRepeatWeekdays.querySelectorAll('input')).forEach((cb, i) => {
        cb.checked = nlDateSnapshot.repeatWeekdays[i];
      });
      taskRepeatAnchor.value = nlDateSnapshot.repeatAnchor;
      taskRepeatUntilToggle.checked = nlDateSnapshot.repeatUntilToggle;
      taskRepeatUntil.value = nlDateSnapshot.repeatUntil;
      toggleRepeatCustom();
      taskRepeatNlNote.hidden = true;
      taskRepeatNlNote.textContent = '';
    }
  }

  function renderNlDateChip() {
    if (!pendingNlMatch) {
      taskNlDateChip.hidden = true;
      taskNlDateChip.innerHTML = '';
      taskNlDateChip.classList.remove('nldate-chip-warning');
      return;
    }
    const isWarning = pendingNlMatch.unsupported;
    const text = isWarning
      ? 'Recorrência por hora não suportada'
      : pendingNlMatch.recurrence
      ? `🔁 ${pendingNlMatch.description}`
      : pendingNlMatch.description;
    taskNlDateChip.classList.toggle('nldate-chip-warning', isWarning);
    taskNlDateChip.innerHTML = `
      <span class="nldate-chip-text">${escapeHtml(text)}</span>
      <button type="button" class="nldate-chip-dismiss" aria-label="Descartar sugestão">✕</button>`;
    taskNlDateChip.hidden = false;
  }

  function scheduleNlDateParse() {
    clearTimeout(nlDateDebounceTimer);
    nlDateDebounceTimer = setTimeout(runNlDateParse, 200);
  }

  function runNlDateParse() {
    const title = taskTitleInput.value;
    if (title === dismissedNlText) return;
    const parsed = App.nlDate.parse(title);
    pendingNlMatch = parsed.match ? parsed : null;
    renderNlDateChip();
    if (pendingNlMatch && !pendingNlMatch.unsupported && !nlDateManualOverride) {
      applyNlDateToFields(pendingNlMatch);
    }
  }

  // Reconfirma o match ativo no momento do submit — o debounce de 200ms
  // pode não ter rodado ainda se o usuário apertou Enter logo depois de
  // digitar a expressão; nesse caso reparsa na hora com o texto atual.
  function resolveActiveMatchForSubmit() {
    const title = taskTitleInput.value;
    if (title === dismissedNlText) return null;
    if (
      pendingNlMatch &&
      pendingNlMatch.match &&
      title.slice(pendingNlMatch.match.start, pendingNlMatch.match.end) === pendingNlMatch.match.raw
    ) {
      return pendingNlMatch;
    }
    const fresh = App.nlDate.parse(title);
    return fresh.match ? fresh : null;
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

  // Comentário tem created_at como timestamptz completo (não YYYY-MM-DD
  // como due_date) — utils.formatDateBR assume só data, não serve aqui.
  function formatCommentDate(iso) {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Comentários só existem depois que a tarefa mãe tem um id de verdade
  // (ver decisão de modo-criação em openTaskModal) — diferente de
  // subtarefas/etiquetas, não há lista "pendente" pré-salvar aqui. RLS
  // (task_comments_select_own) garante que todo comentário que chega até
  // aqui já é do próprio usuário, por isso o botão de excluir aparece em
  // todos, sem comparar user_id.
  function renderModalComments() {
    if (!taskIdInput.value) return;
    const comments = store.getComments(taskIdInput.value);
    taskCommentList.innerHTML = comments.length
      ? comments
          .map(
            (c) => `
        <div class="comment-row" data-comment-id="${c.id}">
          <div class="comment-row-header">
            <span class="comment-row-date">${escapeHtml(formatCommentDate(c.createdAt))}</span>
            <button type="button" data-delete-comment="${c.id}" title="Excluir">🗑️</button>
          </div>
          <div class="task-description-view">${escapeHtml(c.content)}</div>
        </div>`
          )
          .join('')
      : `<p class="empty-state" style="padding:4px 0;">Nenhum comentário ainda.</p>`;
  }

  function addCommentFromModal() {
    const content = taskNewCommentInput.value.trim();
    if (!content || !taskIdInput.value) return;
    store.addComment(taskIdInput.value, content);
    taskNewCommentInput.value = '';
    renderModalComments();
    taskNewCommentInput.focus();
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
  function openTaskModal(task, forcedProjectId, forcedSessionId, forcedDueDate) {
    taskForm.reset();
    pendingNewSubtasks = [];
    pendingNewTagIds = [];
    taskTagSuggest.hidden = true;
    taskTagSuggest.innerHTML = '';
    pendingNlMatch = null;
    dismissedNlText = null;
    nlDateManualOverride = false;
    nlDateTouchedFields = new Set();
    nlDateSnapshot = null;
    clearTimeout(nlDateDebounceTimer);
    renderNlDateChip();
    taskRepeatNlNote.hidden = true;
    taskRepeatNlNote.textContent = '';
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
      taskDescriptionInput.value = task.description || '';
      // Tarefa que já tem descrição salva abre com o campo já expandido
      // (senão o texto some da vista, apesar de continuar no valor real do
      // textarea) — só tarefa sem descrição nenhuma abre com o rótulo
      // colapsado "☰ Descrição".
      const hasDescription = !!task.description;
      taskDescriptionToggle.hidden = hasDescription;
      taskDescriptionLabel.hidden = !hasDescription;
      taskDueDateInput.value = task.dueDate || utils.todayISO();
      taskDueTimeInput.value = task.dueTime || '';
      populateRepeatFields(task.recurrence);
      // Tarefa existente já tem data/recorrência própria — o chip pode
      // aparecer (se o título for editado pra algo reconhecível), mas não
      // sobrescreve sozinho o que já foi definido intencionalmente antes.
      nlDateManualOverride = !!(task.dueDate || task.recurrence);
      taskCommentSection.hidden = false;
      taskCommentList.innerHTML = '';
      store.loadComments(task.id).then(renderModalComments);
    } else {
      taskModalTitle.textContent = 'Nova tarefa';
      taskIdInput.value = '';
      taskDescriptionToggle.hidden = false;
      taskDescriptionLabel.hidden = true;
      // Vazio por padrão: o usuário escolhe a data deliberadamente, ou
      // deixa em branco e salva sem data (já suportado no filtro/banco).
      // `forcedDueDate` (coluna de data do Painel) continua pré-preenchendo
      // como sugestão — só não inventa "hoje" quando não há sugestão nenhuma.
      taskDueDateInput.value = forcedDueDate || '';
      taskDueTimeInput.value = '';
      populateRepeatFields(null);
      taskCommentSection.hidden = true;
    }
    renderModalSubtasks();
    renderModalTags();
    // Sem foco automático de propósito: no mobile, focar o título ao abrir
    // dispara o teclado virtual só de visualizar a tarefa, dando a
    // impressão de que já está editando o nome. O usuário foca ao clicar
    // deliberadamente em algum campo.
    taskModal.hidden = false;
  }

  function closeTaskModal() {
    taskModal.hidden = true;
    clearTimeout(nlDateDebounceTimer);
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
        <span class="drag-handle" data-drag-handle title="Arrastar para reordenar">⠿</span>
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
      if (project) {
        closeMobileSidebar();
        openProjectModal(project);
      }
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
      if (tag) {
        closeMobileSidebar();
        openTagModal(tag);
      }
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

  // Atalhos "Hoje"/"Em breve" na lateral: mesma visão global de "Todas as
  // tarefas" + um período específico, saindo de qualquer projeto/etiqueta
  // filtrado no momento. "Recorrentes" é parecido, mas ignora período —
  // mostra toda tarefa recorrente de qualquer projeto (ver getFilteredTasks).
  quickFilters.addEventListener('click', (e) => {
    const periodBtn = e.target.closest('[data-quick-period]');
    if (periodBtn) {
      store.setProjectFilter('all');
      store.setPeriod(periodBtn.dataset.quickPeriod);
      closeAllSearch();
      setMobileNavActive(null);
      closeMobileSidebar();
      return;
    }
    if (e.target.closest('[data-quick-recurring]')) {
      store.setProjectFilter('all');
      store.setRecurringOnly(true);
      closeAllSearch();
      setMobileNavActive(null);
      closeMobileSidebar();
      return;
    }
    const screenBtn = e.target.closest('[data-quick-screen]');
    if (screenBtn) {
      store.setScreen(screenBtn.dataset.quickScreen);
      closeAllSearch();
      setMobileNavActive(null);
      closeMobileSidebar();
      if (!store.getState().campaignsLoaded) store.loadCampaigns();
    }
  });

  // Botão "Tentar de novo" do estado de erro (ver renderCampaignsList) —
  // delegado no container, já que o botão só existe no DOM quando há erro.
  // loadCampaigns() já se protege contra chamada concorrente sozinho, então
  // não precisa de guard aqui: sempre pode disparar de novo.
  campaignsListEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-campaigns-retry]')) {
      store.loadCampaigns();
      return;
    }
    const row = e.target.closest('[data-campaign-id]');
    if (row) store.openCampaignDetail(row.dataset.campaignId);
  });

  const showEncerradasToggle = document.getElementById('showEncerradasToggle');
  showEncerradasToggle.addEventListener('change', () => {
    store.setShowEncerradas(showEncerradasToggle.checked);
  });

  viewToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]');
    if (btn) store.setView(btn.dataset.view);
  });

  taskDescriptionToggle.addEventListener('click', () => {
    taskDescriptionToggle.hidden = true;
    taskDescriptionLabel.hidden = false;
    taskDescriptionInput.focus();
  });

  newTaskBtn.addEventListener('click', () => openTaskModal(null));
  newProjectBtn.addEventListener('click', () => {
    closeMobileSidebar();
    openProjectModal(null);
  });
  newTagBtn.addEventListener('click', () => {
    closeMobileSidebar();
    openTagModal(null);
  });

  // Import do Todoist: botão (agora dentro do menu da engrenagem) fecha o
  // menu e abre o seletor de arquivo escondido; escolher um .csv faz o
  // parsing (puro, js/importTodoist.js) e mostra o preview.
  importTodoistBtn.addEventListener('click', () => {
    accountMenu.hidden = true;
    closeMobileSidebar();
    importTodoistFileInput.click();
  });

  importTodoistFileInput.addEventListener('change', async () => {
    const file = importTodoistFileInput.files[0];
    importTodoistFileInput.value = '';
    if (!file) return;
    const text = await file.text();
    pendingImportParsed = App.importTodoist.parseTodoistExport(App.importTodoist.parseCsv(text));
    importProjectNameInput.value = file.name.replace(/\.csv$/i, '').replace(/_/g, ' ');
    const tagMatches = App.importTodoist.collectImportTagNames(pendingImportParsed, store.getState().tags);
    render.renderImportPreview(pendingImportParsed, tagMatches);
    importTodoistModal.hidden = false;
  });

  importTodoistCancelBtn.addEventListener('click', () => {
    importTodoistModal.hidden = true;
    pendingImportParsed = null;
  });

  importTodoistModal.addEventListener('click', (e) => {
    if (e.target === importTodoistModal) importTodoistCancelBtn.click();
  });

  importTodoistConfirmBtn.addEventListener('click', async () => {
    if (!pendingImportParsed) return;
    importTodoistConfirmBtn.disabled = true;
    importTodoistConfirmBtn.textContent = 'Importando...';
    // Escolha de cada etiqueta é lida direto do <select> no momento da
    // confirmação — não existe espelho em JS (mesmo princípio já usado
    // por importProjectNameInput.value nesta função).
    const tagChoices = [...importTagsSection.querySelectorAll('.import-tag-select')].map((select) => {
      const name = select.dataset.importTagName;
      return select.value === 'create'
        ? { name, action: 'create' }
        : { name, action: 'link', tagId: select.value.slice(4) }; // "tag:UUID" -> UUID
    });
    const result = await store.importTodoistProject(
      pendingImportParsed,
      importProjectNameInput.value.trim() || 'Importado do Todoist',
      tagChoices
    );
    importTodoistConfirmBtn.disabled = false;
    importTodoistConfirmBtn.textContent = 'Importar';
    if (result.ok) {
      importTodoistModal.hidden = true;
      pendingImportParsed = null;
    }
    // Erro: handleMutationError (store.js) já alertou; modal fica aberto
    // pra o usuário tentar de novo sem perder o preview/nome digitado.
  });

  function openCampaignCreateModal() {
    campaignNameInput.value = '';
    campaignKindSelect.value = 'vendas';
    campaignVendasFields.hidden = false;
    campaignCertFields.hidden = true;
    campaignAlertDaysInput.value = 45;
    campaignTrialDaysInput.value = 7;
    campaignFup1Date.value = '';
    campaignFup2Date.value = '';
    campaignFup3Date.value = '';
    campaignFup1Message.value = '';
    campaignFup2Message.value = '';
    campaignFup3Message.value = '';
    campaignImportFileName.textContent = '';
    campaignImportTableBody.innerHTML = '';
    campaignImportTable.hidden = true;
    campaignImportWarnings.hidden = true;
    pendingCampaignClients = null;
    render.renderCampaignProjectOptions(null);
    render.renderCampaignSessionOptions(null, null);
    campaignCreateModal.hidden = false;
  }

  function closeCampaignCreateModal() {
    campaignCreateModal.hidden = true;
    pendingCampaignClients = null;
  }

  // Modal simples de inserção manual de 1 cliente, aberto a partir do
  // botão no cabeçalho da tabela do detalhe da campanha — molde de
  // openTagModal/closeTagModal.
  function openCampaignAddClientModal() {
    campaignAddClientForm.reset();
    campaignAddClientModal.hidden = false;
    campaignAddClientName.focus();
  }

  function closeCampaignAddClientModal() {
    campaignAddClientModal.hidden = true;
  }

  newCampaignBtn.addEventListener('click', openCampaignCreateModal);
  campaignCreateCancelBtn.addEventListener('click', closeCampaignCreateModal);
  campaignCreateModal.addEventListener('click', (e) => {
    if (e.target === campaignCreateModal) closeCampaignCreateModal();
  });

  campaignAddClientCancelBtn.addEventListener('click', closeCampaignAddClientModal);
  campaignAddClientModal.addEventListener('click', (e) => {
    if (e.target === campaignAddClientModal) closeCampaignAddClientModal();
  });

  campaignAddClientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = campaignAddClientName.value.trim();
    if (!name) {
      campaignAddClientName.focus();
      return;
    }
    const campaignId = store.getState().ui.campaignDetailId;
    if (!campaignId) return;
    store.addCampaignClient(campaignId, {
      name,
      phone: campaignAddClientPhone.value.trim() || null,
      notes: campaignAddClientNotes.value.trim() || null
    });
    closeCampaignAddClientModal();
  });

  campaignProjectSelect.addEventListener('change', () => {
    render.renderCampaignSessionOptions(campaignProjectSelect.value || null, null);
  });

  campaignKindSelect.addEventListener('change', () => {
    const isCert = campaignKindSelect.value === 'certificados';
    campaignVendasFields.hidden = isCert;
    campaignCertFields.hidden = !isCert;
  });

  campaignChooseFileBtn.addEventListener('click', () => {
    // Pré-carrega em paralelo com a escolha do arquivo; erro real é tratado
    // no handler de 'change' abaixo (aqui é só uma otimização de tempo).
    App.importCampaigns.loadSheetJs().catch(() => {});
    campaignImportFileInput.click();
  });

  campaignImportFileInput.addEventListener('change', async () => {
    const file = campaignImportFileInput.files[0];
    campaignImportFileInput.value = '';
    if (!file) return;
    campaignImportFileName.textContent = 'Carregando...';
    try {
      await App.importCampaigns.loadSheetJs();
      const buffer = await file.arrayBuffer();
      const parsed = App.importCampaigns.parseWorkbook(buffer);
      pendingCampaignClients = parsed.clients;
      campaignImportFileName.textContent = file.name;
      render.renderCampaignImportPreview(parsed);
    } catch (err) {
      console.error('Falha ao importar planilha de clientes', err);
      campaignImportFileName.textContent = '';
      pendingCampaignClients = null;
      alert('Não foi possível ler a planilha. Verifique sua conexão com a internet (a leitura de .xlsx depende de uma biblioteca carregada por CDN) e se o arquivo é um .xlsx válido.');
    }
  });

  campaignCreateConfirmBtn.addEventListener('click', async () => {
    if (!campaignNameInput.value.trim()) {
      campaignNameInput.focus();
      return;
    }
    campaignCreateConfirmBtn.disabled = true;
    campaignCreateConfirmBtn.textContent = 'Criando...';

    // Seleção via checkbox é lida direto do DOM na confirmação, não
    // espelhada em array JS paralelo (mesmo padrão do import Todoist).
    const checkedIdx = [...campaignImportTableBody.querySelectorAll('[data-campaign-client-check]')]
      .filter((cb) => cb.checked)
      .map((cb) => Number(cb.dataset.campaignClientCheck));
    const clients = (pendingCampaignClients || []).filter((_, i) => checkedIdx.includes(i));

    const kind = campaignKindSelect.value;
    const fields = {
      name: campaignNameInput.value.trim(),
      kind,
      trialDays: Number(campaignTrialDaysInput.value) || 7,
      alertDays: kind === 'certificados' ? Number(campaignAlertDaysInput.value) || 45 : null,
      followupProjectId: campaignProjectSelect.value || null,
      followupSessionId: campaignSessionSelect.value || null,
      fup1Date: campaignFup1Date.value || null,
      fup2Date: campaignFup2Date.value || null,
      fup3Date: campaignFup3Date.value || null,
      fup1Message: utils.cleanWhatsAppText(campaignFup1Message.value.trim()) || null,
      fup2Message: utils.cleanWhatsAppText(campaignFup2Message.value.trim()) || null,
      fup3Message: utils.cleanWhatsAppText(campaignFup3Message.value.trim()) || null
    };

    const result = await store.createCampaignWithClients(fields, clients);
    campaignCreateConfirmBtn.disabled = false;
    campaignCreateConfirmBtn.textContent = 'Criar campanha';
    if (result.ok) closeCampaignCreateModal();
    // Erro: handleMutationError (store.js) já alertou; modal fica aberto
    // pra o usuário tentar de novo sem perder os campos preenchidos.
  });

  // Tela de detalhe da campanha: todo o conteúdo é re-renderizado via
  // innerHTML a cada mutação (renderCampaignDetail), então os listeners
  // ficam no container estático (nunca nos elementos internos, que são
  // recriados a cada render). Checkboxes seguem o mesmo padrão do
  // data-toggle de tarefa concluída: o mutador flipa o valor do store
  // direto, sem ler checkbox.checked (o re-render corrige a UI sozinho).
  campaignDetailView.addEventListener('click', (e) => {
    if (e.target.closest('[data-back-to-campaigns]')) {
      store.setScreen('campaigns');
      return;
    }

    if (e.target.closest('[data-open-add-client]')) {
      openCampaignAddClientModal();
      return;
    }

    const statusToggleBtn = e.target.closest('[data-campaign-status-toggle]');
    if (statusToggleBtn) {
      const id = statusToggleBtn.dataset.campaignStatusToggle;
      const campaign = store.getState().campaigns.find((c) => c.id === id);
      if (campaign) store.setCampaignStatus(id, campaign.status === 'ativa' ? 'encerrada' : 'ativa');
      return;
    }

    const deleteBtn = e.target.closest('[data-campaign-delete]');
    if (deleteBtn) {
      const id = deleteBtn.dataset.campaignDelete;
      const campaign = store.getState().campaigns.find((c) => c.id === id);
      const ok = confirm(`Excluir a campanha "${campaign ? campaign.name : ''}"? Os clientes dela também serão excluídos.`);
      if (ok) {
        store.deleteCampaign(id);
        store.setScreen('campaigns');
      }
      return;
    }

    const clientDeleteBtn = e.target.closest('[data-client-delete]');
    if (clientDeleteBtn) {
      const id = clientDeleteBtn.dataset.clientDelete;
      const client = store.getState().campaignClients.find((c) => c.id === id);
      const ok = confirm(`Excluir o cliente "${client ? client.name : ''}" desta campanha?`);
      if (ok) store.deleteCampaignClient(id);
      return;
    }

    const copyBtn = e.target.closest('[data-copy-message]');
    if (copyBtn) {
      const idx = copyBtn.dataset.copyMessage;
      const textarea = campaignDetailView.querySelector(`[data-message-idx="${idx}"]`);
      if (textarea) {
        textarea.select();
        navigator.clipboard.writeText(textarea.value).catch(() => {
          document.execCommand('copy');
        });
        const originalLabel = copyBtn.textContent;
        copyBtn.textContent = 'Copiado!';
        setTimeout(() => {
          copyBtn.textContent = originalLabel;
        }, 1500);
      }
      return;
    }

    const filterBtn = e.target.closest('[data-client-status-filter]');
    if (filterBtn) {
      store.setCampaignClientStatusFilter(filterBtn.dataset.clientStatusFilter);
      return;
    }

    const fupToggle = e.target.closest('[data-client-fup-toggle]');
    if (fupToggle) {
      const row = fupToggle.closest('[data-client-id]');
      if (!row) return;
      const client = store.getState().campaignClients.find((c) => c.id === row.dataset.clientId);
      if (!client) return;
      const field = `fup${fupToggle.dataset.clientFupToggle}Sent`;
      store.updateCampaignClientField(row.dataset.clientId, { [field]: !client[field] });
      return;
    }

    // Abrir o WhatsApp NÃO marca o FUP como enviado — só o usuário sabe se
    // a mensagem foi de fato mandada, então a marcação continua manual
    // (checkbox acima). O tooltip do botão (renderCampaignDetail) já avisa
    // qual FUP vai ser usado antes do clique.
    const waBtn = e.target.closest('[data-client-whatsapp]');
    if (waBtn) {
      const client = store.getState().campaignClients.find((c) => c.id === waBtn.dataset.clientWhatsapp);
      if (!client) return;
      const campaign = store.getState().campaigns.find((c) => c.id === client.campaignId);
      if (!campaign) return;

      const digits = (client.phone || '').replace(/\D/g, '');
      if (digits.length < 10) {
        alert('Celular inválido ou vazio para este cliente. Preencha um celular com DDD antes de enviar pelo WhatsApp.');
        return;
      }
      const phone = digits.startsWith('55') ? digits : `55${digits}`;

      // Certificados não tem régua de FUP — o botão só abre o contato, sem
      // mensagem pré-preenchida.
      let message = '';
      if (campaign.kind !== 'certificados') {
        const idx = utils.nextCampaignFollowupIndex(client);
        const template = campaign[`fup${idx}Message`] || '';
        // Personalização do [nome] acontece antes da higienização: o nome do
        // cliente também passa a fazer parte do texto limpo enviado.
        message = template.replace(/\[nome\]/gi, client.name);
      }

      window.open(utils.buildWhatsAppUrl(phone, message), '_blank');
    }
  });

  // change (não input): status/trial_start/MRR/notas só salvam ao sair do
  // campo — nunca durante a digitação. O app re-renderiza a tabela inteira
  // via innerHTML a cada mutação (é assim que as métricas do cabeçalho
  // recalculam sozinhas), então salvar em cada tecla destruiria o próprio
  // campo em edição no meio da digitação (perda de foco/cursor).
  campaignDetailView.addEventListener('change', (e) => {
    // Fica fora de uma linha de cliente (é campo do cabeçalho da campanha),
    // então é tratado antes do lookup de [data-client-id] abaixo.
    if (e.target.matches('[data-campaign-alert-days]')) {
      const campaignId = store.getState().ui.campaignDetailId;
      if (!campaignId) return;
      const clamped = Math.min(180, Math.max(1, Number(e.target.value) || 45));
      store.updateCampaignAlertDays(campaignId, clamped);
      return;
    }

    const row = e.target.closest('[data-client-id]');
    if (!row) return;
    const clientId = row.dataset.clientId;

    if (e.target.matches('[data-client-status-select]')) {
      const newStatus = e.target.value;
      const client = store.getState().campaignClients.find((c) => c.id === clientId);
      const campaign = client && store.getState().campaigns.find((c) => c.id === client.campaignId);

      // Ciclo de renovação (só certificados): ao marcar "Renovado", oferece
      // reiniciar o ciclo pro próximo ano num patch único (status +
      // cert_expiry + followup_task_id) — ver updateCampaignClientField
      // (js/store.js) pro rollback atômico dos 3 campos.
      if (campaign && campaign.kind === 'certificados' && newStatus === 'renovado') {
        if (!client.certExpiry) {
          // Sem vencimento preenchido não há data-base pra somar +12 meses —
          // fica só o status final, sem oferecer o reinício automático.
          alert('Cliente marcado como renovado. Para reiniciar o ciclo automaticamente, preencha o vencimento do certificado antes.');
          store.updateCampaignClientField(clientId, { status: 'renovado' });
          return;
        }
        const renewNow = confirm('Renovado! Já reiniciar o ciclo para o próximo ano?');
        const patch = renewNow
          ? { status: 'pendente', certExpiry: utils.addMonthsISO(client.certExpiry, 12), followupTaskId: null }
          : { status: 'renovado' };
        store.updateCampaignClientField(clientId, patch);
        return;
      }

      store.updateCampaignClientField(clientId, { status: newStatus });
      return;
    }
    if (e.target.matches('[data-client-trial-start]')) {
      store.updateCampaignClientField(clientId, { trialStart: e.target.value || null });
      return;
    }
    if (e.target.matches('[data-client-cert-expiry]')) {
      store.updateCampaignClientField(clientId, { certExpiry: e.target.value || null });
      return;
    }
    if (e.target.matches('[data-client-mrr]')) {
      store.updateCampaignClientField(clientId, { mrr: Number(e.target.value) || 0 });
      return;
    }
    if (e.target.matches('[data-client-notes]')) {
      store.updateCampaignClientField(clientId, { notes: e.target.value.trim() || null });
    }
  });

  // Busca por nome: input (não change) pra filtrar enquanto digita. O
  // re-render preserva foco/cursor do campo sozinho (ver renderCampaignDetail
  // em js/render.js), então é seguro atualizar a cada tecla aqui.
  campaignDetailView.addEventListener('input', (e) => {
    if (e.target.matches('[data-client-search]')) {
      store.setCampaignClientSearch(e.target.value);
    }
  });

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

  sidebarAvatar.addEventListener('click', () => {
    closeMobileSidebar();
    openAccountModal();
  });
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
        store.setScreen('tasks');
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
  taskRepeatSelect.addEventListener('change', toggleRepeatCustom);
  taskRepeatUnit.addEventListener('change', toggleRepeatWeekdaysVisibility);
  taskRepeatUntilToggle.addEventListener('change', toggleRepeatUntilRow);

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

  // Comentários dentro do modal de tarefa
  taskAddCommentBtn.addEventListener('click', addCommentFromModal);
  taskNewCommentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCommentFromModal();
    }
  });

  taskCommentList.addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-delete-comment]');
    if (delBtn) store.deleteComment(delBtn.dataset.deleteComment);
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

  // Chip de sugestão de data/recorrência (App.nlDate) sobre o título
  taskTitleInput.addEventListener('input', scheduleNlDateParse);

  taskNlDateChip.addEventListener('click', (e) => {
    if (!e.target.closest('.nldate-chip-dismiss')) return;
    dismissedNlText = taskTitleInput.value;
    pendingNlMatch = null;
    restoreNlDateSnapshot();
    renderNlDateChip();
  });

  function markNlDateFieldTouched(group) {
    nlDateManualOverride = true;
    nlDateTouchedFields.add(group);
    if (group === 'repeat') {
      // A nota dizia que a regra do chip "será aplicada ao salvar" — deixa
      // de ser verdade assim que o usuário assume o controle da repetição
      // manualmente (ver submit: buildRecurrenceFromForm passa a vencer).
      taskRepeatNlNote.hidden = true;
      taskRepeatNlNote.textContent = '';
    }
  }
  taskDueDateInput.addEventListener('input', () => markNlDateFieldTouched('dueDate'));
  // "x" ao lado do campo: limpa a data (vazia por padrão ou pré-preenchida
  // pela coluna do Painel) com 1 clique. Marca como campo tocado à mão pra
  // o chip de sugestão de data não reintroduzir uma data sozinho depois.
  taskDueDateClearBtn.addEventListener('click', () => {
    taskDueDateInput.value = '';
    markNlDateFieldTouched('dueDate');
  });
  taskDueTimeInput.addEventListener('input', () => markNlDateFieldTouched('dueTime'));
  [taskRepeatSelect, taskRepeatUnit, taskRepeatWeekdays, taskRepeatAnchor, taskRepeatUntilToggle].forEach((el) =>
    el.addEventListener('change', () => markNlDateFieldTouched('repeat'))
  );
  [taskRepeatInterval, taskRepeatUntil].forEach((el) =>
    el.addEventListener('input', () => markNlDateFieldTouched('repeat'))
  );

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

    const activeMatch = resolveActiveMatchForSubmit();
    const chipStillFresh = activeMatch && !activeMatch.unsupported;

    if (chipStillFresh && !nlDateManualOverride) {
      // Garante que os campos refletem o match mais recente mesmo que o
      // debounce de 200ms não tenha rodado ainda (Enter logo após digitar).
      applyNlDateToFields(activeMatch);
    }

    let title = taskTitleInput.value;
    if (chipStillFresh) {
      const { start, end } = activeMatch.match;
      title = (title.slice(0, start) + title.slice(end)).replace(/\s+/g, ' ').trim();
    }

    const payload = {
      title,
      projectId: taskProjectSelect.value || null,
      sessionId: taskSessionSelect.value || null,
      dueDate: taskDueDateInput.value || null,
      dueTime: taskDueTimeInput.value || null,
      recurrence: chipStillFresh && !nlDateTouchedFields.has('repeat') ? activeMatch.recurrence : buildRecurrenceFromForm(),
      description: taskDescriptionInput.value.trim() || null
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
      description: task.description,
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
    const addTaskBtn = e.target.closest('[data-add-task-project], [data-add-task-date]');
    if (addTaskBtn) {
      openTaskModal(
        null,
        addTaskBtn.dataset.addTaskProject || null,
        addTaskBtn.dataset.addTaskSession || null,
        addTaskBtn.dataset.addTaskDate || null
      );
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
      // Segurar a alça de reordenar uma coluna (enableReorderDrag, mesmo
      // elemento) não deve TAMBÉM disparar o pan-scroll do painel inteiro.
      if (e.target.closest('.drag-handle')) return;
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

  const mobileCarouselQuery = window.matchMedia('(max-width: 480px)');

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

  // Arrastar-para-reordenar (projetos na sidebar, sessões no modal de
  // projeto): mesmo padrão de Pointer Events do enableDragScroll (unifica
  // mouse/touch numa API só). O arraste só inicia com pointerdown na alça
  // (.drag-handle) — tocar/arrastar em qualquer outro ponto da linha
  // continua rolando a lista normalmente. touch-action:none fica só na
  // alça (CSS), nunca no container: é isso que evita o toque de reordenar
  // competir com o gesto de rolar a lista.
  // Auto-scroll do container durante um arraste, quando o ponteiro chega
  // perto de uma borda (topo/baixo pra listas verticais, esquerda/direita
  // pro Painel horizontal). Só um arraste fica ativo por vez no app
  // inteiro, então um único loop requestAnimationFrame (sem lib externa)
  // serve os três contextos — cada um só liga o loop enquanto o ponteiro
  // está dentro da zona de borda do SEU container.
  const AUTO_SCROLL_EDGE_ZONE = 48;
  const AUTO_SCROLL_MAX_SPEED = 14;
  let autoScrollRAF = null;
  let autoScrollSpeed = 0;
  let autoScrollContainer = null;
  let autoScrollAxis = 'y';

  function updateAutoScroll(container, e, axis) {
    const rect = container.getBoundingClientRect();
    const isY = axis === 'y';
    const pos = isY ? e.clientY : e.clientX;
    const near = pos - (isY ? rect.top : rect.left);
    const far = (isY ? rect.bottom : rect.right) - pos;

    let speed = 0;
    if (near < AUTO_SCROLL_EDGE_ZONE) {
      speed = -AUTO_SCROLL_MAX_SPEED * (1 - Math.max(near, 0) / AUTO_SCROLL_EDGE_ZONE);
    } else if (far < AUTO_SCROLL_EDGE_ZONE) {
      speed = AUTO_SCROLL_MAX_SPEED * (1 - Math.max(far, 0) / AUTO_SCROLL_EDGE_ZONE);
    }

    autoScrollSpeed = speed;
    autoScrollContainer = container;
    autoScrollAxis = axis;

    if (speed !== 0 && !autoScrollRAF) {
      const step = () => {
        if (!autoScrollContainer || autoScrollSpeed === 0) {
          autoScrollRAF = null;
          return;
        }
        if (autoScrollAxis === 'y') autoScrollContainer.scrollTop += autoScrollSpeed;
        else autoScrollContainer.scrollLeft += autoScrollSpeed;
        autoScrollRAF = requestAnimationFrame(step);
      };
      autoScrollRAF = requestAnimationFrame(step);
    } else if (speed === 0 && autoScrollRAF) {
      cancelAnimationFrame(autoScrollRAF);
      autoScrollRAF = null;
    }
  }

  function stopAutoScroll() {
    if (autoScrollRAF) cancelAnimationFrame(autoScrollRAF);
    autoScrollRAF = null;
    autoScrollSpeed = 0;
    autoScrollContainer = null;
  }

  // `axis: 'y'` (padrão, sidebar/sessões) compara clientY contra o topo/
  // base das linhas; `axis: 'x'` (colunas do Painel) compara clientX
  // contra esquerda/direita — mesmo mecanismo, só troca qual eixo do
  // ponteiro/retângulo é lido.
  function enableReorderDrag(container, rowSelector, onReorder, { axis = 'y' } = {}) {
    let draggedEl = null;
    let startPos = 0;
    let dragging = false;
    let lastTarget = null;
    let placeAfter = false;

    const isY = axis === 'y';
    const clientPos = (e) => (isY ? e.clientY : e.clientX);
    const dropBeforeClass = isY ? 'drop-above' : 'drop-left';
    const dropAfterClass = isY ? 'drop-below' : 'drop-right';

    container.addEventListener('pointerdown', (e) => {
      const handle = e.target.closest('.drag-handle');
      if (!handle) return;
      draggedEl = handle.closest(rowSelector);
      if (!draggedEl) return;
      startPos = clientPos(e);
      dragging = false;
      container.setPointerCapture(e.pointerId);
    });

    container.addEventListener('pointermove', (e) => {
      if (!draggedEl) return;
      if (!dragging) {
        if (Math.abs(clientPos(e) - startPos) < 4) return; // limiar, evita "arraste" por tremor
        dragging = true;
        draggedEl.classList.add('dragging');
      }
      updateAutoScroll(container, e, axis);

      const under = document.elementFromPoint(e.clientX, e.clientY);
      const target = under && under.closest(rowSelector);
      if (lastTarget) lastTarget.classList.remove(dropBeforeClass, dropAfterClass);
      if (!target || target === draggedEl) {
        lastTarget = null;
        return;
      }
      const rect = target.getBoundingClientRect();
      placeAfter = isY ? e.clientY > rect.top + rect.height / 2 : e.clientX > rect.left + rect.width / 2;
      target.classList.add(placeAfter ? dropAfterClass : dropBeforeClass);
      lastTarget = target;
    });

    function endDrag() {
      stopAutoScroll();
      if (draggedEl && dragging && lastTarget) {
        onReorder(draggedEl, lastTarget, placeAfter);
      }
      if (lastTarget) lastTarget.classList.remove(dropBeforeClass, dropAfterClass);
      if (draggedEl) draggedEl.classList.remove('dragging');
      draggedEl = null;
      dragging = false;
      lastTarget = null;
    }
    container.addEventListener('pointerup', endDrag);
    container.addEventListener('pointercancel', endDrag);

    // Suprime o clique logo depois de um arraste de verdade (mesma técnica
    // de enableDragScroll) — sem isso, soltar em cima de outro item
    // trocaria de filtro / focaria o campo de nome sem querer.
    container.addEventListener(
      'click',
      (e) => {
        if (e.target.closest('.drag-handle')) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );
  }

  enableReorderDrag(projectListEl, '.project-item', (draggedEl, targetEl, placeAfter) => {
    store.reorderProjects(draggedEl.dataset.project, targetEl.dataset.project, placeAfter);
  });

  enableReorderDrag(projectSessionList, '.session-editor-row', (draggedEl, targetEl, placeAfter) => {
    store.reorderSessions(projectIdInput.value, draggedEl.dataset.sessionId, targetEl.dataset.sessionId, placeAfter);
  });

  enableReorderDrag(
    boardView,
    '.board-column[data-board-project]',
    (draggedEl, targetEl, placeAfter) => {
      store.reorderProjectsBoard(draggedEl.dataset.boardProject, targetEl.dataset.boardProject, placeAfter);
    },
    { axis: 'x' }
  );

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
    // Mantém a lista de subtarefas/etiquetas/comentários do modal em dia com
    // mudanças assíncronas (ex.: rollback de uma mutação que falhou ao salvar).
    store.subscribe(() => {
      if (!taskModal.hidden && taskIdInput.value) {
        renderModalSubtasks();
        renderModalTags();
        renderModalComments();
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

      // Automação de aviso de vencimento de certificados: precisa rodar
      // TODO boot, mesmo que o usuário nunca abra a tela Campanhas (por
      // isso não depende de loadCampaigns/state.campaigns) — mesma âncora
      // de ordenação do gatilho abaixo (só depois de loadInitialData
      // concluído). Sem await de propósito: tem try/catch próprio
      // (js/store.js), então uma falha de rede não atrasa nem quebra o
      // resto do boot; qualquer tarefa criada aparece sozinha via
      // emit() -> renderAll() quando a busca terminar.
      store.processCertificateAlerts();

      // Gatilho de boot da tela Campanhas: ancorado aqui de propósito —
      // só depois da sessão restaurada (parâmetro user já veio de uma
      // sessão válida) e do loadInitialData concluído, nunca antes (senão
      // corre risco de disparar com a sessão do Supabase ainda não pronta).
      // Sem await: a UI mostra "Carregando campanhas..." via
      // renderCampaignsList enquanto a busca está em voo, sem bloquear o
      // resto do boot. Refresh direto na tela Campanhas ou no detalhe de
      // uma campanha cai aqui (o clique na sidebar não roda, já que o
      // usuário nunca clicou).
      const bootScreen = store.getState().ui.screen;
      if ((bootScreen === 'campaigns' || bootScreen === 'campaignDetail') && !store.getState().campaignsLoaded) {
        store.loadCampaigns();
      }

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
