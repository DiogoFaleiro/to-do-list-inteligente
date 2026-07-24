(function (App) {
  const HEADER_COMBINING_MARKS_RE = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

  // Mesma técnica de normalizeHeaderKey (js/importCampaigns.js): NFD +
  // remoção de marcas combinantes + lowercase + colapso de espaços —
  // duplicada aqui, não importada (cada módulo é seu próprio closure IIFE).
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
    produto: ['produto'],
    descricao: ['descricao'],
    codigo: ['codigo do voucher', 'codigo voucher', 'codigo'],
    utilizado: ['utilizado'],
    validoAte: ['valido ate', 'validade', 'data de validade']
  };

  function findColumnIndex(headerRow, aliases) {
    const normalized = headerRow.map(normalizeHeaderKey);
    for (let i = 0; i < aliases.length; i += 1) {
      const idx = normalized.indexOf(aliases[i]);
      if (idx !== -1) return idx;
    }
    return -1;
  }

  // DD/MM/YYYY estrito -> ISO, ou null se não bater (nunca lança). Não
  // reaproveita App.importTodoist.parseTodoistDate: aquele aceita vocabulário
  // de linguagem natural e devolve um shape pensado pra tarefas
  // ({dueDate, dueTime, recurrence, ok}) — aqui só interessa uma coluna de
  // planilha aceitar/rejeitar um formato fixo, então fica um helper próprio
  // e pequeno em vez de se acoplar a um subsistema maior que não serve.
  function parseDDMMYYYY(str) {
    const trimmed = (str || '').toString().trim();
    const m = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    return `${m[3]}-${m[2]}-${m[1]}`;
  }

  // Pura: dado o conteúdo já extraído do CSV/planilha (array de arrays,
  // header na primeira linha), monta os vouchers a importar. Não depende de
  // window.XLSX nem de FileReader — mesmo desenho de buildClientsFromSheet.
  function buildVouchersFromRows(sheetRows) {
    const warnings = [];
    if (!sheetRows || !sheetRows.length) {
      return { batchName: '', batchDescription: '', vouchers: [], warnings: ['Arquivo vazio.'], skippedCount: 0 };
    }

    const headerRow = sheetRows[0];
    const produtoIdx = findColumnIndex(headerRow, HEADER_ALIASES.produto);
    const descricaoIdx = findColumnIndex(headerRow, HEADER_ALIASES.descricao);
    const codigoIdx = findColumnIndex(headerRow, HEADER_ALIASES.codigo);
    const utilizadoIdx = findColumnIndex(headerRow, HEADER_ALIASES.utilizado);
    const validoAteIdx = findColumnIndex(headerRow, HEADER_ALIASES.validoAte);

    if (codigoIdx === -1) {
      warnings.push('Não encontrei a coluna "Código do voucher" no cabeçalho — não é possível identificar os vouchers.');
      return { batchName: '', batchDescription: '', vouchers: [], warnings, skippedCount: 0 };
    }

    let batchName = '';
    let batchDescription = '';
    let skippedCount = 0;
    let invalidDateCount = 0;
    const vouchers = [];

    for (let r = 1; r < sheetRows.length; r += 1) {
      const row = sheetRows[r];
      if (!row || row.every((cell) => (cell ?? '').toString().trim() === '')) continue;

      if (!batchName && produtoIdx !== -1) {
        const produtoVal = (row[produtoIdx] ?? '').toString().trim();
        if (produtoVal) batchName = produtoVal;
      }
      if (!batchDescription && descricaoIdx !== -1) {
        const descVal = (row[descricaoIdx] ?? '').toString().trim();
        if (descVal) batchDescription = descVal;
      }

      const code = (row[codigoIdx] ?? '').toString().trim();
      if (!code) {
        skippedCount += 1;
        continue;
      }

      const utilizadoVal = utilizadoIdx !== -1 ? (row[utilizadoIdx] ?? '').toString().trim() : '';
      const status = /^(sim|s|1)$/i.test(utilizadoVal) ? 'vendido' : 'disponivel';

      let validUntil = null;
      if (validoAteIdx !== -1) {
        const rawDate = (row[validoAteIdx] ?? '').toString().trim();
        if (rawDate) {
          validUntil = parseDDMMYYYY(rawDate);
          if (!validUntil) invalidDateCount += 1;
        }
      }

      vouchers.push({ code, status, validUntil });
    }

    if (skippedCount > 0) {
      warnings.push(`${skippedCount} linha(s) ignorada(s) por não ter código de voucher.`);
    }
    if (invalidDateCount > 0) {
      warnings.push(`${invalidDateCount} linha(s) com "Válido até" em formato inválido — importadas sem data de validade.`);
    }

    return { batchName, batchDescription, vouchers, warnings, skippedCount };
  }

  // Reaproveita App.importTodoist.parseCsv (state machine RFC4180 genérico,
  // sem acoplamento com Todoist) em vez de duplicar as ~70 linhas.
  function parseVoucherCsv(text) {
    return buildVouchersFromRows(App.importTodoist.parseCsv(text));
  }

  // Lê a PRIMEIRA planilha do workbook, mesma regra de parseWorkbook
  // (js/importCampaigns.js). raw:false força o SheetJS a devolver texto
  // formatado (não número serial de data) pras células — decisão
  // deliberada pra igualar o shape de string que parseCsv já produz, sem
  // um segundo caminho de tipos diferente rio abaixo.
  function parseVoucherWorkbook(arrayBuffer) {
    if (!window.XLSX) {
      throw new Error('SheetJS não carregado — chame App.importCampaigns.loadSheetJs() antes de parseVoucherWorkbook().');
    }
    const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    return buildVouchersFromRows(rows);
  }

  App.importVouchers = { normalizeHeaderKey, buildVouchersFromRows, parseDDMMYYYY, parseVoucherCsv, parseVoucherWorkbook };
})(window.App = window.App || {});
