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

  // Clampa no último dia do mês de destino em vez de deixar o overflow do
  // setMonth rolar pro mês seguinte (ex: 31/01 +1 mês vira 28 ou 29/02,
  // nunca 03/03).
  function addMonthsISO(dateStr, months) {
    const d = parseISO(dateStr);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    const lastDayOfTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, lastDayOfTargetMonth));
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

  // Mesmo corpo das cópias locais já existentes em render.js/app.js/
  // adminDashboard.js — essa aqui é só pra código novo que precisa de
  // escapeHtml sem já ter uma cópia própria no módulo.
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  // Qual FUP (1, 2 ou 3) é o próximo a enviar para um cliente de campanha:
  // o primeiro ainda não marcado como enviado; se os três já foram
  // marcados, reusa o FUP3 (reenvio). Compartilhado entre render.js
  // (tooltip do botão) e app.js (mensagem que o botão realmente abre) pra
  // não haver dois lugares decidindo isso de formas diferentes.
  function nextCampaignFollowupIndex(client) {
    if (!client.fup1Sent) return 1;
    if (!client.fup2Sent) return 2;
    return 3;
  }

  // Higieniza texto (em geral mensagens de FUP com emoji) antes de mandar
  // pro WhatsApp ou gravar no banco. Cada remoção resolve um sintoma
  // específico de "emoji chega quebrado (�)" já visto em produção:
  // - U+FE0F (Variation Selector-16): força apresentação colorida do
  //   emoji anterior, mas alguns clientes do WhatsApp não lidam bem com
  //   ele quando a string passou por normalização/encoding intermediário
  //   — o emoji já é colorido por padrão nesses code points, então dá
  //   pra remover sem perder o emoji.
  // - U+FFFD (replacement character): é o próprio símbolo de "byte que
  //   não decodificou" — se já está na string de origem, é lixo de uma
  //   conversão de encoding anterior, nunca conteúdo válido.
  // - U+FEFF (BOM/zero-width no-break space): sobra de cópia/cola de
  //   arquivos com BOM; invisível mas quebra o parsing em alguns clientes.
  // - Surrogates órfãos (metade de um par UTF-16 sem a outra metade):
  //   acontecem quando um emoji de 2 code units é cortado no meio (ex:
  //   truncamento por tamanho de campo) — corrompem o UTF-8 gerado por
  //   encodeURIComponent daí pra frente, então removemos a metade solta.
  function cleanWhatsAppText(text) {
    if (!text) return '';
    return text
      .normalize('NFC')
      .replace(/[\uFFFD\uFE0F\uFEFF]/g, '')
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
      .replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '$1')
      .replace(/\r\n/g, '\n');
  }

  // Ponto único de montagem da URL de envio: api.whatsapp.com/send é mais
  // tolerante que wa.me para URLs longas (mensagens de FUP costumam ser
  // parágrafos inteiros), e o texto sempre passa por cleanWhatsAppText
  // antes do encode. Sem mensagem, o parâmetro text nem aparece na URL.
  function buildWhatsAppUrl(phone, text) {
    const clean = cleanWhatsAppText(text);
    const base = `https://api.whatsapp.com/send?phone=${phone}`;
    return clean ? `${base}&text=${encodeURIComponent(clean)}` : base;
  }

  App.utils = {
    todayISO,
    dateToISO,
    addDaysISO,
    addMonthsISO,
    parseISO,
    isDateInRange,
    formatDateBR,
    isOverdue,
    uid,
    escapeHtml,
    nextCampaignFollowupIndex,
    cleanWhatsAppText,
    buildWhatsAppUrl
  };
})(window.App = window.App || {});
