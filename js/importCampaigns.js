(function (App) {
  const SHEETJS_SRC = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  let sheetJsPromise = null;

  // Cacheia a Promise pra nunca injetar o <script> duas vezes. Em caso de
  // erro (CDN offline/bloqueado), reseta o cache pra permitir nova tentativa
  // numa chamada futura, sem travar o usuário até um F5.
  function loadSheetJs() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (sheetJsPromise) return sheetJsPromise;
    sheetJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SHEETJS_SRC;
      script.onload = () => {
        if (window.XLSX) resolve(window.XLSX);
        else reject(new Error('Biblioteca de planilhas carregou mas não expôs window.XLSX'));
      };
      script.onerror = () => {
        sheetJsPromise = null;
        reject(new Error('Falha ao carregar a biblioteca de planilhas (CDN indisponível)'));
      };
      document.head.appendChild(script);
    });
    return sheetJsPromise;
  }

  const HEADER_COMBINING_MARKS_RE = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

  // Mesma técnica de normalizeTagKey (js/importTodoist.js): NFD + remoção de
  // marcas combinantes + lowercase — mais colapso de espaços múltiplos, já
  // que headers de planilha variam em espaçamento, não só acento.
  function normalizeHeaderKey(str) {
    return (str || '')
      .toString()
      .normalize('NFD')
      .replace(HEADER_COMBINING_MARKS_RE, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  const HEADER_ALIASES = {
    id: ['id'],
    razaoSocial: ['razao social', 'razao social/nome', 'razao social / nome', 'nome'],
    nomeFantasia: ['nome fantasia'],
    celular: ['celular'],
    plano: ['plano(s)', 'planos', 'plano']
  };

  function findColumnIndex(headerRow, aliases) {
    const normalized = headerRow.map(normalizeHeaderKey);
    for (let i = 0; i < aliases.length; i += 1) {
      const idx = normalized.indexOf(aliases[i]);
      if (idx !== -1) return idx;
    }
    return -1;
  }

  // Pura: dado o conteúdo já extraído da planilha (array de arrays, header
  // na primeira linha), monta os clientes. Não depende de window.XLSX.
  function buildClientsFromSheet(sheetRows) {
    const warnings = [];
    if (!sheetRows || !sheetRows.length) {
      return { clients: [], warnings: ['Planilha vazia.'], skippedCount: 0 };
    }

    const headerRow = sheetRows[0];
    const idIdx = findColumnIndex(headerRow, HEADER_ALIASES.id);
    const razaoIdx = findColumnIndex(headerRow, HEADER_ALIASES.razaoSocial);
    const fantasiaIdx = findColumnIndex(headerRow, HEADER_ALIASES.nomeFantasia);
    const celularIdx = findColumnIndex(headerRow, HEADER_ALIASES.celular);
    const planoIdx = findColumnIndex(headerRow, HEADER_ALIASES.plano);

    if (razaoIdx === -1 && fantasiaIdx === -1) {
      warnings.push('Não encontrei nem "Razão Social" nem "Nome Fantasia" no cabeçalho — não é possível identificar os clientes.');
      return { clients: [], warnings, skippedCount: 0 };
    }
    if (celularIdx === -1) warnings.push('Coluna "Celular" não encontrada — os clientes serão importados sem telefone.');
    if (planoIdx === -1) warnings.push('Coluna "Plano(s)" não encontrada — os clientes serão importados sem plano.');

    let skippedCount = 0;
    const clients = [];
    for (let r = 1; r < sheetRows.length; r += 1) {
      const row = sheetRows[r];
      if (!row || row.every((cell) => (cell ?? '').toString().trim() === '')) continue;

      const fantasia = fantasiaIdx !== -1 ? (row[fantasiaIdx] ?? '').toString().trim() : '';
      const razao = razaoIdx !== -1 ? (row[razaoIdx] ?? '').toString().trim() : '';
      const name = fantasia || razao;
      if (!name) {
        skippedCount += 1;
        continue;
      }

      clients.push({
        conexaId: idIdx !== -1 ? (row[idIdx] ?? '').toString().trim() || null : null,
        name,
        phone: celularIdx !== -1 ? (row[celularIdx] ?? '').toString().trim() || null : null,
        plan: planoIdx !== -1 ? (row[planoIdx] ?? '').toString().trim() || null : null
      });
    }

    if (skippedCount > 0) {
      warnings.push(`${skippedCount} linha(s) ignorada(s) por não ter nem Razão Social nem Nome Fantasia.`);
    }

    return { clients, warnings, skippedCount };
  }

  // Lê a PRIMEIRA planilha do workbook (workbook.SheetNames[0]) — o export
  // do Conexa tem só uma aba relevante; se o arquivo tiver mais, as demais
  // são ignoradas de propósito (sem heurística de qual aba escolher).
  function parseWorkbook(arrayBuffer) {
    if (!window.XLSX) {
      throw new Error('SheetJS não carregado — chame loadSheetJs() antes de parseWorkbook().');
    }
    const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    return buildClientsFromSheet(rows);
  }

  App.importCampaigns = { loadSheetJs, normalizeHeaderKey, buildClientsFromSheet, parseWorkbook };
})(window.App = window.App || {});
