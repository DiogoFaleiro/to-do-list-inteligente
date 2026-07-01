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

  function insertTask(userId, { title, projectId, dueDate, recurring }) {
    return supabaseClient
      .from('tasks')
      .insert({
        user_id: userId,
        project_id: projectId || null,
        title,
        due_date: dueDate || null,
        recurring: !!recurring,
        status: 'todo',
        completed_date: null
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
    fetchAdminStats
  };
})(window.App = window.App || {});
