(function (App) {
  const STORAGE_KEY = 'todolist.ui.v1';
  const DEFAULT_UI = {
    view: 'list',
    period: 'today',
    projectFilter: 'all',
    tagFilter: null,
    recurringOnly: false,
    theme: 'system',
    groupByProject: false,
    showCompleted: true,
    screen: 'tasks',
    campaignDetailId: null,
    showEncerradas: false
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_UI };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_UI, ...parsed };
    } catch (err) {
      return { ...DEFAULT_UI };
    }
  }

  function save(ui) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ui));
  }

  App.localPrefs = { load, save };
})(window.App = window.App || {});
