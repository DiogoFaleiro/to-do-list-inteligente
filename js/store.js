(function (App) {
  const { utils, localPrefs, api } = App;
  const listeners = [];

  const state = {
    projects: [],
    tasks: [],
    tags: [],
    // Mapa taskId -> [tagId, ...]. Não é persistido: reconstruído a cada
    // loadInitialData a partir das linhas de task_tags.
    taskTags: {},
    // Texto de busca digitado no momento — não persiste entre recarregamentos.
    search: '',
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
    return { id: row.id, name: row.name, color: row.color, isFavorite: !!row.is_favorite };
  }

  function mapTagFromRow(row) {
    return { id: row.id, name: row.name, color: row.color, isFavorite: !!row.is_favorite };
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
      parentTaskId: row.parent_task_id,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
    };
  }

  function getFilteredTasks() {
    const { tasks, ui, search } = state;
    const today = utils.todayISO();
    const weekStart = utils.startOfWeek(utils.parseISO(today));
    const weekEnd = utils.endOfWeek(utils.parseISO(today));
    const query = search.trim().toLowerCase();

    return tasks.filter((t) => {
      // Subtarefas nunca aparecem como linha/card independente — só
      // aninhadas dentro da tarefa mãe (ver getSubtasks).
      if (t.parentTaskId) return false;
      if (ui.projectFilter !== 'all' && t.projectId !== ui.projectFilter) return false;
      if (ui.tagFilter && !(state.taskTags[t.id] || []).includes(ui.tagFilter)) return false;
      // Buscando por texto, o filtro de período não se aplica — a busca
      // precisa achar a tarefa não importa quando ela vence.
      if (query) return t.title.toLowerCase().includes(query);
      if (ui.period === 'all') return true;
      if (t.recurring) return true;
      if (!t.dueDate) return false;
      // Atrasada (vencida e não concluída) sempre aparece, não importa o
      // período — senão ela "some" de vista assim que passa o dia.
      if (t.status !== 'done' && utils.isOverdue(t.dueDate, today)) return true;
      if (ui.period === 'today') return t.dueDate === today;
      if (ui.period === 'week') return utils.isDateInRange(t.dueDate, weekStart, weekEnd);
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

  // Tarefas diárias "reabrem" automaticamente quando viram o dia. Roda uma
  // vez por carregamento de dados (não a cada render, para não gerar
  // updates de rede redundantes).
  function normalizeRecurringTasksOnce() {
    const today = utils.todayISO();
    state.tasks.forEach((t) => {
      if (t.recurring && t.status === 'done' && t.completedDate !== today) {
        t.status = 'todo';
        // completedDate NÃO é zerado aqui — ele passa a guardar a data da
        // última conclusão de verdade, usada em taskMetaHtml pra saber
        // desde quando a recorrente está atrasada (ver setTaskStatus).
        api.updateTaskStatusRow(t.id, 'todo', t.completedDate).then(({ error }) => {
          if (error) handleMutationError('Falha ao reabrir tarefa recorrente', error);
        });
      }
    });
  }

  async function loadInitialData(userId) {
    currentUserId = userId;
    const [projectsRes, tasksRes, tagsRes, taskTagsRes] = await Promise.all([
      api.fetchProjects(),
      api.fetchTasks(),
      api.fetchTags(),
      api.fetchTaskTags()
    ]);
    if (projectsRes.error) throw projectsRes.error;
    if (tasksRes.error) throw tasksRes.error;
    if (tagsRes.error) throw tagsRes.error;
    if (taskTagsRes.error) throw taskTagsRes.error;

    state.projects = (projectsRes.data || []).map(mapProjectFromRow);
    state.tasks = (tasksRes.data || []).map(mapTaskFromRow);
    state.tags = (tagsRes.data || []).map(mapTagFromRow);
    state.taskTags = {};
    (taskTagsRes.data || []).forEach((row) => {
      if (!state.taskTags[row.task_id]) state.taskTags[row.task_id] = [];
      state.taskTags[row.task_id].push(row.tag_id);
    });
    normalizeRecurringTasksOnce();
    emit();
  }

  function clearState() {
    currentUserId = null;
    state.projects = [];
    state.tasks = [];
    state.tags = [];
    state.taskTags = {};
    state.search = '';
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

  // Retorna uma Promise que resolve com a tarefa final (já com o id de
  // verdade do Supabase) ou null se a criação falhar — usado pelo modal
  // de criação para só criar as subtarefas depois que a tarefa mãe tiver
  // sido salva de verdade.
  function addTask({ title, projectId, dueDate, recurring, parentTaskId }) {
    const tempId = `tmp-${utils.uid()}`;
    const optimistic = {
      id: tempId,
      title: title.trim(),
      projectId: projectId || null,
      dueDate: recurring ? null : dueDate || null,
      recurring: !!recurring,
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

  // Subtarefa: só título + concluída, sem data/projeto/recorrência próprios.
  function addSubtask(parentTaskId, title) {
    return addTask({ title, projectId: null, dueDate: null, recurring: false, parentTaskId });
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
    state.ui.tagFilter = null;
    persistUi();
    emit();
  }

  // Filtro por etiqueta é global (não amarrado a um projeto): selecionar
  // uma etiqueta favorita mostra a tarefa em qualquer projeto que ela
  // esteja, por isso zera o filtro de projeto (mesmo "um filtro por vez"
  // que já existia entre projeto e período).
  function setTagFilter(tagId) {
    state.ui.tagFilter = tagId;
    state.ui.projectFilter = 'all';
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

  App.store = {
    getState,
    getFilteredTasks,
    getSubtasks,
    getTaskTags,
    subscribe,
    setAuthErrorHandler,
    loadInitialData,
    clearState,
    addProject,
    updateProject,
    deleteProject,
    toggleProjectFavorite,
    addTag,
    updateTag,
    deleteTag,
    toggleTagFavorite,
    addTagToTask,
    removeTagFromTask,
    addTask,
    addSubtask,
    updateTask,
    deleteTask,
    setTaskStatus,
    toggleComplete,
    setView,
    setPeriod,
    setProjectFilter,
    setTagFilter,
    setSearchQuery,
    setTheme,
    setGroupByProject,
    setShowCompleted
  };
})(window.App = window.App || {});
