(function (App) {
  const OLD_STATE_KEY = 'todolist.state.v1';
  const MIGRATED_FLAG_KEY = 'todolist.migrated.v1';

  async function migrateIfNeeded(userId) {
    if (localStorage.getItem(MIGRATED_FLAG_KEY)) return;

    const raw = localStorage.getItem(OLD_STATE_KEY);
    if (!raw) {
      localStorage.setItem(MIGRATED_FLAG_KEY, '1');
      return;
    }

    let oldState;
    try {
      oldState = JSON.parse(raw);
    } catch (e) {
      localStorage.setItem(MIGRATED_FLAG_KEY, '1');
      return;
    }

    if (!oldState || !Array.isArray(oldState.projects) || !Array.isArray(oldState.tasks)) {
      localStorage.setItem(MIGRATED_FLAG_KEY, '1');
      return;
    }

    if (oldState.projects.length === 0 && oldState.tasks.length === 0) {
      localStorage.setItem(MIGRATED_FLAG_KEY, '1');
      return;
    }

    const { data: existingProjects } = await App.api.fetchProjects();
    const { data: existingTasks } = await App.api.fetchTasks();
    if ((existingProjects && existingProjects.length) || (existingTasks && existingTasks.length)) {
      // Já existem dados remotos para este usuário: não sobrescreve nem duplica.
      localStorage.setItem(MIGRATED_FLAG_KEY, '1');
      return;
    }

    try {
      const projectIdMap = {};

      if (oldState.projects.length) {
        const rows = oldState.projects.map((p) => ({ user_id: userId, name: p.name, color: p.color }));
        const { data, error } = await App.api.insertProjectsBatch(rows);
        if (error) throw error;
        oldState.projects.forEach((p, i) => {
          projectIdMap[p.id] = data[i].id;
        });
      }

      if (oldState.tasks.length) {
        const rows = oldState.tasks.map((t) => ({
          user_id: userId,
          project_id: t.projectId ? projectIdMap[t.projectId] || null : null,
          title: t.title,
          due_date: t.dueDate || null,
          recurring: !!t.recurring,
          status: t.status || 'todo',
          completed_date: t.completedDate || null
        }));
        const { error } = await App.api.insertTasksBatch(rows);
        if (error) throw error;
      }

      localStorage.setItem(MIGRATED_FLAG_KEY, '1');
      localStorage.setItem(`${OLD_STATE_KEY}.backup`, raw);
      localStorage.removeItem(OLD_STATE_KEY);
    } catch (err) {
      // Não marca como migrado: tenta de novo no próximo login em vez de perder dados silenciosamente.
      console.error('Falha ao migrar dados locais para o Supabase, tentaremos de novo no próximo login.', err);
    }
  }

  App.migrate = { migrateIfNeeded };
})(window.App = window.App || {});
