(function (App) {
  const STORAGE_KEY = 'todolist.state.v1';

  function seedState() {
    const { uid, todayISO } = App.utils;
    const today = todayISO();
    const pessoal = { id: uid(), name: 'Pessoal', color: '#6c5ce7' };
    const trabalho = { id: uid(), name: 'Trabalho', color: '#00b894' };

    return {
      projects: [pessoal, trabalho],
      tasks: [
        {
          id: uid(),
          title: 'Beber 2L de água',
          projectId: pessoal.id,
          dueDate: null,
          recurring: true,
          status: 'todo',
          completedDate: null,
          createdAt: Date.now()
        },
        {
          id: uid(),
          title: 'Enviar relatório semanal',
          projectId: trabalho.id,
          dueDate: today,
          recurring: false,
          status: 'todo',
          completedDate: null,
          createdAt: Date.now()
        },
        {
          id: uid(),
          title: 'Planejar reunião do mês',
          projectId: trabalho.id,
          dueDate: today,
          recurring: false,
          status: 'doing',
          completedDate: null,
          createdAt: Date.now()
        }
      ],
      ui: { view: 'list', period: 'today', projectFilter: 'all', theme: 'system' }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedState();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.projects) || !Array.isArray(parsed.tasks)) {
        return seedState();
      }
      parsed.ui = parsed.ui || { view: 'list', period: 'today', projectFilter: 'all', theme: 'system' };
      parsed.ui.theme = parsed.ui.theme || 'system';
      return parsed;
    } catch (err) {
      console.error('Não foi possível carregar os dados salvos, iniciando com estado padrão.', err);
      return seedState();
    }
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  App.storage = { load, save };
})(window.App = window.App || {});
