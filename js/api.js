(function (App) {
  const { supabaseClient } = App;

  function fetchProjects() {
    return supabaseClient.from('projects').select('*').order('created_at', { ascending: true });
  }

  function fetchTasks() {
    return supabaseClient.from('tasks').select('*').order('created_at', { ascending: true });
  }

  function insertProject(userId, { name, color }) {
    return supabaseClient
      .from('projects')
      .insert({ user_id: userId, name, color })
      .select()
      .single();
  }

  function updateProjectRow(id, { name, color }) {
    return supabaseClient.from('projects').update({ name, color }).eq('id', id).select().single();
  }

  function updateProjectFavorite(id, isFavorite) {
    return supabaseClient.from('projects').update({ is_favorite: isFavorite }).eq('id', id).select().single();
  }

  function deleteProjectRow(id) {
    return supabaseClient.from('projects').delete().eq('id', id);
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

  function deleteTasksByProject(projectId) {
    return supabaseClient.from('tasks').delete().eq('project_id', projectId);
  }

  function fetchSessions() {
    return supabaseClient.from('sessions').select('*').order('created_at', { ascending: true });
  }

  function insertSessionRow(userId, { projectId, name }) {
    return supabaseClient
      .from('sessions')
      .insert({ user_id: userId, project_id: projectId, name })
      .select()
      .single();
  }

  function updateSessionRow(id, { name }) {
    return supabaseClient.from('sessions').update({ name }).eq('id', id).select().single();
  }

  function deleteSessionRow(id) {
    return supabaseClient.from('sessions').delete().eq('id', id);
  }

  function insertTask(userId, { title, projectId, sessionId, dueDate, recurring, parentTaskId }) {
    return supabaseClient
      .from('tasks')
      .insert({
        user_id: userId,
        project_id: projectId || null,
        session_id: sessionId || null,
        title,
        due_date: dueDate || null,
        recurring: !!recurring,
        status: 'todo',
        completed_date: null,
        parent_task_id: parentTaskId || null
      })
      .select()
      .single();
  }

  function updateTaskRow(id, { title, projectId, sessionId, dueDate, recurring }) {
    return supabaseClient
      .from('tasks')
      .update({
        title,
        project_id: projectId || null,
        session_id: sessionId || null,
        due_date: dueDate || null,
        recurring: !!recurring
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

  function insertProjectsBatch(rows) {
    return supabaseClient.from('projects').insert(rows).select();
  }

  function insertTasksBatch(rows) {
    return supabaseClient.from('tasks').insert(rows).select();
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
    deleteProjectRow,
    deleteTasksByProject,
    fetchSessions,
    insertSessionRow,
    updateSessionRow,
    deleteSessionRow,
    fetchTags,
    fetchTaskTags,
    insertTagRow,
    updateTagRow,
    updateTagFavorite,
    deleteTagRow,
    insertTaskTag,
    deleteTaskTag,
    insertTask,
    updateTaskRow,
    deleteTaskRow,
    updateTaskStatusRow,
    insertProjectsBatch,
    insertTasksBatch,
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
