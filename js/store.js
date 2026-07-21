(function (App) {
  const { utils, localPrefs, api } = App;
  const listeners = [];

  const state = {
    projects: [],
    sessions: [],
    tasks: [],
    tags: [],
    apiTokens: [],
    campaigns: [],
    campaignClients: [],
    // Carregadas sob demanda (loadCampaigns), só quando a tela Campanhas
    // abre — não fazem parte de loadInitialData, mesmo padrão de apiTokens.
    campaignsLoaded: false,
    // true só enquanto uma chamada a loadCampaigns está em voo — usado pra
    // não disparar duas buscas concorrentes (gatilho de boot + clique na
    // sidebar podem competir). Sempre volta a false ao final (sucesso ou
    // erro), então um retry nunca fica bloqueado.
    campaignsLoading: false,
    // Preenchido quando loadCampaigns falha — permite a UI mostrar um
    // estado de erro com botão "Tentar de novo" em vez de loading eterno.
    campaignsError: null,
    campaignImportStatus: { loading: false, error: null },
    // Carregados sob demanda (loadStats), só quando a tela "Minhas
    // estatísticas" abre — mesmo padrão de campaignsLoaded acima, incluindo
    // o guard de chamada concorrente (statsLoading) e o estado de erro com
    // retry (statsError). statsLoaded é invalidado (volta a false) direto em
    // setTaskStatus/deleteTask/deleteProject, pontos únicos por onde toda
    // mutação que muda os totais agregados passa — ver comentários lá.
    statsLoaded: false,
    statsLoading: false,
    statsError: null,
    statsDoneTasks: [], // [{ id, projectId, completedDate }]
    statsCompletions: [], // [{ id, taskId, completedOn }]
    statsTaskProjectMap: {}, // { [taskId]: projectId }, TODAS as tarefas do usuário
    // Mapa taskId -> [tagId, ...]. Não é persistido: reconstruído a cada
    // loadInitialData a partir das linhas de task_tags.
    taskTags: {},
    // Mapa taskId -> [{id, taskId, userId, content, createdAt}, ...],
    // carregado sob demanda (loadComments) ao abrir o modal de edição de
    // uma tarefa — não faz parte de loadInitialData.
    commentsByTask: {},
    // Texto de busca digitado no momento — não persiste entre recarregamentos.
    search: '',
    // Filtro rápido de status na tela de detalhe da campanha — efêmero,
    // igual "search" acima: não persiste, reseta a cada openCampaignDetail.
    campaignClientStatusFilter: 'all',
    // Busca por nome na tela de detalhe da campanha — mesmo caráter efêmero
    // do filtro de status acima.
    campaignClientSearch: '',
    // Estado do import do Todoist (sem otimismo — a UI só mostra loading).
    importStatus: { loading: false, error: null },
    ui: localPrefs.load()
  };

  let currentUserId = null;
  let onAuthError = null;

  function subscribe(fn) {
    listeners.push(fn);
  }

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function persistUi() {
    localPrefs.save(state.ui);
  }

  function getState() {
    return state;
  }

  function setAuthErrorHandler(fn) {
    onAuthError = fn;
  }

  function isAuthError(error) {
    return !!error && (error.code === 'PGRST301' || /jwt/i.test(error.message || ''));
  }

  function handleMutationError(context, error) {
    console.error(context, error);
    if (isAuthError(error) && onAuthError) {
      onAuthError();
      return;
    }
    // Sem isso, uma mutação que falha (ex: rede, permissão) parecia
    // simplesmente "não salvar" sem nenhum aviso pro usuário.
    alert(`${context}. Tente novamente.`);
  }

  function mapProjectFromRow(row) {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      isFavorite: !!row.is_favorite,
      position: row.position,
      boardPosition: row.board_position
    };
  }

  // Posição fracionária: a nova entra na média entre os vizinhos (ou
  // ±1000 se for na ponta/lista vazia). Isso permite reordenar sem
  // renumerar todo mundo. POSITION_GAP_EPSILON é o limite de segurança —
  // abaixo dele, a precisão de double já não garante mais uma inserção no
  // meio, e reindexamos em lote (ver reindexProjectPositions/
  // reindexSessionPositions). Na prática, o espaçamento inicial de 1000
  // permite dezenas de inserções no MESMO ponto antes de chegar perto do
  // limite, então reindexação deve ser raríssima.
  const POSITION_GAP_EPSILON = 1e-7;

  function calculateNewPosition(prevPosition, nextPosition) {
    if (prevPosition == null && nextPosition == null) return 1000;
    if (prevPosition == null) return nextPosition - 1000;
    if (nextPosition == null) return prevPosition + 1000;
    return (prevPosition + nextPosition) / 2;
  }

  function needsReindex(prevPosition, nextPosition) {
    if (prevPosition == null || nextPosition == null) return false;
    return nextPosition - prevPosition < POSITION_GAP_EPSILON;
  }

  // Núcleo puro (sem emit/API/rollback, que ficam por conta de cada
  // chamador) do cálculo de arrastar-e-soltar: dado `list` já ordenada
  // pelo campo de posição relevante, remove o item arrastado e o
  // reinsere ao lado do alvo, devolvendo a nova position (média dos
  // vizinhos) e quem são os vizinhos (pro needsReindex de cada chamador).
  // getId/getPosition abstraem qual campo é a "posição" (position ou
  // boardPosition) e servem sidebar, sessões e colunas do Painel com o
  // mesmo código.
  function computeReorderPosition(list, draggedId, targetId, placeAfter, getId, getPosition) {
    const draggedIdx = list.findIndex((item) => getId(item) === draggedId);
    const targetIdx = list.findIndex((item) => getId(item) === targetId);
    if (draggedIdx === -1 || targetIdx === -1 || draggedId === targetId) return null;

    const [removed] = list.splice(draggedIdx, 1);
    const insertAt = list.findIndex((item) => getId(item) === targetId) + (placeAfter ? 1 : 0);
    list.splice(insertAt, 0, removed);

    const prevNeighbor = list[insertAt - 1];
    const nextNeighbor = list[insertAt + 1];
    const prevPosition = prevNeighbor && getId(prevNeighbor) !== draggedId ? getPosition(prevNeighbor) : null;
    const nextPosition = nextNeighbor && getId(nextNeighbor) !== draggedId ? getPosition(nextNeighbor) : null;
    return { newPosition: calculateNewPosition(prevPosition, nextPosition), prevPosition, nextPosition };
  }

  function mapTagFromRow(row) {
    return { id: row.id, name: row.name, color: row.color, isFavorite: !!row.is_favorite };
  }

  function mapSessionFromRow(row) {
    return { id: row.id, projectId: row.project_id, name: row.name, position: row.position };
  }

  function mapApiTokenFromRow(row) {
    return {
      id: row.id,
      name: row.name,
      projectId: row.project_id,
      sessionId: row.session_id,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at
    };
  }

  function mapCommentFromRow(row) {
    return { id: row.id, taskId: row.task_id, userId: row.user_id, content: row.content, createdAt: row.created_at };
  }

  function mapCampaignFromRow(row) {
    return {
      id: row.id,
      name: row.name,
      kind: row.kind,
      trialDays: row.trial_days,
      alertDays: row.alert_days,
      followupProjectId: row.followup_project_id,
      followupSessionId: row.followup_session_id,
      fup1Date: row.fup1_date,
      fup2Date: row.fup2_date,
      fup3Date: row.fup3_date,
      fup1Message: row.fup1_message,
      fup2Message: row.fup2_message,
      fup3Message: row.fup3_message,
      status: row.status,
      createdAt: row.created_at
    };
  }

  function mapCampaignClientFromRow(row) {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      conexaId: row.conexa_id,
      name: row.name,
      phone: row.phone,
      status: row.status,
      fup1Sent: !!row.fup1_sent,
      fup2Sent: !!row.fup2_sent,
      fup3Sent: !!row.fup3_sent,
      trialStart: row.trial_start,
      certExpiry: row.cert_expiry,
      followupTaskId: row.followup_task_id,
      mrr: row.mrr,
      notes: row.notes
    };
  }

  // Mappers da tela "Minhas estatísticas" (js/stats.js) — rows mínimas dos
  // fetches dedicados de js/api.js, nunca as rows completas de mapTaskFromRow.
  function mapStatsDoneTaskFromRow(row) {
    return { id: row.id, projectId: row.project_id, completedDate: row.completed_date };
  }

  function mapStatsCompletionFromRow(row) {
    return { id: row.id, taskId: row.task_id, completedOn: row.completed_on };
  }

  function mapTaskFromRow(row) {
    return {
      id: row.id,
      title: row.title,
      projectId: row.project_id,
      sessionId: row.session_id,
      dueDate: row.due_date,
      dueTime: row.due_time,
      recurring: row.recurring,
      recurrence: row.recurrence,
      description: row.description,
      status: row.status,
      completedDate: row.completed_date,
      parentTaskId: row.parent_task_id,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
    };
  }

  function getFilteredTasks() {
    const { tasks, ui, search } = state;
    const today = utils.todayISO();
    // "Em breve" é uma janela corrida (hoje + 7 dias seguintes), não a
    // semana de calendário — bate com o mesmo período usado no Painel
    // agrupado por data (ver buildDateColumns em render.js).
    const upcomingEnd = utils.addDaysISO(today, 7);
    const query = search.trim().toLowerCase();

    return tasks.filter((t) => {
      // Subtarefas nunca aparecem como linha/card independente — só
      // aninhadas dentro da tarefa mãe (ver getSubtasks).
      if (t.parentTaskId) return false;
      // Visão "Recorrentes": ignora projeto/etiqueta/período, mostra só as
      // recorrentes de qualquer lugar (mas ainda respeita uma busca).
      if (ui.recurringOnly) return t.recurrence && (!query || t.title.toLowerCase().includes(query));
      if (ui.projectFilter !== 'all' && t.projectId !== ui.projectFilter) return false;
      if (ui.tagFilter && !(state.taskTags[t.id] || []).includes(ui.tagFilter)) return false;
      // Buscando por texto, o filtro de período não se aplica — a busca
      // precisa achar a tarefa não importa quando ela vence.
      if (query) return t.title.toLowerCase().includes(query);
      if (ui.period === 'all') return true;
      // No modelo Todoist a recorrente tem due_date real (avança pra próxima
      // ocorrência só ao concluir, ver setTaskStatus) — por isso ela não
      // precisa de bypass aqui, o filtro por data abaixo já a posiciona no
      // período certo como qualquer outra tarefa.
      if (!t.dueDate) return false;
      // Atrasada (vencida e não concluída) sempre aparece, não importa o
      // período — senão ela "some" de vista assim que passa o dia.
      if (t.status !== 'done' && utils.isOverdue(t.dueDate, today)) return true;
      if (ui.period === 'today') return t.dueDate === today;
      if (ui.period === 'week') return utils.isDateInRange(t.dueDate, today, upcomingEnd);
      if (ui.period === 'month') return t.dueDate.slice(0, 7) === today.slice(0, 7);
      return true;
    });
  }

  function getSubtasks(parentTaskId) {
    return state.tasks.filter((t) => t.parentTaskId === parentTaskId);
  }

  function getTaskTags(taskId) {
    const ids = state.taskTags[taskId] || [];
    return ids.map((id) => state.tags.find((tag) => tag.id === id)).filter(Boolean);
  }

  function getComments(taskId) {
    return state.commentsByTask[taskId] || [];
  }

  function getSessionsForProject(projectId) {
    return state.sessions.filter((s) => s.projectId === projectId).sort((a, b) => a.position - b.position);
  }

  function getApiTokens() {
    return state.apiTokens;
  }

  // Carregado sob demanda (só quando a tela de Integrações abre), não no
  // bootstrap geral — é uma lista de baixo tráfego que a maioria das
  // sessões nunca chega a abrir.
  async function loadApiTokens() {
    const { data, error } = await api.fetchApiTokens(currentUserId);
    if (error) {
      handleMutationError('Falha ao carregar tokens de API', error);
      return;
    }
    state.apiTokens = (data || []).map(mapApiTokenFromRow);
    emit();
  }

  async function createApiToken({ name, projectId, sessionId }) {
    try {
      const token = await api.createApiTokenRpc({ name, projectId, sessionId });
      await loadApiTokens();
      return token;
    } catch (error) {
      handleMutationError('Falha ao criar token de API', error);
      return null;
    }
  }

  // Métricas por campanha são calculadas aqui, no client, a partir da
  // contagem real de campaign_clients por status — nunca persistidas como
  // coluna agregada (evita duas fontes de verdade dessincronizando).
  function getCampaignClientCounts(campaignId) {
    const clients = state.campaignClients.filter((c) => c.campaignId === campaignId);
    const counts = { total: clients.length, sem_resposta: 0, respondeu: 0, trial: 0, convertido: 0, recusou: 0 };
    clients.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }

  // Métricas do cabeçalho da tela de detalhe — distinta de
  // getCampaignClientCounts (que é contagem EXATA por status, usada só na
  // lista). Aqui "responded" é status ALÉM de sem_resposta (respondeu +
  // trial + convertido + recusou somados), não o status literal
  // "respondeu" — fácil de confundir com counts.respondeu acima, que é
  // outra coisa. Recalcula do zero a cada chamada: como toda mutação de
  // cliente passa por emit() -> renderAll() -> renderCampaignDetail(), as
  // métricas atualizam sozinhas, sem nenhuma assinatura/cache.
  function getCampaignMetrics(campaignId) {
    const campaign = state.campaigns.find((c) => c.id === campaignId);
    const clients = state.campaignClients.filter((c) => c.campaignId === campaignId);
    const total = clients.length;

    if (campaign && campaign.kind === 'certificados') {
      const withExpiry = clients.filter((c) => !!c.certExpiry).length;
      const avisados = clients.filter((c) => c.status === 'avisado').length;
      const renovados = clients.filter((c) => c.status === 'renovado').length;
      const perdidos = clients.filter((c) => c.status === 'perdido').length;
      const renewalRate = renovados + perdidos > 0 ? renovados / (renovados + perdidos) : 0;
      return { total, withExpiry, avisados, renovados, perdidos, renewalRate };
    }

    const responded = clients.filter((c) => c.status !== 'sem_resposta').length;
    const trial = clients.filter((c) => c.status === 'trial').length;
    const convertido = clients.filter((c) => c.status === 'convertido').length;
    const mrrAdicional = clients
      .filter((c) => c.status === 'convertido')
      .reduce((sum, c) => sum + (Number(c.mrr) || 0), 0);
    const conversionRate = total > 0 ? convertido / total : 0;
    return { total, responded, trial, convertido, mrrAdicional, conversionRate };
  }

  // Navegação pra tela de detalhe — screen/campaignDetailId persistem
  // (mesmo mecanismo de projectFilter/tagFilter), então F5 dentro do
  // detalhe reabre na mesma campanha.
  function openCampaignDetail(campaignId) {
    state.ui.screen = 'campaignDetail';
    state.ui.campaignDetailId = campaignId;
    state.campaignClientStatusFilter = 'all';
    state.campaignClientSearch = '';
    persistUi();
    emit();
  }

  function setCampaignClientStatusFilter(status) {
    state.campaignClientStatusFilter = status;
    emit();
  }

  function setCampaignClientSearch(query) {
    state.campaignClientSearch = query;
    emit();
  }

  // Carregado sob demanda (só quando a tela Campanhas abre), não no
  // loadInitialData geral — mesmo padrão de loadApiTokens.
  // Guard contra chamadas concorrentes (gatilho de boot + clique na
  // sidebar podem disparar quase juntos) — nunca contra retry sequencial:
  // campaignsLoading sempre volta a false no fim, sucesso ou erro, então
  // um clique em "Tentar de novo" depois de uma falha sempre dispara de novo.
  async function loadCampaigns() {
    if (state.campaignsLoading) return;
    state.campaignsLoading = true;
    state.campaignsError = null;
    emit();
    try {
      const [campaignsRes, clientsRes] = await Promise.all([api.fetchCampaigns(), api.fetchCampaignClients()]);
      const error = campaignsRes.error || clientsRes.error;
      if (error) throw error;
      state.campaigns = (campaignsRes.data || []).map(mapCampaignFromRow);
      state.campaignClients = (clientsRes.data || []).map(mapCampaignClientFromRow);
      state.campaignsLoaded = true;
      state.campaignsLoading = false;
      state.campaignsError = null;
      emit();
    } catch (error) {
      console.error('Falha ao carregar campanhas', error);
      state.campaignsLoading = false;
      state.campaignsError = error;
      emit();
      // Erro de autenticação (ex: JWT expirado) força logout, igual ao
      // resto do app — sem alert() aqui: a UI já mostra o estado de erro
      // com "Tentar de novo", um alert bloqueante seria redundante.
      if (isAuthError(error) && onAuthError) onAuthError();
    }
  }

  // Carregado sob demanda (só quando a tela "Minhas estatísticas" abre), não
  // no loadInitialData geral — mesmo padrão de loadCampaigns acima, incluindo
  // o guard de chamada concorrente e o tratamento de erro (sem alert(): é
  // leitura, não mutação, a UI mostra o estado de erro com "Tentar de novo").
  // `force` (chamado pelo botão "Atualizar" da tela) ignora o cache e refaz
  // a busca mesmo com statsLoaded já true — cobre conclusões feitas em outro
  // dispositivo/aba, que não passam pela invalidação local de statsLoaded.
  async function loadStats(force) {
    if (state.statsLoading) return;
    if (state.statsLoaded && !force) return;
    state.statsLoading = true;
    state.statsError = null;
    emit();
    try {
      const [doneRes, complRes, mapRes] = await Promise.all([
        api.fetchAllDoneTasks(),
        api.fetchTaskCompletions(),
        api.fetchTaskProjectMap()
      ]);
      const error = doneRes.error || complRes.error || mapRes.error;
      if (error) throw error;
      state.statsDoneTasks = (doneRes.data || []).map(mapStatsDoneTaskFromRow);
      state.statsCompletions = (complRes.data || []).map(mapStatsCompletionFromRow);
      const taskProjectMap = {};
      (mapRes.data || []).forEach((row) => {
        taskProjectMap[row.id] = row.project_id;
      });
      state.statsTaskProjectMap = taskProjectMap;
      state.statsLoaded = true;
      state.statsLoading = false;
      state.statsError = null;
      emit();
    } catch (error) {
      console.error('Falha ao carregar estatísticas', error);
      state.statsLoading = false;
      state.statsError = error;
      emit();
      if (isAuthError(error) && onAuthError) onAuthError();
    }
  }

  // Criação de campanha: sem update otimista (é uma inserção em lote de
  // campanha + clientes, não uma mutação isolada) — mesma exceção do import
  // do Todoist. Se o insert de campaign_clients falhar, a campanha já
  // inserida fica inserida (sem rollback parcial); o estado real é
  // recarregado via loadCampaigns no final.
  async function createCampaignWithClients(fields, clients) {
    state.campaignImportStatus = { loading: true, error: null };
    emit();
    try {
      const { data: campaignRow, error: cErr } = await api.insertCampaign(currentUserId, fields);
      if (cErr) throw cErr;

      if (clients.length > 0) {
        // Default de status por kind: sem isso, o insert cairia no default
        // da coluna ('sem_resposta'), que não existe no vocabulário de
        // certificados e ficaria sem label na tela de detalhe.
        const defaultStatus = fields.kind === 'certificados' ? 'pendente' : 'sem_resposta';
        const rows = clients.map((c) => ({
          campaign_id: campaignRow.id,
          user_id: currentUserId,
          conexa_id: c.conexaId || null,
          name: c.name,
          phone: c.phone || null,
          status: defaultStatus
        }));
        const { error: ccErr } = await api.insertCampaignClientsBatch(rows);
        if (ccErr) throw ccErr;
      }

      await loadCampaigns();
      state.campaignImportStatus = { loading: false, error: null };
      emit();
      return { ok: true };
    } catch (err) {
      state.campaignImportStatus = { loading: false, error: err };
      emit();
      handleMutationError('Falha ao criar campanha (import ficou incompleto)', err);
      return { ok: false, error: err };
    }
  }

  // Inserção manual (botão "+ Adicionar cliente" no detalhe da campanha) —
  // mesmo molde de addSession: linha otimista com id temporário entra na
  // tabela na hora (métricas recalculam sozinhas via emit -> renderCampaignDetail),
  // e é substituída pela linha real quando o insert confirma; erro remove a
  // otimista pelo tempId.
  function addCampaignClient(campaignId, { name, phone, notes }) {
    const campaign = state.campaigns.find((c) => c.id === campaignId);
    const defaultStatus = campaign && campaign.kind === 'certificados' ? 'pendente' : 'sem_resposta';
    const tempId = `tmp-${utils.uid()}`;
    const optimistic = {
      id: tempId,
      campaignId,
      conexaId: null,
      name: name.trim(),
      phone: phone ? phone.trim() : null,
      status: defaultStatus,
      fup1Sent: false,
      fup2Sent: false,
      fup3Sent: false,
      trialStart: null,
      certExpiry: null,
      followupTaskId: null,
      mrr: 0,
      notes: notes ? notes.trim() : null
    };
    state.campaignClients.push(optimistic);
    emit();

    api
      .insertCampaignClientRow(currentUserId, {
        campaignId,
        name: optimistic.name,
        phone: optimistic.phone,
        notes: optimistic.notes,
        status: defaultStatus
      })
      .then(({ data, error }) => {
        if (error) {
          state.campaignClients = state.campaignClients.filter((c) => c.id !== tempId);
          emit();
          handleMutationError('Falha ao adicionar cliente', error);
          return;
        }
        const idx = state.campaignClients.findIndex((c) => c.id === tempId);
        if (idx !== -1) state.campaignClients[idx] = mapCampaignClientFromRow(data);
        emit();
      });
  }

  // Mutação otimista genérica de 1 patch por vez (nunca mistura campos de
  // fontes diferentes no mesmo patch) — molde de toggleProjectFavorite/
  // updateProject: snapshot, muta, emit, chama API, reverte no erro.
  // Ao ativar trial (patch.status === 'trial'): marca trial_start = hoje
  // (só se ainda vazio) no mesmo patch, e — de forma assíncrona, depois da
  // mutação otimista já ter emitido — cria a tarefa de acompanhamento pelo
  // fluxo normal do app (addTask), guardando o id em followup_task_id.
  // Idempotente por followupTaskId (não por status): sair e voltar pra
  // trial não duplica a tarefa. 'convertido'/'recusou' não tocam nisso —
  // são só o patch genérico normal, encerramento da tarefa é manual.
  async function updateCampaignClientField(id, patch) {
    const c = state.campaignClients.find((x) => x.id === id);
    if (!c) return;
    const previous = { ...c };
    const isActivatingTrial = patch.status === 'trial';
    const effectivePatch = { ...patch };
    if (isActivatingTrial && !c.trialStart) {
      effectivePatch.trialStart = utils.todayISO();
    }

    Object.assign(c, effectivePatch);
    emit();
    api.updateCampaignClientRow(id, effectivePatch).then(({ error }) => {
      if (error) {
        Object.assign(c, previous);
        emit();
        handleMutationError('Falha ao atualizar cliente da campanha', error);
      }
    });

    if (!isActivatingTrial || previous.followupTaskId) return;

    const campaign = state.campaigns.find((camp) => camp.id === c.campaignId);
    if (!campaign || !campaign.followupProjectId) {
      console.error('Trial ativado sem projeto de destino configurado na campanha', c.campaignId);
      alert(
        'Cliente marcado como trial, mas a campanha não tem projeto de destino configurado — a tarefa de acompanhamento não foi criada. Configure o projeto na campanha e crie a tarefa manualmente se precisar.'
      );
      return;
    }

    const task = await addTask({
      title: `Acompanhar trial: ${c.name} (${c.phone || ''})`,
      projectId: campaign.followupProjectId,
      sessionId: campaign.followupSessionId || null,
      dueDate: utils.addDaysISO(utils.todayISO(), 7)
    });
    if (task) {
      updateCampaignClientField(id, { followupTaskId: task.id });
    }
  }

  // Automação de boot: aviso de vencimento de certificado. Chamada em todo
  // boot (js/app.js enterApp, depois de loadInitialData), não em
  // loadCampaigns/state.campaigns (que só carrega quando a tela Campanhas
  // abre) — usa fetches dedicados e leves (api.fetchActiveCertificateCampaigns/
  // fetchEligibleCertificateClients) pra não crescer sem limite todo boot.
  // Fire-and-forget no chamador; try/catch aqui garante que uma falha de
  // rede nunca quebra o boot.
  async function processCertificateAlerts() {
    try {
      const { data: campaigns, error: campErr } = await api.fetchActiveCertificateCampaigns();
      if (campErr) {
        console.error('Falha ao buscar campanhas de certificados na automação de boot', campErr);
        return;
      }
      if (!campaigns || campaigns.length === 0) return;

      const campaignsById = new Map(campaigns.map((c) => [c.id, c]));
      const { data: clients, error: clientErr } = await api.fetchEligibleCertificateClients(
        campaigns.map((c) => c.id)
      );
      if (clientErr) {
        console.error('Falha ao buscar clientes elegíveis pra aviso de certificado', clientErr);
        return;
      }

      const today = utils.todayISO();
      for (const row of clients || []) {
        const campaign = campaignsById.get(row.campaign_id);
        const alertDate = utils.addDaysISO(row.cert_expiry, -(campaign.alert_days || 45));
        if (alertDate > today) continue; // ainda não chegou a data de aviso

        if (!campaign.followup_project_id) {
          console.warn('Campanha de certificados sem projeto de destino — pulando cliente', row.id, campaign.id);
          continue;
        }

        // addTask primeiro: só depois de ter o id real da tarefa é que
        // consideramos o cliente "processado". Se o app fechar/cair entre
        // aqui e a gravação abaixo, o pior caso é uma tarefa órfã (sem
        // followup_task_id apontando pra ela) — nunca duas tarefas pro
        // mesmo cliente neste boot (mesmo gap teórico que já existe hoje
        // no fluxo de trial acima — não é uma regressão nova).
        const task = await addTask({
          title: `Renovar certificado: ${row.name} (${row.phone || ''}) — vence ${utils.formatDateBR(row.cert_expiry)}`,
          projectId: campaign.followup_project_id,
          sessionId: campaign.followup_session_id || null,
          dueDate: alertDate
        });
        if (!task) continue; // addTask já chamou handleMutationError; sem task real, não marca nada

        const { error: updErr } = await api.updateCampaignClientRow(row.id, {
          followupTaskId: task.id,
          status: 'avisado'
        });
        if (updErr) {
          console.error(
            'Tarefa de aviso criada mas falha ao marcar cliente como avisado (tarefa pode ficar órfã)',
            row.id,
            updErr
          );
        }
      }
    } catch (err) {
      console.error('Falha inesperada na automação de aviso de certificados', err);
    }
  }

  // Encerrar/reativar campanha — mesma função nos dois sentidos.
  function setCampaignStatus(id, status) {
    const camp = state.campaigns.find((x) => x.id === id);
    if (!camp) return;
    const previous = camp.status;
    camp.status = status;
    emit();
    api.updateCampaignRow(id, { status }).then(({ error }) => {
      if (error) {
        camp.status = previous;
        emit();
        handleMutationError('Falha ao atualizar status da campanha', error);
      }
    });
  }

  // Dias de antecedência do aviso (só campanhas kind='certificados') — só
  // editável depois da criação, mesmo molde otimista de setCampaignStatus.
  function updateCampaignAlertDays(id, alertDays) {
    const camp = state.campaigns.find((x) => x.id === id);
    if (!camp) return;
    const previous = camp.alertDays;
    camp.alertDays = alertDays;
    emit();
    api.updateCampaignRow(id, { alertDays }).then(({ error }) => {
      if (error) {
        camp.alertDays = previous;
        emit();
        handleMutationError('Falha ao atualizar dias de antecedência', error);
      }
    });
  }

  // Sem RPC: campaign_clients.campaign_id já tem "on delete cascade" (ver
  // migration 0015), então o DELETE simples já cascateia no banco sozinho.
  // O strip local de campaignClients é só o espelho otimista, mesmo padrão
  // de deleteProject com sessions/tasks.
  function deleteCampaign(id) {
    const removedCampaign = state.campaigns.find((c) => c.id === id);
    const removedClients = state.campaignClients.filter((c) => c.campaignId === id);
    state.campaigns = state.campaigns.filter((c) => c.id !== id);
    state.campaignClients = state.campaignClients.filter((c) => c.campaignId !== id);
    emit();
    api.deleteCampaignRow(id).then(({ error }) => {
      if (error) {
        // Reinsere no fim do array (não na posição original) — a ordem
        // exata só é restaurada no próximo loadCampaigns() (reordena por
        // created_at). Transitório e intencional: só afeta a ordem visual
        // por um instante após uma falha de exclusão, nunca os dados.
        if (removedCampaign) state.campaigns.push(removedCampaign);
        state.campaignClients = state.campaignClients.concat(removedClients);
        emit();
        handleMutationError('Falha ao excluir campanha', error);
      }
    });
  }

  // Exclusão de 1 cliente da lista (mantendo a campanha) — mesmo molde
  // otimista de deleteCampaign, mas removendo só o cliente do array.
  function deleteCampaignClient(id) {
    const removed = state.campaignClients.find((c) => c.id === id);
    state.campaignClients = state.campaignClients.filter((c) => c.id !== id);
    emit();
    api.deleteCampaignClientRow(id).then(({ error }) => {
      if (error) {
        if (removed) state.campaignClients.push(removed);
        emit();
        handleMutationError('Falha ao excluir cliente', error);
      }
    });
  }

  function deleteApiToken(id) {
    const removed = state.apiTokens.find((t) => t.id === id);
    state.apiTokens = state.apiTokens.filter((t) => t.id !== id);
    emit();

    api.deleteApiTokenRow(id).then(({ error }) => {
      if (error) {
        if (removed) state.apiTokens.push(removed);
        emit();
        handleMutationError('Falha ao excluir token de API', error);
      }
    });
  }

  async function loadInitialData(userId) {
    currentUserId = userId;
    const [projectsRes, sessionsRes, tasksRes, tagsRes, taskTagsRes] = await Promise.all([
      api.fetchProjects(),
      api.fetchSessions(),
      api.fetchTasks(),
      api.fetchTags(),
      api.fetchTaskTags()
    ]);
    if (projectsRes.error) throw projectsRes.error;
    if (sessionsRes.error) throw sessionsRes.error;
    if (tasksRes.error) throw tasksRes.error;
    if (tagsRes.error) throw tagsRes.error;
    if (taskTagsRes.error) throw taskTagsRes.error;

    state.projects = (projectsRes.data || []).map(mapProjectFromRow);
    state.sessions = (sessionsRes.data || []).map(mapSessionFromRow);
    state.tasks = (tasksRes.data || []).map(mapTaskFromRow);
    state.tags = (tagsRes.data || []).map(mapTagFromRow);
    state.taskTags = {};
    (taskTagsRes.data || []).forEach((row) => {
      if (!state.taskTags[row.task_id]) state.taskTags[row.task_id] = [];
      state.taskTags[row.task_id].push(row.tag_id);
    });
    // O modelo antigo de recorrência (normalizeRecurringTasksOnce, reabria
    // a tarefa "diária" toda vez que os dados carregavam) foi substituído:
    // agora o avanço pra próxima ocorrência acontece no momento de
    // concluir (ver setTaskStatus), não mais varrendo o estado no load.
    emit();
  }

  function clearState() {
    currentUserId = null;
    state.projects = [];
    state.sessions = [];
    state.tasks = [];
    state.tags = [];
    state.taskTags = {};
    state.commentsByTask = {};
    state.search = '';
    state.importStatus = { loading: false, error: null };
    state.campaigns = [];
    state.campaignClients = [];
    state.campaignsLoaded = false;
    state.campaignsLoading = false;
    state.campaignsError = null;
    state.campaignImportStatus = { loading: false, error: null };
    state.campaignClientStatusFilter = 'all';
    state.campaignClientSearch = '';
    state.statsLoaded = false;
    state.statsLoading = false;
    state.statsError = null;
    state.statsDoneTasks = [];
    state.statsCompletions = [];
    state.statsTaskProjectMap = {};
    emit();
  }

  function addProject({ name, color }) {
    const tempId = `tmp-${utils.uid()}`;
    const lastPosition = state.projects.reduce((max, p) => (p.position > max ? p.position : max), null);
    const lastBoardPosition = state.projects.reduce((max, p) => (p.boardPosition > max ? p.boardPosition : max), null);
    const optimistic = {
      id: tempId,
      name: name.trim(),
      color: color || '#6c5ce7',
      position: calculateNewPosition(lastPosition, null),
      boardPosition: calculateNewPosition(lastBoardPosition, null)
    };
    state.projects.push(optimistic);
    emit();

    api.insertProject(currentUserId, optimistic).then(({ data, error }) => {
      if (error) {
        state.projects = state.projects.filter((p) => p.id !== tempId);
        emit();
        handleMutationError('Falha ao criar projeto', error);
        return;
      }
      const idx = state.projects.findIndex((p) => p.id === tempId);
      if (idx !== -1) state.projects[idx] = mapProjectFromRow(data);
      emit();
    });
  }

  function updateProject(id, { name, color }) {
    const p = state.projects.find((p) => p.id === id);
    if (!p) return;
    const previous = { ...p };
    p.name = name.trim();
    p.color = color;
    emit();

    api.updateProjectRow(id, { name: p.name, color: p.color }).then(({ error }) => {
      if (error) {
        Object.assign(p, previous);
        emit();
        handleMutationError('Falha ao atualizar projeto', error);
      }
    });
  }

  function deleteProject(id) {
    // Apaga (via cascade) tarefas done do projeto junto — muda os totais
    // agregados de "Minhas estatísticas", então invalida o cache.
    state.statsLoaded = false;
    const removedProject = state.projects.find((p) => p.id === id);
    const removedTasks = state.tasks.filter((t) => t.projectId === id);
    // As sessões do projeto somem junto (o banco já faz isso via cascade;
    // aqui só espelha no estado local pra sidebar/modal atualizarem na hora).
    const removedSessions = state.sessions.filter((s) => s.projectId === id);
    state.projects = state.projects.filter((p) => p.id !== id);
    state.sessions = state.sessions.filter((s) => s.projectId !== id);
    state.tasks = state.tasks.filter((t) => t.projectId !== id);
    if (state.ui.projectFilter === id) state.ui.projectFilter = 'all';
    persistUi();
    emit();

    api.deleteProjectCascade(id).then(({ error }) => {
      if (error) {
        if (removedProject) state.projects.push(removedProject);
        state.sessions = state.sessions.concat(removedSessions);
        state.tasks = state.tasks.concat(removedTasks);
        emit();
        handleMutationError('Falha ao excluir projeto', error);
      }
    });
  }

  function toggleProjectFavorite(id) {
    const p = state.projects.find((p) => p.id === id);
    if (!p) return;
    const previous = p.isFavorite;
    p.isFavorite = !previous;
    emit();

    api.updateProjectFavorite(id, p.isFavorite).then(({ error }) => {
      if (error) {
        p.isFavorite = previous;
        emit();
        handleMutationError('Falha ao favoritar projeto', error);
      }
    });
  }

  // Arrastar-e-soltar: recalcula a position do projeto arrastado como a
  // média entre os vizinhos na nova posição (ver calculateNewPosition) —
  // não reordena o array em si, só o campo position; renderSidebar
  // (render.js) já ordena por position antes de desenhar a lista.
  function reorderProjects(draggedId, targetId, placeAfter) {
    const list = state.projects.slice().sort((a, b) => a.position - b.position);
    const dragged = state.projects.find((p) => p.id === draggedId);
    if (!dragged) return;
    const result = computeReorderPosition(list, draggedId, targetId, placeAfter, (p) => p.id, (p) => p.position);
    if (!result) return;

    const previousPosition = dragged.position;
    dragged.position = result.newPosition;
    emit();

    api.updateProjectPosition(draggedId, result.newPosition).then(({ error }) => {
      if (error) {
        dragged.position = previousPosition;
        emit();
        handleMutationError('Falha ao reordenar projeto', error);
        return;
      }
      if (needsReindex(result.prevPosition, result.nextPosition)) {
        reindexProjectPositions();
      }
    });
  }

  // Fallback defensivo: só dispara quando o espaço entre dois vizinhos
  // ficou pequeno demais pra calcular uma média útil (ver
  // POSITION_GAP_EPSILON). Renumera tudo em múltiplos de 1000 na MESMA
  // ordem já visível — não muda o que o usuário vê, só limpa os números.
  function reindexProjectPositions() {
    const sorted = state.projects.slice().sort((a, b) => a.position - b.position);
    const updates = [];
    sorted.forEach((p, i) => {
      const newPos = (i + 1) * 1000;
      if (p.position !== newPos) {
        updates.push({ id: p.id, position: newPos });
        p.position = newPos;
      }
    });
    if (!updates.length) return;
    emit();
    // Sem rollback aqui de propósito: reindex só normaliza números que já
    // representam a MESMA ordem visível já otimista; uma falha parcial de
    // rede deixa o estado local correto pro usuário, só os números remotos
    // ficam temporariamente desatualizados até a próxima gravação bem-sucedida.
    Promise.all(updates.map((u) => api.updateProjectPosition(u.id, u.position))).catch((error) =>
      handleMutationError('Falha ao reindexar projetos', error)
    );
  }

  // Mesmo desenho de reorderProjects, mas para a ordem PRÓPRIA das colunas
  // do Painel (boardPosition), independente da position da sidebar —
  // arrastar uma coluna aqui nunca move o projeto na lista lateral, e
  // vice-versa. Não é escopado por projeto (ao contrário de
  // reorderSessions): colunas do Painel competem pelo mesmo espaço de
  // boardPosition entre todos os projetos do usuário.
  function reorderProjectsBoard(draggedId, targetId, placeAfter) {
    const list = state.projects.slice().sort((a, b) => a.boardPosition - b.boardPosition);
    const dragged = state.projects.find((p) => p.id === draggedId);
    if (!dragged) return;
    const result = computeReorderPosition(list, draggedId, targetId, placeAfter, (p) => p.id, (p) => p.boardPosition);
    if (!result) return;

    const previousBoardPosition = dragged.boardPosition;
    dragged.boardPosition = result.newPosition;
    emit();

    api.updateProjectBoardPosition(draggedId, result.newPosition).then(({ error }) => {
      if (error) {
        dragged.boardPosition = previousBoardPosition;
        emit();
        handleMutationError('Falha ao reordenar coluna do Painel', error);
        return;
      }
      if (needsReindex(result.prevPosition, result.nextPosition)) {
        reindexProjectBoardPositions();
      }
    });
  }

  function reindexProjectBoardPositions() {
    const sorted = state.projects.slice().sort((a, b) => a.boardPosition - b.boardPosition);
    const updates = [];
    sorted.forEach((p, i) => {
      const newPos = (i + 1) * 1000;
      if (p.boardPosition !== newPos) {
        updates.push({ id: p.id, boardPosition: newPos });
        p.boardPosition = newPos;
      }
    });
    if (!updates.length) return;
    emit();
    Promise.all(updates.map((u) => api.updateProjectBoardPosition(u.id, u.boardPosition))).catch((error) =>
      handleMutationError('Falha ao reindexar colunas do Painel', error)
    );
  }

  function addSession({ projectId, name }) {
    const tempId = `tmp-${utils.uid()}`;
    const lastPosition = getSessionsForProject(projectId).reduce((max, s) => (s.position > max ? s.position : max), null);
    const optimistic = { id: tempId, projectId, name: name.trim(), position: calculateNewPosition(lastPosition, null) };
    state.sessions.push(optimistic);
    emit();

    api.insertSessionRow(currentUserId, { projectId, name: optimistic.name, position: optimistic.position }).then(({ data, error }) => {
      if (error) {
        state.sessions = state.sessions.filter((s) => s.id !== tempId);
        emit();
        handleMutationError('Falha ao criar sessão', error);
        return;
      }
      const idx = state.sessions.findIndex((s) => s.id === tempId);
      if (idx !== -1) state.sessions[idx] = mapSessionFromRow(data);
      emit();
    });
  }

  function updateSession(id, { name }) {
    const s = state.sessions.find((s) => s.id === id);
    if (!s) return;
    const previous = { ...s };
    s.name = name.trim();
    emit();

    api.updateSessionRow(id, { name: s.name }).then(({ error }) => {
      if (error) {
        Object.assign(s, previous);
        emit();
        handleMutationError('Falha ao atualizar sessão', error);
      }
    });
  }

  function deleteSession(id) {
    const removedSession = state.sessions.find((s) => s.id === id);
    const affectedTasks = state.tasks.filter((t) => t.sessionId === id);
    state.sessions = state.sessions.filter((s) => s.id !== id);
    affectedTasks.forEach((t) => {
      t.sessionId = null;
    });
    emit();

    api.deleteSessionRow(id).then(({ error }) => {
      if (error) {
        if (removedSession) state.sessions.push(removedSession);
        affectedTasks.forEach((t) => {
          t.sessionId = id;
        });
        emit();
        handleMutationError('Falha ao excluir sessão', error);
      }
    });
  }

  // Mesmo desenho de reorderProjects, mas os vizinhos vêm de
  // getSessionsForProject(projectId) (já ordenada e escopada a um só
  // projeto) — sessões de projetos diferentes não competem pelo mesmo
  // espaço de position.
  function reorderSessions(projectId, draggedId, targetId, placeAfter) {
    const list = getSessionsForProject(projectId);
    const dragged = state.sessions.find((s) => s.id === draggedId);
    if (!dragged) return;
    const result = computeReorderPosition(list, draggedId, targetId, placeAfter, (s) => s.id, (s) => s.position);
    if (!result) return;

    const previousPosition = dragged.position;
    dragged.position = result.newPosition;
    emit();

    api.updateSessionPosition(draggedId, result.newPosition).then(({ error }) => {
      if (error) {
        dragged.position = previousPosition;
        emit();
        handleMutationError('Falha ao reordenar sessão', error);
        return;
      }
      if (needsReindex(result.prevPosition, result.nextPosition)) {
        reindexSessionPositions(projectId);
      }
    });
  }

  function reindexSessionPositions(projectId) {
    const sorted = getSessionsForProject(projectId);
    const updates = [];
    sorted.forEach((s, i) => {
      const newPos = (i + 1) * 1000;
      if (s.position !== newPos) {
        updates.push({ id: s.id, position: newPos });
        s.position = newPos;
      }
    });
    if (!updates.length) return;
    emit();
    Promise.all(updates.map((u) => api.updateSessionPosition(u.id, u.position))).catch((error) =>
      handleMutationError('Falha ao reindexar sessões', error)
    );
  }

  function addTag({ name, color }) {
    const tempId = `tmp-${utils.uid()}`;
    const optimistic = { id: tempId, name: name.trim(), color: color || '#6c5ce7', isFavorite: false };
    state.tags.push(optimistic);
    emit();

    return api.insertTagRow(currentUserId, optimistic).then(({ data, error }) => {
      if (error) {
        state.tags = state.tags.filter((t) => t.id !== tempId);
        emit();
        handleMutationError('Falha ao criar etiqueta', error);
        return null;
      }
      const idx = state.tags.findIndex((t) => t.id === tempId);
      const finalTag = mapTagFromRow(data);
      if (idx !== -1) state.tags[idx] = finalTag;
      emit();
      return finalTag;
    });
  }

  function updateTag(id, { name, color }) {
    const tag = state.tags.find((t) => t.id === id);
    if (!tag) return;
    const previous = { ...tag };
    tag.name = name.trim();
    tag.color = color;
    emit();

    api.updateTagRow(id, { name: tag.name, color: tag.color }).then(({ error }) => {
      if (error) {
        Object.assign(tag, previous);
        emit();
        handleMutationError('Falha ao atualizar etiqueta', error);
      }
    });
  }

  function deleteTag(id) {
    const removedTag = state.tags.find((t) => t.id === id);
    const removedFromTasks = [];
    Object.keys(state.taskTags).forEach((taskId) => {
      if (state.taskTags[taskId].includes(id)) {
        removedFromTasks.push(taskId);
        state.taskTags[taskId] = state.taskTags[taskId].filter((tagId) => tagId !== id);
      }
    });
    state.tags = state.tags.filter((t) => t.id !== id);
    if (state.ui.tagFilter === id) state.ui.tagFilter = null;
    persistUi();
    emit();

    api.deleteTagRow(id).then(({ error }) => {
      if (error) {
        if (removedTag) state.tags.push(removedTag);
        removedFromTasks.forEach((taskId) => {
          if (!state.taskTags[taskId]) state.taskTags[taskId] = [];
          state.taskTags[taskId].push(id);
        });
        emit();
        handleMutationError('Falha ao excluir etiqueta', error);
      }
    });
  }

  function toggleTagFavorite(id) {
    const tag = state.tags.find((t) => t.id === id);
    if (!tag) return;
    const previous = tag.isFavorite;
    tag.isFavorite = !previous;
    emit();

    api.updateTagFavorite(id, tag.isFavorite).then(({ error }) => {
      if (error) {
        tag.isFavorite = previous;
        emit();
        handleMutationError('Falha ao favoritar etiqueta', error);
      }
    });
  }

  function addTagToTask(taskId, tagId) {
    if (!state.taskTags[taskId]) state.taskTags[taskId] = [];
    if (state.taskTags[taskId].includes(tagId)) return;
    state.taskTags[taskId].push(tagId);
    emit();

    api.insertTaskTag(taskId, tagId).then(({ error }) => {
      if (error) {
        state.taskTags[taskId] = state.taskTags[taskId].filter((id) => id !== tagId);
        emit();
        handleMutationError('Falha ao vincular etiqueta', error);
      }
    });
  }

  function removeTagFromTask(taskId, tagId) {
    if (!state.taskTags[taskId] || !state.taskTags[taskId].includes(tagId)) return;
    state.taskTags[taskId] = state.taskTags[taskId].filter((id) => id !== tagId);
    emit();

    api.deleteTaskTag(taskId, tagId).then(({ error }) => {
      if (error) {
        state.taskTags[taskId].push(tagId);
        emit();
        handleMutationError('Falha ao remover etiqueta', error);
      }
    });
  }

  // Carregado sob demanda, ao abrir o modal de edição de uma tarefa já
  // salva — não faz parte de loadInitialData (a maioria das tarefas nunca
  // tem comentário, não vale a pena trazer isso tudo no boot geral).
  async function loadComments(taskId) {
    const { data, error } = await api.fetchComments(taskId);
    if (error) {
      handleMutationError('Falha ao carregar comentários', error);
      return;
    }
    state.commentsByTask[taskId] = (data || []).map(mapCommentFromRow);
    emit();
  }

  function addComment(taskId, content) {
    const trimmed = content.trim();
    if (!trimmed) return;
    const tempId = `tmp-${utils.uid()}`;
    if (!state.commentsByTask[taskId]) state.commentsByTask[taskId] = [];
    const optimistic = { id: tempId, taskId, userId: currentUserId, content: trimmed, createdAt: new Date().toISOString() };
    state.commentsByTask[taskId].push(optimistic);
    emit();

    api.insertComment({ user_id: currentUserId, task_id: taskId, content: trimmed }).then(({ data, error }) => {
      if (error) {
        state.commentsByTask[taskId] = state.commentsByTask[taskId].filter((c) => c.id !== tempId);
        emit();
        handleMutationError('Falha ao adicionar comentário', error);
        return;
      }
      const idx = state.commentsByTask[taskId].findIndex((c) => c.id === tempId);
      if (idx !== -1) state.commentsByTask[taskId][idx] = mapCommentFromRow(data);
      emit();
    });
  }

  // Assinatura de 1 argumento só — commentsByTask é um mapa por-tarefa (não
  // uma lista única como apiTokens), então varremos as chaves pra achar em
  // qual tarefa o comentário está antes de remover/reverter.
  function deleteComment(id) {
    const taskId = Object.keys(state.commentsByTask).find((key) => state.commentsByTask[key].some((c) => c.id === id));
    if (!taskId) return;
    const list = state.commentsByTask[taskId];
    const removedIndex = list.findIndex((c) => c.id === id);
    const removed = list[removedIndex];
    state.commentsByTask[taskId] = list.filter((c) => c.id !== id);
    emit();

    api.deleteCommentRow(id).then(({ error }) => {
      if (error) {
        state.commentsByTask[taskId].splice(removedIndex, 0, removed);
        emit();
        handleMutationError('Falha ao excluir comentário', error);
      }
    });
  }

  // Retorna uma Promise que resolve com a tarefa final (já com o id de
  // verdade do Supabase) ou null se a criação falhar — usado pelo modal
  // de criação para só criar as subtarefas depois que a tarefa mãe tiver
  // sido salva de verdade.
  function addTask({ title, projectId, sessionId, dueDate, dueTime, recurrence, description, parentTaskId }) {
    const tempId = `tmp-${utils.uid()}`;
    const optimistic = {
      id: tempId,
      title: title.trim(),
      projectId: projectId || null,
      sessionId: sessionId || null,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      recurring: !!recurrence,
      recurrence: recurrence || null,
      description: description || null,
      status: 'todo',
      completedDate: null,
      parentTaskId: parentTaskId || null,
      createdAt: Date.now()
    };
    state.tasks.push(optimistic);
    emit();

    return api.insertTask(currentUserId, optimistic).then(({ data, error }) => {
      if (error) {
        state.tasks = state.tasks.filter((t) => t.id !== tempId);
        emit();
        handleMutationError('Falha ao criar tarefa', error);
        return null;
      }
      const idx = state.tasks.findIndex((t) => t.id === tempId);
      const finalTask = mapTaskFromRow(data);
      if (idx !== -1) state.tasks[idx] = finalTask;
      emit();
      return finalTask;
    });
  }

  // Subtarefa: só título + concluída, sem data/projeto/sessão/recorrência próprios.
  function addSubtask(parentTaskId, title) {
    return addTask({ title, projectId: null, sessionId: null, dueDate: null, recurring: false, parentTaskId });
  }

  function updateTask(id, { title, projectId, sessionId, dueDate, dueTime, recurrence, description }) {
    const t = state.tasks.find((t) => t.id === id);
    if (!t) return;
    const previous = { ...t };
    t.title = title.trim();
    t.projectId = projectId || null;
    t.sessionId = sessionId || null;
    t.dueDate = dueDate || null;
    t.dueTime = dueTime || null;
    t.recurrence = recurrence || null;
    t.recurring = !!recurrence;
    t.description = description || null;
    emit();

    api
      .updateTaskRow(id, {
        title: t.title,
        projectId: t.projectId,
        sessionId: t.sessionId,
        dueDate: t.dueDate,
        dueTime: t.dueTime,
        recurrence: t.recurrence,
        description: t.description
      })
      .then(({ error }) => {
        if (error) {
          Object.assign(t, previous);
          emit();
          handleMutationError('Falha ao atualizar tarefa', error);
        }
      });
  }

  function deleteTask(id) {
    // Apagar uma tarefa done (ou uma mãe com subtarefas done) muda os totais
    // agregados de "Minhas estatísticas" — invalida o cache.
    state.statsLoaded = false;
    const removedIndex = state.tasks.findIndex((t) => t.id === id);
    const removed = state.tasks[removedIndex];
    // Espelha o "on delete cascade" do banco: apagar a tarefa mãe também
    // some com as subtarefas dela localmente.
    const removedSubtasks = state.tasks.filter((t) => t.parentTaskId === id);
    state.tasks = state.tasks.filter((t) => t.id !== id && t.parentTaskId !== id);
    emit();

    api.deleteTaskRow(id).then(({ error }) => {
      if (error) {
        if (removed) state.tasks.splice(removedIndex, 0, removed);
        state.tasks = state.tasks.concat(removedSubtasks);
        emit();
        handleMutationError('Falha ao excluir tarefa', error);
      }
    });
  }

  function setTaskStatus(id, status) {
    const t = state.tasks.find((t) => t.id === id);
    if (!t) return;

    // Ponto único de invalidação do cache de "Minhas estatísticas": cobre
    // concluir, desmarcar/reabrir, recorrente e subtarefa (todas passam por
    // aqui), sem precisar espalhar isso pelos vários handlers de UI.
    state.statsLoaded = false;

    // Tarefa com regra de recorrência: concluir nunca marca 'done' de
    // verdade — grava a conclusão no histórico (task_completions) e avança
    // due_date pra próxima ocorrência (App.recurrence.nextOccurrence). Só
    // vira 'done' de fato quando a regra já esgotou (`until` alcançado,
    // nextOccurrence devolve null). Substitui o modelo antigo de reabertura
    // diária (normalizeRecurringTasksOnce, removida — ver loadInitialData).
    if (t.recurrence && status === 'done') {
      const today = utils.todayISO();
      const next = App.recurrence.nextOccurrence(t.recurrence, t.dueDate, today);

      if (next) {
        const previousDueDate = t.dueDate;
        t.dueDate = next;
        emit();
        api.updateTaskDueDate(id, next).then(({ error }) => {
          if (error) {
            t.dueDate = previousDueDate;
            emit();
            handleMutationError('Falha ao avançar tarefa recorrente', error);
          }
        });
      } else {
        const previous = { status: t.status, completedDate: t.completedDate };
        t.status = 'done';
        t.completedDate = today;
        emit();
        api.updateTaskStatusRow(id, 'done', today).then(({ error }) => {
          if (error) {
            Object.assign(t, previous);
            emit();
            handleMutationError('Falha ao atualizar status da tarefa', error);
          }
        });
      }

      api.insertTaskCompletion(currentUserId, id, today).then(({ error }) => {
        if (error) handleMutationError('Falha ao registrar conclusão da tarefa recorrente', error);
      });
      return;
    }

    const previous = { status: t.status, completedDate: t.completedDate };
    t.status = status;
    if (status === 'done') {
      t.completedDate = utils.todayISO();
    } else if (!t.recurring) {
      t.completedDate = null;
    }
    // Numa recorrente, desmarcar não apaga completedDate — ele continua
    // valendo como "última vez que foi concluída de verdade" (usado pra
    // mostrar desde quando ela está atrasada, ver taskMetaHtml).
    emit();

    api.updateTaskStatusRow(id, t.status, t.completedDate).then(({ error }) => {
      if (error) {
        Object.assign(t, previous);
        emit();
        handleMutationError('Falha ao atualizar status da tarefa', error);
      }
    });
  }

  function toggleComplete(id) {
    const t = state.tasks.find((t) => t.id === id);
    if (!t) return;
    setTaskStatus(id, t.status === 'done' ? 'todo' : 'done');
  }

  // Import do Todoist: sem update otimista (é uma inserção em lote de
  // projeto+sessões+tarefas+subtarefas, não uma mutação isolada) — usa um
  // estado de loading e recarrega tudo do banco no final. Se qualquer etapa
  // falhar, o que já foi inserido fica inserido (sem rollback parcial).
  async function importTodoistProject(parsed, projectName, tagChoices) {
    state.importStatus = { loading: true, error: null };
    emit();
    try {
      const { data: projectRow, error: pErr } = await api.insertProject(currentUserId, {
        name: projectName.trim(),
        color: '#6c5ce7'
      });
      if (pErr) throw pErr;

      // parsed.sections[0] é sempre a seção sintética "Sem seção" (nunca vira
      // sessão de verdade) — só as demais são sessões reais do projeto.
      const realSections = parsed.sections.slice(1);
      let sessionRows = [];
      if (realSections.length > 0) {
        const { data, error } = await api.insertSessionsBatch(
          realSections.map((s) => ({ user_id: currentUserId, project_id: projectRow.id, name: s.name }))
        );
        if (error) throw error;
        sessionRows = data;
      }

      const groups = [
        { sessionId: null, tasks: parsed.sections[0].tasks },
        ...realSections.map((s, i) => ({ sessionId: sessionRows[i].id, tasks: s.tasks }))
      ];
      const plan = [];
      groups.forEach((g) => g.tasks.forEach((task) => plan.push({ task, sessionId: g.sessionId })));

      const toRow = (task, sessionId, parentTaskId) => {
        const d = App.importTodoist.parseTodoistDate(task.dateRaw, task.dateLang);
        return {
          user_id: currentUserId,
          project_id: parentTaskId ? null : projectRow.id,
          session_id: parentTaskId ? null : sessionId,
          title: task.title,
          due_date: d.dueDate,
          due_time: d.dueTime,
          recurrence: d.recurrence,
          recurring: !!d.recurrence,
          description: task.description || null,
          status: 'todo',
          completed_date: null,
          parent_task_id: parentTaskId || null
        };
      };

      let topLevelRows = [];
      if (plan.length > 0) {
        const { data, error } = await api.insertTasksBatch(plan.map((p) => toRow(p.task, p.sessionId, null)));
        if (error) throw error;
        topLevelRows = data;
      }

      // Qualquer nível de indentação abaixo do nível 1 (o Todoist permite
      // indent 3+) vira subtarefa direta da tarefa de nível 1 mais próxima —
      // nosso modelo só tem 1 nível de subtarefa. subtaskNodes fica em
      // paralelo a subtaskRows (mesma ordem) pra depois casar cada linha
      // inserida com o nó original, que carrega os comentários dela.
      const subtaskNodes = [];
      const subtaskRows = [];
      plan.forEach((p, i) => {
        const parentId = topLevelRows[i].id;
        const flatten = (nodes) =>
          nodes.forEach((n) => {
            subtaskRows.push(toRow(n, null, parentId));
            subtaskNodes.push(n);
            if (n.children && n.children.length) flatten(n.children);
          });
        flatten(p.task.children);
      });
      let subtaskInsertedRows = [];
      if (subtaskRows.length > 0) {
        const { data, error } = await api.insertTasksBatch(subtaskRows);
        if (error) throw error;
        subtaskInsertedRows = data;
      }

      // Etiquetas: cria em lote as marcadas como 'create', monta um mapa
      // nome-normalizado -> tagId real (combinando recém-criadas + vinculadas a
      // existentes escolhidas no preview), depois vincula em lote via
      // task_tags. Usa App.importTodoist.normalizeTagKey (não um
      // .toLowerCase() local) pra garantir a MESMA regra de acento/caixa usada
      // no casamento do preview — uma segunda normalização reimplementada aqui
      // poderia divergir sutilmente e vincular à etiqueta errada sem erro
      // nenhum. Ordem importa: tags e tasks precisam existir ANTES do insert
      // de task_tags (RLS de task_tags_insert_own exige as duas).
      const normalizeTagKey = App.importTodoist.normalizeTagKey;
      const tagIdByName = {};
      (tagChoices || []).forEach((c) => {
        if (c.action === 'link') tagIdByName[normalizeTagKey(c.name)] = c.tagId;
      });
      const toCreate = (tagChoices || []).filter((c) => c.action === 'create');
      if (toCreate.length > 0) {
        const { data, error } = await api.insertTagsBatch(toCreate.map((c) => ({ user_id: currentUserId, name: c.name })));
        if (error) throw error;
        // Correlação posicional por índice (mesmo padrão do resto da função) —
        // data[i] corresponde a toCreate[i] na mesma ordem de envio.
        toCreate.forEach((c, i) => {
          tagIdByName[normalizeTagKey(c.name)] = data[i].id;
        });
      }

      const seenPairs = new Set();
      const taskTagRows = [];
      const pushTagRows = (node, taskId) => {
        (node.tagNames || []).forEach((name) => {
          const tagId = tagIdByName[normalizeTagKey(name)];
          const key = `${taskId}:${tagId}`;
          if (!tagId || seenPairs.has(key)) return;
          seenPairs.add(key);
          taskTagRows.push({ task_id: taskId, tag_id: tagId });
        });
      };
      plan.forEach((p, i) => pushTagRows(p.task, topLevelRows[i].id));
      subtaskNodes.forEach((n, i) => pushTagRows(n, subtaskInsertedRows[i].id));
      if (taskTagRows.length > 0) {
        const { error } = await api.insertTaskTagsBatch(taskTagRows);
        if (error) throw error;
      }

      // Comentários das tarefas (notas do Todoist) — casados pelos ids reais
      // recém-recebidos, na mesma ordem posicional de plan/topLevelRows e
      // subtaskNodes/subtaskInsertedRows. created_at explícito preserva a
      // data original da nota (sobrescreve o default now() da coluna).
      const commentRows = [];
      plan.forEach((p, i) => {
        (p.task.comments || []).forEach((c) => {
          commentRows.push({ user_id: currentUserId, task_id: topLevelRows[i].id, content: c.content, created_at: c.createdAt });
        });
      });
      subtaskNodes.forEach((n, i) => {
        (n.comments || []).forEach((c) => {
          commentRows.push({ user_id: currentUserId, task_id: subtaskInsertedRows[i].id, content: c.content, created_at: c.createdAt });
        });
      });
      if (commentRows.length > 0) {
        const { error } = await api.insertCommentsBatch(commentRows);
        if (error) throw error;
      }

      await loadInitialData(currentUserId);
      state.importStatus = { loading: false, error: null };
      emit();
      return { ok: true };
    } catch (err) {
      state.importStatus = { loading: false, error: err };
      emit();
      handleMutationError('Falha ao importar do Todoist (import ficou incompleto)', err);
      return { ok: false, error: err };
    }
  }

  // Preferências de UI (view/period/filtro/tema): locais por dispositivo,
  // nunca sincronizadas com o Supabase.
  function setView(view) {
    state.ui.view = view;
    persistUi();
    emit();
  }

  function setPeriod(period) {
    state.ui.screen = 'tasks';
    state.ui.period = period;
    state.ui.recurringOnly = false;
    persistUi();
    emit();
  }

  function setProjectFilter(projectId) {
    state.ui.screen = 'tasks';
    state.ui.projectFilter = projectId;
    state.ui.tagFilter = null;
    state.ui.recurringOnly = false;
    persistUi();
    emit();
  }

  // Filtro por etiqueta é global (não amarrado a um projeto): selecionar
  // uma etiqueta favorita mostra a tarefa em qualquer projeto que ela
  // esteja, por isso zera o filtro de projeto (mesmo "um filtro por vez"
  // que já existia entre projeto e período).
  function setTagFilter(tagId) {
    state.ui.screen = 'tasks';
    state.ui.tagFilter = tagId;
    state.ui.projectFilter = 'all';
    state.ui.recurringOnly = false;
    persistUi();
    emit();
  }

  // Visão global "Recorrentes" (atalho da lateral) — mesmo padrão de
  // mútua exclusão: ligar ela não mexe em projeto/etiqueta/período aqui
  // (quem chama já reseta o filtro de projeto antes, ver app.js), mas
  // qualquer um dos outros filtros acima desliga ela de volta.
  function setRecurringOnly(value) {
    state.ui.screen = 'tasks';
    state.ui.recurringOnly = !!value;
    persistUi();
    emit();
  }

  // Tela "Campanhas": ortogonal a período/projeto/etiqueta — trocar de tela
  // preserva o filtro que estava ativo antes. Os 4 setters acima já voltam
  // pra 'tasks' de graça (são o ponto de entrada de toda navegação de
  // filtro); a exceção manual é a aba mobile "Buscar" (ver js/app.js).
  // "stats" (Minhas estatísticas) segue a mesma regra de "campaigns".
  function setScreen(screen) {
    state.ui.screen = ['campaigns', 'stats'].includes(screen) ? screen : 'tasks';
    persistUi();
    emit();
  }

  function setSearchQuery(text) {
    state.search = text || '';
    emit();
  }

  function setTheme(theme) {
    state.ui.theme = ['light', 'dark', 'system'].includes(theme) ? theme : 'system';
    persistUi();
    emit();
  }

  function setGroupByProject(groupByProject) {
    state.ui.groupByProject = !!groupByProject;
    persistUi();
    emit();
  }

  function setShowCompleted(showCompleted) {
    state.ui.showCompleted = !!showCompleted;
    persistUi();
    emit();
  }

  // "Encerrar" tira a campanha da lista padrão sem escondê-la de vez —
  // este toggle é como ela continua acessível (persiste, igual showCompleted).
  function setShowEncerradas(showEncerradas) {
    state.ui.showEncerradas = !!showEncerradas;
    persistUi();
    emit();
  }

  App.store = {
    getState,
    getFilteredTasks,
    getSubtasks,
    getTaskTags,
    getComments,
    getSessionsForProject,
    getApiTokens,
    loadApiTokens,
    createApiToken,
    deleteApiToken,
    getCampaignClientCounts,
    getCampaignMetrics,
    loadCampaigns,
    loadStats,
    createCampaignWithClients,
    addCampaignClient,
    openCampaignDetail,
    updateCampaignClientField,
    processCertificateAlerts,
    setCampaignStatus,
    updateCampaignAlertDays,
    deleteCampaign,
    deleteCampaignClient,
    setCampaignClientStatusFilter,
    setCampaignClientSearch,
    subscribe,
    setAuthErrorHandler,
    loadInitialData,
    clearState,
    addProject,
    updateProject,
    deleteProject,
    toggleProjectFavorite,
    reorderProjects,
    reorderProjectsBoard,
    addSession,
    updateSession,
    deleteSession,
    reorderSessions,
    addTag,
    updateTag,
    deleteTag,
    toggleTagFavorite,
    addTagToTask,
    removeTagFromTask,
    loadComments,
    addComment,
    deleteComment,
    addTask,
    addSubtask,
    updateTask,
    deleteTask,
    setTaskStatus,
    toggleComplete,
    importTodoistProject,
    setView,
    setPeriod,
    setProjectFilter,
    setTagFilter,
    setRecurringOnly,
    setScreen,
    setSearchQuery,
    setTheme,
    setGroupByProject,
    setShowCompleted,
    setShowEncerradas
  };
})(window.App = window.App || {});
