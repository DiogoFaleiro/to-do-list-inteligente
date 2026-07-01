(function (App) {
  const { store, render } = App;

  const projectListEl = document.getElementById('projectList');
  const periodTabs = document.getElementById('periodTabs');
  const viewToggle = document.getElementById('viewToggle');
  const newTaskBtn = document.getElementById('newTaskBtn');
  const newProjectBtn = document.getElementById('newProjectBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const listView = document.getElementById('listView');
  const kanbanView = document.getElementById('kanbanView');

  // Modal de tarefa
  const taskModal = document.getElementById('taskModal');
  const taskForm = document.getElementById('taskForm');
  const taskModalTitle = document.getElementById('taskModalTitle');
  const taskIdInput = document.getElementById('taskId');
  const taskTitleInput = document.getElementById('taskTitle');
  const taskProjectSelect = document.getElementById('taskProject');
  const taskRecurringInput = document.getElementById('taskRecurring');
  const taskDueDateInput = document.getElementById('taskDueDate');
  const taskDueDateRow = document.getElementById('taskDueDateRow');
  const taskCancelBtn = document.getElementById('taskCancelBtn');

  // Modal de projeto
  const projectModal = document.getElementById('projectModal');
  const projectForm = document.getElementById('projectForm');
  const projectModalTitle = document.getElementById('projectModalTitle');
  const projectIdInput = document.getElementById('projectId');
  const projectNameInput = document.getElementById('projectName');
  const projectColorInput = document.getElementById('projectColor');
  const projectCancelBtn = document.getElementById('projectCancelBtn');
  const projectDeleteBtn = document.getElementById('projectDeleteBtn');

  function toggleDueDateRow() {
    taskDueDateRow.style.display = taskRecurringInput.checked ? 'none' : '';
  }

  function openTaskModal(task) {
    taskForm.reset();
    const state = store.getState();
    const defaultProject = task
      ? task.projectId
      : state.ui.projectFilter !== 'all'
      ? state.ui.projectFilter
      : '';
    render.renderTaskProjectOptions(defaultProject);

    if (task) {
      taskModalTitle.textContent = 'Editar tarefa';
      taskIdInput.value = task.id;
      taskTitleInput.value = task.title;
      taskRecurringInput.checked = task.recurring;
      taskDueDateInput.value = task.dueDate || '';
    } else {
      taskModalTitle.textContent = 'Nova tarefa';
      taskIdInput.value = '';
      taskRecurringInput.checked = false;
      taskDueDateInput.value = '';
    }
    toggleDueDateRow();
    taskModal.hidden = false;
    taskTitleInput.focus();
  }

  function closeTaskModal() {
    taskModal.hidden = true;
  }

  function openProjectModal(project) {
    projectForm.reset();
    projectColorInput.value = project ? project.color : '#6c5ce7';
    if (project) {
      projectModalTitle.textContent = 'Editar projeto';
      projectIdInput.value = project.id;
      projectNameInput.value = project.name;
      projectDeleteBtn.hidden = false;
    } else {
      projectModalTitle.textContent = 'Novo projeto';
      projectIdInput.value = '';
      projectDeleteBtn.hidden = true;
    }
    projectModal.hidden = false;
    projectNameInput.focus();
  }

  function closeProjectModal() {
    projectModal.hidden = true;
  }

  // Sidebar: seleção e edição de projetos
  projectListEl.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-project]');
    if (editBtn) {
      const project = render.projectById(editBtn.dataset.editProject);
      if (project) openProjectModal(project);
      return;
    }
    const item = e.target.closest('[data-project]');
    if (item) store.setProjectFilter(item.dataset.project);
  });

  periodTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-period]');
    if (btn) store.setPeriod(btn.dataset.period);
  });

  viewToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]');
    if (btn) store.setView(btn.dataset.view);
  });

  newTaskBtn.addEventListener('click', () => openTaskModal(null));
  newProjectBtn.addEventListener('click', () => openProjectModal(null));

  themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    store.setTheme(current === 'dark' ? 'light' : 'dark');
  });

  const darkSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  darkSchemeQuery.addEventListener('change', () => {
    if (store.getState().ui.theme === 'system') render.applyTheme();
  });
  taskCancelBtn.addEventListener('click', closeTaskModal);
  projectCancelBtn.addEventListener('click', closeProjectModal);
  taskRecurringInput.addEventListener('change', toggleDueDateRow);

  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) closeTaskModal();
  });
  projectModal.addEventListener('click', (e) => {
    if (e.target === projectModal) closeProjectModal();
  });

  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
      title: taskTitleInput.value,
      projectId: taskProjectSelect.value || null,
      dueDate: taskDueDateInput.value || null,
      recurring: taskRecurringInput.checked
    };
    if (!payload.title.trim()) return;
    if (taskIdInput.value) {
      store.updateTask(taskIdInput.value, payload);
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

  // Lista: concluir, editar, excluir
  listView.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      store.toggleComplete(toggle.dataset.toggle);
      return;
    }
    const editBtn = e.target.closest('[data-edit-task]');
    if (editBtn) {
      const task = store.getState().tasks.find((t) => t.id === editBtn.dataset.editTask);
      if (task) openTaskModal(task);
      return;
    }
    const delBtn = e.target.closest('[data-delete-task]');
    if (delBtn) {
      if (confirm('Excluir esta tarefa?')) store.deleteTask(delBtn.dataset.deleteTask);
    }
  });

  // Kanban: drag and drop entre colunas
  kanbanView.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.kanban-card');
    if (card) e.dataTransfer.setData('text/plain', card.dataset.taskId);
  });

  kanbanView.querySelectorAll('.kanban-cards').forEach((col) => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      if (taskId) store.setTaskStatus(taskId, col.dataset.column);
    });
  });

  kanbanView.addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-delete-task]');
    if (delBtn) {
      if (confirm('Excluir esta tarefa?')) store.deleteTask(delBtn.dataset.deleteTask);
      return;
    }
    const card = e.target.closest('.kanban-card');
    if (card) {
      const task = store.getState().tasks.find((t) => t.id === card.dataset.taskId);
      if (task) openTaskModal(task);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTaskModal();
      closeProjectModal();
    }
  });

  store.subscribe(render.renderAll);
  render.renderAll();
})(window.App = window.App || {});
