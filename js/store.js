(function (App) {
  const { utils, localPrefs, api } = App;
  const listeners = [];

  const state = {
    projects: [],
    tasks: [],
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
    if (isAuthError(error) && onAuthError) onAuthError();
  }

  function mapProjectFromRow(row) {
    return { id: row.id, name: row.name, color: row.color };
  }

  function mapTaskFromRow(row) {
    return {
      id: row.id,
      title: row.title,
      projectId: row.project_id,
      dueDate: row.due_date,
      recurring: row.recurring,
      status: row.status,
      completedDate: row.completed_date,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
    };
  }

  function getFilteredTasks() {
    const { tasks, ui } = state;
    const today = utils.todayISO();
    const weekStart = utils.startOfWeek(utils.parseISO(today));
    const weekEnd = utils.endOfWeek(utils.parseISO(today));

    return tasks.filter((t) => {
      if (ui.projectFilter !== 'all' && t.projectId !== ui.projectFilter) return false;
      if (ui.period === 'all') return true;
      if (t.recurring) return true;
      if (!t.dueDate) return false;
      if (ui.period === 'today') return t.dueDate === today;
      if (ui.period === 'week') return utils.isDateInRange(t.dueDate, weekStart, weekEnd);
      if (ui.period === 'month') return t.dueDate.slice(0, 7) === today.slice(0, 7);
      return true;
    });
  }

  // Tarefas diárias "reabrem" automaticamente quando viram o dia. Roda uma
  // vez por carregamento de dados (não a cada render, para não gerar
  // updates de rede redundantes).
  function normalizeRecurringTasksOnce() {
    const today = utils.todayISO();
    state.tasks.forEach((t) => {
      if (t.recurring && t.status === 'done' && t.completedDate !== today) {
        t.status = 'todo';
        t.completedDate = null;
        api.updateTaskStatusRow(t.id, 'todo', null).then(({ error }) => {
          if (error) handleMutationError('Falha ao reabrir tarefa recorrente', error);
        });
      }
    });
  }

  async function loadInitialData(userId) {
    currentUserId = userId;
    const [projectsRes, tasksRes] = await Promise.all([api.fetchProjects(), api.fetchTasks()]);
    if (projectsRes.error) throw projectsRes.error;
    if (tasksRes.error) throw tasksRes.error;

    state.projects = (projectsRes.data || []).map(mapProjectFromRow);
    state.tasks = (tasksRes.data || []).map(mapTaskFromRow);
    normalizeRecurringTasksOnce();
    emit();
  }

  function clearState() {
    currentUserId = null;
    state.projects = [];
    state.tasks = [];
    emit();
  }

  function addProject({ name, color }) {
    const tempId = `tmp-${utils.uid()}`;
    const optimistic = { id: tempId, name: name.trim(), color: color || '#6c5ce7' };
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
    const removedProject = state.projects.find((p) => p.id === id);
    const removedTasks = state.tasks.filter((t) => t.projectId === id);
    state.projects = state.projects.filter((p) => p.id !== id);
    state.tasks = state.tasks.filter((t) => t.projectId !== id);
    if (state.ui.projectFilter === id) state.ui.projectFilter = 'all';
    persistUi();
    emit();

    api
      .deleteTasksByProject(id)
      .then(({ error }) => {
        if (error) throw error;
        return api.deleteProjectRow(id);
      })
      .then((res) => {
        if (res && res.error) throw res.error;
      })
      .catch((err) => {
        if (removedProject) state.projects.push(removedProject);
        state.tasks = state.tasks.concat(removedTasks);
        emit();
        handleMutationError('Falha ao excluir projeto', err);
      });
  }

  function addTask({ title, projectId, dueDate, recurring }) {
    const tempId = `tmp-${utils.uid()}`;
    const optimistic = {
      id: tempId,
      title: title.trim(),
      projectId: projectId || null,
      dueDate: recurring ? null : dueDate || null,
      recurring: !!recurring,
      status: 'todo',
      completedDate: null,
      createdAt: Date.now()
    };
    state.tasks.push(optimistic);
    emit();

    api.insertTask(currentUserId, optimistic).then(({ data, error }) => {
      if (error) {
        state.tasks = state.tasks.filter((t) => t.id !== tempId);
        emit();
        handleMutationError('Falha ao criar tarefa', error);
        return;
      }
      const idx = state.tasks.findIndex((t) => t.id === tempId);
      if (idx !== -1) state.tasks[idx] = mapTaskFromRow(data);
      emit();
    });
  }

  function updateTask(id, { title, projectId, dueDate, recurring }) {
    const t = state.tasks.find((t) => t.id === id);
    if (!t) return;
    const previous = { ...t };
    t.title = title.trim();
    t.projectId = projectId || null;
    t.recurring = !!recurring;
    t.dueDate = t.recurring ? null : dueDate || null;
    emit();

    api
      .updateTaskRow(id, { title: t.title, projectId: t.projectId, dueDate: t.dueDate, recurring: t.recurring })
      .then(({ error }) => {
        if (error) {
          Object.assign(t, previous);
          emit();
          handleMutationError('Falha ao atualizar tarefa', error);
        }
      });
  }

  function deleteTask(id) {
    const removedIndex = state.tasks.findIndex((t) => t.id === id);
    const removed = state.tasks[removedIndex];
    state.tasks = state.tasks.filter((t) => t.id !== id);
    emit();

    api.deleteTaskRow(id).then(({ error }) => {
      if (error) {
        if (removed) state.tasks.splice(removedIndex, 0, removed);
        emit();
        handleMutationError('Falha ao excluir tarefa', error);
      }
    });
  }

  function setTaskStatus(id, status) {
    const t = state.tasks.find((t) => t.id === id);
    if (!t) return;
    const previous = { status: t.status, completedDate: t.completedDate };
    t.status = status;
    t.completedDate = status === 'done' ? utils.todayISO() : null;
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

  // Preferências de UI (view/period/filtro/tema): locais por dispositivo,
  // nunca sincronizadas com o Supabase.
  function setView(view) {
    state.ui.view = view;
    persistUi();
    emit();
  }

  function setPeriod(period) {
    state.ui.period = period;
    persistUi();
    emit();
  }

  function setProjectFilter(projectId) {
    state.ui.projectFilter = projectId;
    persistUi();
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

  App.store = {
    getState,
    getFilteredTasks,
    subscribe,
    setAuthErrorHandler,
    loadInitialData,
    clearState,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    setTaskStatus,
    toggleComplete,
    setView,
    setPeriod,
    setProjectFilter,
    setTheme,
    setGroupByProject,
    setShowCompleted
  };
})(window.App = window.App || {});
