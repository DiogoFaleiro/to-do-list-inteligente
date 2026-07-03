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

  function deleteProjectRow(id) {
    return supabaseClient.from('projects').delete().eq('id', id);
  }

  function deleteTasksByProject(projectId) {
    return supabaseClient.from('tasks').delete().eq('project_id', projectId);
  }

  function insertTask(userId, { title, projectId, dueDate, recurring, parentTaskId }) {
    return supabaseClient
      .from('tasks')
      .insert({
        user_id: userId,
        project_id: projectId || null,
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

  function updateTaskRow(id, { title, projectId, dueDate, recurring }) {
    return supabaseClient
      .from('tasks')
      .update({
        title,
        project_id: projectId || null,
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
    deleteProjectRow,
    deleteTasksByProject,
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
    uploadAvatar
  };
})(window.App = window.App || {});
