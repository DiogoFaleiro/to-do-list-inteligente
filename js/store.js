(function (App) {
  const { utils, storage } = App;
  const state = storage.load();
  const listeners = [];

  function subscribe(fn) {
    listeners.push(fn);
  }

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function persist() {
    storage.save(state);
  }

  // Tarefas diárias "reabrem" automaticamente quando viram o dia.
  function normalizeRecurringTasks() {
    const today = utils.todayISO();
    let changed = false;
    state.tasks.forEach((t) => {
      if (t.recurring && t.status === 'done' && t.completedDate !== today) {
        t.status = 'todo';
        t.completedDate = null;
        changed = true;
      }
    });
    if (changed) persist();
  }

  function getState() {
    return state;
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

  function addProject({ name, color }) {
    state.projects.push({ id: utils.uid(), name: name.trim(), color: color || '#6c5ce7' });
    persist();
    emit();
  }

  function updateProject(id, { name, color }) {
    const p = state.projects.find((p) => p.id === id);
    if (!p) return;
    p.name = name.trim();
    p.color = color;
    persist();
    emit();
  }

  function deleteProject(id) {
    state.projects = state.projects.filter((p) => p.id !== id);
    state.tasks = state.tasks.filter((t) => t.projectId !== id);
    if (state.ui.projectFilter === id) state.ui.projectFilter = 'all';
    persist();
    emit();
  }

  function addTask({ title, projectId, dueDate, recurring }) {
    state.tasks.push({
      id: utils.uid(),
      title: title.trim(),
      projectId: projectId || null,
      dueDate: recurring ? null : dueDate || null,
      recurring: !!recurring,
      status: 'todo',
      completedDate: null,
      createdAt: Date.now()
    });
    persist();
    emit();
  }

  function updateTask(id, { title, projectId, dueDate, recurring }) {
    const t = state.tasks.find((t) => t.id === id);
    if (!t) return;
    t.title = title.trim();
    t.projectId = projectId || null;
    t.recurring = !!recurring;
    t.dueDate = t.recurring ? null : dueDate || null;
    persist();
    emit();
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter((t) => t.id !== id);
    persist();
    emit();
  }

  function setTaskStatus(id, status) {
    const t = state.tasks.find((t) => t.id === id);
    if (!t) return;
    t.status = status;
    t.completedDate = status === 'done' ? utils.todayISO() : null;
    persist();
    emit();
  }

  function toggleComplete(id) {
    const t = state.tasks.find((t) => t.id === id);
    if (!t) return;
    setTaskStatus(id, t.status === 'done' ? 'todo' : 'done');
  }

  function setView(view) {
    state.ui.view = view;
    persist();
    emit();
  }

  function setPeriod(period) {
    state.ui.period = period;
    persist();
    emit();
  }

  function setProjectFilter(projectId) {
    state.ui.projectFilter = projectId;
    persist();
    emit();
  }

  function setTheme(theme) {
    state.ui.theme = ['light', 'dark', 'system'].includes(theme) ? theme : 'system';
    persist();
    emit();
  }

  App.store = {
    getState,
    getFilteredTasks,
    subscribe,
    normalizeRecurringTasks,
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
    setTheme
  };
})(window.App = window.App || {});
