(function (App) {
  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function dateToISO(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function todayISO() {
    return dateToISO(new Date());
  }

  function addDaysISO(dateStr, days) {
    const d = parseISO(dateStr);
    d.setDate(d.getDate() + days);
    return dateToISO(d);
  }

  function parseISO(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // Datas em ISO (YYYY-MM-DD) comparam corretamente como string, sem
  // precisar converter pra Date.
  function isDateInRange(dateStr, startStr, endStr) {
    return !!dateStr && dateStr >= startStr && dateStr <= endStr;
  }

  function formatDateBR(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  function isOverdue(dateStr, todayStr) {
    return !!dateStr && dateStr < todayStr;
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  App.utils = {
    todayISO,
    dateToISO,
    addDaysISO,
    parseISO,
    isDateInRange,
    formatDateBR,
    isOverdue,
    uid
  };
})(window.App = window.App || {});
