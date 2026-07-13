(function (App) {
  const { supabaseClient, utils } = App;

  function fetchProjects() {
    return supabaseClient
      .from('projects')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
  }

  // Não traz tarefas concluídas há mais de 60 dias (reduz o payload pra
  // contas antigas com muito histórico), exceto quando isso quebraria
  // lógica local que depende de enxergar a linha inteira:
  // - status.neq.done            → toda tarefa em aberto, sempre.
  // - and(status.eq.done,...)    → concluídas, só dos últimos 60 dias.
  // - recurrence.not.is.null     → tarefa com regra de recorrência: no
  //   modelo novo ela quase nunca fica 'done' de verdade (concluir só
  //   avança due_date, ver setTaskStatus em store.js) — essa condição é
  //   principalmente uma rede de segurança pro caso de a regra já ter
  //   esgotado (`until` alcançado) há mais de 60 dias.
  // - parent_task_id.not.is.null → subtarefas sempre vêm, mesmo concluídas
  //   há muito tempo, senão o contador "concluídas/total" da tarefa-mãe
  //   (render.js) fica errado quando a mãe continua em aberto.
  function fetchTasks() {
    const cutoffDate = utils.addDaysISO(utils.todayISO(), -60);
    return supabaseClient
      .from('tasks')
      .select('*')
      .or(`status.neq.done,and(status.eq.done,completed_date.gte.${cutoffDate}),recurrence.not.is.null,parent_task_id.not.is.null`)
      .order('created_at', { ascending: true });
  }

  function insertProject(userId, { name, color, position, boardPosition }) {
    return supabaseClient
      .from('projects')
      .insert({ user_id: userId, name, color, position, board_position: boardPosition })
      .select()
      .single();
  }

  function updateProjectRow(id, { name, color }) {
    return supabaseClient.from('projects').update({ name, color }).eq('id', id).select().single();
  }

  function updateProjectFavorite(id, isFavorite) {
    return supabaseClient.from('projects').update({ is_favorite: isFavorite }).eq('id', id).select().single();
  }

  function updateProjectPosition(id, position) {
    return supabaseClient.from('projects').update({ position }).eq('id', id).select().single();
  }

  function updateProjectBoardPosition(id, boardPosition) {
    return supabaseClient.from('projects').update({ board_position: boardPosition }).eq('id', id).select().single();
  }

  function deleteProjectRow(id) {
    return supabaseClient.from('projects').delete().eq('id', id);
  }

  // Apaga as tarefas do projeto e o projeto numa única transação no banco
  // (RPC security definer, 0010_delete_project_rpc.sql) — substitui o par
  // deleteTasksByProject + deleteProjectRow, que não era atômico.
  function deleteProjectCascade(id) {
    return supabaseClient.rpc('delete_project_cascade', { p_project_id: id });
  }

  function fetchTags() {
    return supabaseClient.from('tags').select('*').order('created_at', { ascending: true });
  }

  function fetchTaskTags() {
    return supabaseClient.from('task_tags').select('task_id, tag_id');
  }

  function insertTagRow(userId, { name, color }) {
    return supabaseClient
      .from('tags')
      .insert({ user_id: userId, name, color })
      .select()
      .single();
  }

  function updateTagRow(id, { name, color }) {
    return supabaseClient.from('tags').update({ name, color }).eq('id', id).select().single();
  }

  function updateTagFavorite(id, isFavorite) {
    return supabaseClient.from('tags').update({ is_favorite: isFavorite }).eq('id', id).select().single();
  }

  function deleteTagRow(id) {
    return supabaseClient.from('tags').delete().eq('id', id);
  }

  function insertTaskTag(taskId, tagId) {
    return supabaseClient.from('task_tags').insert({ task_id: taskId, tag_id: tagId });
  }

  function deleteTaskTag(taskId, tagId) {
    return supabaseClient.from('task_tags').delete().eq('task_id', taskId).eq('tag_id', tagId);
  }

  // Usados pelo import do Todoist (etiquetas extraídas de @token no
  // título) — mesmo molde de insertSessionsBatch/insertTasksBatch/
  // insertCommentsBatch.
  function insertTagsBatch(rows) {
    return supabaseClient.from('tags').insert(rows).select();
  }

  function insertTaskTagsBatch(rows) {
    return supabaseClient.from('task_tags').insert(rows).select();
  }

  function deleteTasksByProject(projectId) {
    return supabaseClient.from('tasks').delete().eq('project_id', projectId);
  }

  function fetchSessions() {
    return supabaseClient
      .from('sessions')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
  }

  function insertSessionRow(userId, { projectId, name, position }) {
    return supabaseClient
      .from('sessions')
      .insert({ user_id: userId, project_id: projectId, name, position })
      .select()
      .single();
  }

  function updateSessionRow(id, { name }) {
    return supabaseClient.from('sessions').update({ name }).eq('id', id).select().single();
  }

  function updateSessionPosition(id, position) {
    return supabaseClient.from('sessions').update({ position }).eq('id', id).select().single();
  }

  function deleteSessionRow(id) {
    return supabaseClient.from('sessions').delete().eq('id', id);
  }

  // Insere várias sessões de uma vez (usado pelo import do Todoist) — o
  // chamador monta as linhas prontas (snake_case), mesmo padrão de
  // insertProjectsBatch/insertTasksBatch.
  function insertSessionsBatch(rows) {
    return supabaseClient.from('sessions').insert(rows).select();
  }

  function insertTask(userId, { title, projectId, sessionId, dueDate, dueTime, recurrence, description, parentTaskId }) {
    return supabaseClient
      .from('tasks')
      .insert({
        user_id: userId,
        project_id: projectId || null,
        session_id: sessionId || null,
        title,
        due_date: dueDate || null,
        due_time: dueTime || null,
        recurrence: recurrence || null,
        description: description || null,
        // Coluna antiga (boolean), ainda existe (0011 não a removeu de
        // propósito) — mantida derivada, coerente com quem ainda ler ela
        // direto até a migration que a remove de vez.
        recurring: !!recurrence,
        status: 'todo',
        completed_date: null,
        parent_task_id: parentTaskId || null
      })
      .select()
      .single();
  }

  function updateTaskRow(id, { title, projectId, sessionId, dueDate, dueTime, recurrence, description }) {
    return supabaseClient
      .from('tasks')
      .update({
        title,
        project_id: projectId || null,
        session_id: sessionId || null,
        due_date: dueDate || null,
        due_time: dueTime || null,
        recurrence: recurrence || null,
        recurring: !!recurrence,
        description: description || null
      })
      .eq('id', id)
      .select()
      .single();
  }

  function deleteTaskRow(id) {
    return supabaseClient.from('tasks').delete().eq('id', id);
  }

  function updateTaskStatusRow(id, status, completedDate) {
    return supabaseClient
      .from('tasks')
      .update({ status, completed_date: completedDate })
      .eq('id', id)
      .select()
      .single();
  }

  // Registra uma conclusão de tarefa recorrente no histórico (tabela nova,
  // 0011_recurrence_todoist.sql) — cada vez que uma recorrente é concluída
  // vira uma linha aqui, além de tasks.completed_date guardar só a última.
  function insertTaskCompletion(userId, taskId, dateISO) {
    return supabaseClient.from('task_completions').insert({ user_id: userId, task_id: taskId, completed_on: dateISO });
  }

  // Update mínimo só de due_date — usado quando setTaskStatus avança uma
  // tarefa recorrente pra próxima ocorrência (sem mexer em status/completed_date).
  function updateTaskDueDate(id, dueDateISO) {
    return supabaseClient.from('tasks').update({ due_date: dueDateISO }).eq('id', id).select().single();
  }

  // Reabre em lote (1 chamada só) — usado por normalizeRecurringTasksOnce
  // pra reabrir várias recorrentes de uma vez. Só muda status; completed_date
  // de cada linha fica intocado (continua guardando a última conclusão real).
  function reopenTasksBatch(ids) {
    return supabaseClient.from('tasks').update({ status: 'todo' }).in('id', ids);
  }

  // Comentários de uma tarefa (0012_description_comments.sql) — carregados
  // sob demanda (ver store.loadComments), não fazem parte de fetchTasks.
  function fetchComments(taskId) {
    return supabaseClient
      .from('task_comments')
      .select('id,task_id,user_id,content,created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
  }

  // O chamador monta a linha pronta (mesmo padrão de insertSessionsBatch/
  // insertTasksBatch, só que sem lote e com .single() no retorno).
  function insertComment(row) {
    return supabaseClient.from('task_comments').insert(row).select().single();
  }

  function deleteCommentRow(id) {
    return supabaseClient.from('task_comments').delete().eq('id', id);
  }

  // Insere vários comentários de uma vez (usado pelo import do Todoist) —
  // mesmo padrão de insertSessionsBatch/insertTasksBatch.
  function insertCommentsBatch(rows) {
    return supabaseClient.from('task_comments').insert(rows).select();
  }

  function insertProjectsBatch(rows) {
    return supabaseClient.from('projects').insert(rows).select();
  }

  function insertTasksBatch(rows) {
    return supabaseClient.from('tasks').insert(rows).select();
  }

  function fetchCampaigns() {
    return supabaseClient.from('campaigns').select('*').order('created_at', { ascending: false });
  }

  // Sem filtro por campaign_id aqui — RLS já restringe ao dono; a
  // filtragem por campanha acontece em memória no store (mesmo padrão de
  // getSessionsForProject).
  function fetchCampaignClients() {
    return supabaseClient.from('campaign_clients').select('*');
  }

  function insertCampaign(userId, {
    name,
    trialDays,
    followupProjectId,
    followupSessionId,
    fup1Date,
    fup2Date,
    fup3Date,
    fup1Message,
    fup2Message,
    fup3Message
  }) {
    return supabaseClient
      .from('campaigns')
      .insert({
        user_id: userId,
        name,
        trial_days: trialDays,
        followup_project_id: followupProjectId || null,
        followup_session_id: followupSessionId || null,
        fup1_date: fup1Date || null,
        fup2_date: fup2Date || null,
        fup3_date: fup3Date || null,
        fup1_message: fup1Message || null,
        fup2_message: fup2Message || null,
        fup3_message: fup3Message || null
      })
      .select()
      .single();
  }

  // Insere vários clientes de uma vez (usado pela criação de campanha) — o
  // chamador monta as linhas prontas (snake_case), mesmo padrão de
  // insertSessionsBatch/insertTasksBatch.
  function insertCampaignClientsBatch(rows) {
    return supabaseClient.from('campaign_clients').insert(rows).select();
  }

  // Payload condicional (mesmo padrão de updateProfile) — patch é um objeto
  // parcial em camelCase, só os campos presentes viram coluna no update.
  function updateCampaignClientRow(id, patch) {
    const payload = {};
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.fup1Sent !== undefined) payload.fup1_sent = patch.fup1Sent;
    if (patch.fup2Sent !== undefined) payload.fup2_sent = patch.fup2Sent;
    if (patch.fup3Sent !== undefined) payload.fup3_sent = patch.fup3Sent;
    if (patch.trialStart !== undefined) payload.trial_start = patch.trialStart;
    if (patch.mrr !== undefined) payload.mrr = patch.mrr;
    if (patch.notes !== undefined) payload.notes = patch.notes;
    return supabaseClient.from('campaign_clients').update(payload).eq('id', id).select().single();
  }

  // Mesmo formato condicional — só status é usado nesta fase, mas escrito
  // genérico pra reaproveitar se outros campos de campanha virarem editáveis.
  function updateCampaignRow(id, patch) {
    const payload = {};
    if (patch.status !== undefined) payload.status = patch.status;
    return supabaseClient.from('campaigns').update(payload).eq('id', id).select().single();
  }

  // DELETE simples — campaign_clients.campaign_id tem "on delete cascade"
  // (migration 0015), então o banco já cuida dos clientes sozinho, sem RPC.
  function deleteCampaignRow(id) {
    return supabaseClient.from('campaigns').delete().eq('id', id);
  }

  async function fetchAdminStats() {
    const { data, error } = await supabaseClient.rpc('admin_dashboard_stats');
    if (error) throw error;
    return data;
  }

  async function fetchAdminTasksByWeekday() {
    const { data, error } = await supabaseClient.rpc('admin_tasks_by_weekday');
    if (error) throw error;
    return data || [];
  }

  async function fetchAdminUserList() {
    const { data, error } = await supabaseClient.rpc('admin_user_list');
    if (error) throw error;
    return data || [];
  }

  function updateProfile(userId, { displayName, avatarUrl }) {
    const payload = {};
    if (displayName !== undefined) payload.display_name = displayName;
    if (avatarUrl !== undefined) payload.avatar_url = avatarUrl;
    return supabaseClient.from('profiles').update(payload).eq('id', userId).select().single();
  }

  function fetchApiTokens(userId) {
    return supabaseClient
      .from('api_tokens')
      .select('id,name,project_id,session_id,created_at,last_used_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
  }

  async function createApiTokenRpc({ name, projectId, sessionId }) {
    const { data, error } = await supabaseClient.rpc('create_api_token', {
      p_name: name,
      p_project_id: projectId || null,
      p_session_id: sessionId || null
    });
    if (error) throw error;
    return data;
  }

  function deleteApiTokenRow(id) {
    return supabaseClient.from('api_tokens').delete().eq('id', id);
  }

  async function uploadAvatar(userId, file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await supabaseClient.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl }
    } = supabaseClient.storage.from('avatars').getPublicUrl(path);
    // Cache-busting: o caminho é sempre o mesmo (upsert), então sem isso o
    // navegador poderia continuar mostrando a foto antiga em cache.
    return `${publicUrl}?t=${Date.now()}`;
  }

  App.api = {
    fetchProjects,
    fetchTasks,
    insertProject,
    updateProjectRow,
    updateProjectFavorite,
    updateProjectPosition,
    updateProjectBoardPosition,
    deleteProjectRow,
    deleteProjectCascade,
    deleteTasksByProject,
    fetchSessions,
    insertSessionRow,
    insertSessionsBatch,
    updateSessionRow,
    updateSessionPosition,
    deleteSessionRow,
    fetchTags,
    fetchTaskTags,
    insertTagRow,
    updateTagRow,
    updateTagFavorite,
    deleteTagRow,
    insertTaskTag,
    deleteTaskTag,
    insertTagsBatch,
    insertTaskTagsBatch,
    insertTask,
    updateTaskRow,
    deleteTaskRow,
    updateTaskStatusRow,
    reopenTasksBatch,
    insertTaskCompletion,
    updateTaskDueDate,
    fetchComments,
    insertComment,
    deleteCommentRow,
    insertCommentsBatch,
    insertProjectsBatch,
    insertTasksBatch,
    fetchCampaigns,
    fetchCampaignClients,
    insertCampaign,
    insertCampaignClientsBatch,
    updateCampaignClientRow,
    updateCampaignRow,
    deleteCampaignRow,
    fetchAdminStats,
    fetchAdminTasksByWeekday,
    fetchAdminUserList,
    updateProfile,
    uploadAvatar,
    fetchApiTokens,
    createApiTokenRpc,
    deleteApiTokenRow
  };
})(window.App = window.App || {});
