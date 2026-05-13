import { pool } from '../config/database.js';
import {
  obterResumoCreditoCliente,
  registrarHistoricoCliente,
} from './clienteService.js';
import { createHttpError } from '../utils/http.js';
import {
  ensureDateString,
  ensureEnum,
  ensureNonNegativeDecimal,
  ensurePositiveInteger,
  ensureRequiredString,
  normalizeOptionalPositiveInteger,
  normalizeOptionalString,
  roundCurrency,
} from '../utils/validators.js';

const RECEIVABLE_STATUSES = ['pendente', 'liquidado', 'cancelado'];
const PAYABLE_STATUSES = ['pendente', 'liquidado', 'cancelado'];
const CARD_RECONCILIATION_STATUSES = ['pendente', 'conciliado', 'cancelado'];
const FINANCIAL_STATUSES = ['pendente', 'liquidado', 'cancelado'];
const FINANCIAL_TYPES = ['receita', 'despesa'];
const FINANCIAL_CATEGORIES = ['venda', 'compra', 'taxa_cartao', 'manual'];

function toDateValue(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  const baseDate =
    dateValue instanceof Date
      ? new Date(dateValue)
      : new Date(`${String(dateValue).slice(0, 10)}T00:00:00`);

  baseDate.setDate(baseDate.getDate() + Number(days || 0));
  return toDateValue(baseDate);
}

function mapFinancialValueRow(row) {
  return {
    ...row,
    valor: roundCurrency(row.valor || 0),
  };
}

async function getCompanyPaymentMethod(connection, empresaId, codigo) {
  const [rows] = await connection.query(
    `SELECT
      id,
      codigo,
      nome,
      tipo_recebimento,
      prazo_dias,
      taxa_percentual,
      ativo
     FROM formas_pagamento_empresa
     WHERE empresa_id = ?
       AND codigo = ?
     LIMIT 1`,
    [empresaId, codigo]
  );

  const method = rows[0];

  if (!method || !method.ativo) {
    throw createHttpError(404, `Forma de pagamento ${codigo} nao configurada para a empresa.`);
  }

  return {
    ...method,
    prazo_dias: Number(method.prazo_dias || 0),
    taxa_percentual: roundCurrency(method.taxa_percentual || 0),
  };
}

async function createFinancialLaunch(connection, payload) {
  const [result] = await connection.query(
    `INSERT INTO lancamentos_financeiros (
      empresa_id,
      tipo,
      categoria,
      origem,
      origem_id,
      cliente_id,
      fornecedor_id,
      descricao,
      valor,
      vencimento,
      data_liquidacao,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.empresa_id,
      payload.tipo,
      payload.categoria,
      payload.origem,
      payload.origem_id ?? null,
      payload.cliente_id ?? null,
      payload.fornecedor_id ?? null,
      payload.descricao,
      payload.valor,
      payload.vencimento,
      payload.data_liquidacao ?? null,
      payload.status,
    ]
  );

  return result.insertId;
}

async function updateLaunchStatusByOrigin(connection, payload) {
  await connection.query(
    `UPDATE lancamentos_financeiros
     SET status = ?,
         data_liquidacao = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE empresa_id = ?
       AND origem = ?
       AND origem_id = ?`,
    [
      payload.status,
      payload.data_liquidacao ?? null,
      payload.empresa_id,
      payload.origem,
      payload.origem_id,
    ]
  );
}

async function createCardFeeLaunchIfNeeded(connection, payload) {
  if (payload.valor_taxa <= 0) {
    return null;
  }

  const [existingRows] = await connection.query(
    `SELECT id
     FROM lancamentos_financeiros
     WHERE empresa_id = ?
       AND origem = 'conciliacao_cartao_taxa'
       AND origem_id = ?
     LIMIT 1`,
    [payload.empresa_id, payload.origem_id]
  );

  if (existingRows[0]) {
    return existingRows[0].id;
  }

  return createFinancialLaunch(connection, {
    empresa_id: payload.empresa_id,
    tipo: 'despesa',
    categoria: 'taxa_cartao',
    origem: 'conciliacao_cartao_taxa',
    origem_id: payload.origem_id,
    descricao: payload.descricao,
    valor: payload.valor_taxa,
    vencimento: payload.vencimento,
    data_liquidacao: new Date(),
    status: 'liquidado',
  });
}

async function resolveReceivableDueDate(connection, usuario, dados, paymentMethod, saleDate) {
  if (dados.forma_pagamento !== 'crediario' || !dados.cliente_id) {
    return addDays(saleDate, paymentMethod.prazo_dias);
  }

  const credito = await obterResumoCreditoCliente(connection, usuario.empresaId, dados.cliente_id);
  const prazoCredito = credito.ativo ? credito.dias_vencimento : paymentMethod.prazo_dias;
  return addDays(saleDate, prazoCredito);
}

export async function registrarFinanceiroVenda(connection, usuario, dados) {
  const paymentMethod = await getCompanyPaymentMethod(
    connection,
    usuario.empresaId,
    dados.forma_pagamento
  );
  const saleDate = dados.data_venda ? toDateValue(new Date(dados.data_venda)) : toDateValue(new Date());
  const dueDate = await resolveReceivableDueDate(connection, usuario, dados, paymentMethod, saleDate);
  const immediateSettlement = paymentMethod.tipo_recebimento !== 'cartao' && paymentMethod.prazo_dias === 0;
  const accountStatus = immediateSettlement ? 'liquidado' : 'pendente';
  const settlementDate = immediateSettlement ? new Date() : null;

  const [receivableResult] = await connection.query(
    `INSERT INTO contas_receber (
      empresa_id,
      cliente_id,
      venda_id,
      venda_pagamento_id,
      forma_pagamento,
      valor,
      vencimento,
      data_recebimento,
      status,
      observacoes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      usuario.empresaId,
      dados.cliente_id ?? null,
      dados.venda_id,
      dados.venda_pagamento_id,
      dados.forma_pagamento,
      dados.valor,
      dueDate,
      settlementDate,
      accountStatus,
      `Gerado automaticamente pela venda #${dados.venda_id}`,
    ]
  );

  await createFinancialLaunch(connection, {
    empresa_id: usuario.empresaId,
    tipo: 'receita',
    categoria: 'venda',
    origem: 'venda',
    origem_id: dados.venda_id,
    cliente_id: dados.cliente_id ?? null,
    descricao: `Venda #${dados.venda_id} - ${paymentMethod.nome}`,
    valor: dados.valor,
    vencimento: dueDate,
    data_liquidacao: settlementDate,
    status: accountStatus,
  });

  if (paymentMethod.tipo_recebimento === 'cartao') {
    const valorTaxa = roundCurrency((dados.valor * paymentMethod.taxa_percentual) / 100);
    const valorLiquido = roundCurrency(dados.valor - valorTaxa);

    await connection.query(
      `INSERT INTO conciliacoes_cartao (
        empresa_id,
        conta_receber_id,
        venda_pagamento_id,
        forma_pagamento,
        taxa_percentual,
        valor_bruto,
        valor_taxa,
        valor_liquido,
        data_prevista,
        status,
        observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?)`,
      [
        usuario.empresaId,
        receivableResult.insertId,
        dados.venda_pagamento_id,
        dados.forma_pagamento,
        paymentMethod.taxa_percentual,
        dados.valor,
        valorTaxa,
        valorLiquido,
        dueDate,
        `Conciliacao aguardando recebimento do cartao da venda #${dados.venda_id}`,
      ]
    );
  }

  if (dados.cliente_id) {
    await registrarHistoricoCliente(connection, {
      cliente_id: dados.cliente_id,
      usuario_id: usuario.id,
      tipo_evento: 'venda',
      referencia_tipo: 'venda',
      referencia_id: dados.venda_id,
      descricao: `Venda #${dados.venda_id} vinculada ao cliente em ${paymentMethod.nome}.`,
      valor_referencia: dados.valor,
    });
  }

  return receivableResult.insertId;
}

export async function registrarFinanceiroEntrada(connection, usuario, dados) {
  const entryDate = dados.data_entrada ? toDateValue(new Date(dados.data_entrada)) : toDateValue(new Date());

  const [payableResult] = await connection.query(
    `INSERT INTO contas_pagar (
      empresa_id,
      fornecedor_id,
      entrada_mercadoria_id,
      valor,
      vencimento,
      status,
      observacoes
    ) VALUES (?, ?, ?, ?, ?, 'pendente', ?)`,
    [
      usuario.empresaId,
      dados.fornecedor_id,
      dados.entrada_mercadoria_id,
      dados.valor,
      entryDate,
      dados.observacoes || `Conta gerada pela entrada #${dados.entrada_mercadoria_id}`,
    ]
  );

  await createFinancialLaunch(connection, {
    empresa_id: usuario.empresaId,
    tipo: 'despesa',
    categoria: 'compra',
    origem: 'entrada_mercadoria',
    origem_id: dados.entrada_mercadoria_id,
    fornecedor_id: dados.fornecedor_id,
    descricao: dados.descricao || `Entrada de mercadoria #${dados.entrada_mercadoria_id}`,
    valor: dados.valor,
    vencimento: entryDate,
    status: 'pendente',
  });

  return payableResult.insertId;
}

export async function cancelarFinanceiroVenda(connection, empresaId, vendaId, motivo) {
  const [conciliationRows] = await connection.query(
    `SELECT cc.id
     FROM conciliacoes_cartao cc
     INNER JOIN contas_receber cr ON cr.id = cc.conta_receber_id
     WHERE cc.empresa_id = ?
       AND cr.venda_id = ?`,
    [empresaId, vendaId]
  );

  await connection.query(
    `UPDATE contas_receber
     SET status = 'cancelado',
         observacoes = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE empresa_id = ?
       AND venda_id = ?`,
    [`Cancelado junto com a venda. Motivo: ${motivo}`, empresaId, vendaId]
  );

  await connection.query(
    `UPDATE conciliacoes_cartao cc
     INNER JOIN contas_receber cr ON cr.id = cc.conta_receber_id
     SET cc.status = 'cancelado',
         cc.observacoes = ?,
         cc.updated_at = CURRENT_TIMESTAMP
     WHERE cc.empresa_id = ?
       AND cr.venda_id = ?`,
    [`Cancelada junto com a venda. Motivo: ${motivo}`, empresaId, vendaId]
  );

  await updateLaunchStatusByOrigin(connection, {
    empresa_id: empresaId,
    origem: 'venda',
    origem_id: vendaId,
    status: 'cancelado',
    data_liquidacao: null,
  });

  for (const conciliation of conciliationRows) {
    await updateLaunchStatusByOrigin(connection, {
      empresa_id: empresaId,
      origem: 'conciliacao_cartao_taxa',
      origem_id: conciliation.id,
      status: 'cancelado',
      data_liquidacao: null,
    });
  }
}

export async function obterResumoFinanceiro(empresaId) {
  const [receivableRows] = await pool.query(
    `SELECT
      COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END), 0) AS a_receber_pendente,
      COALESCE(SUM(CASE WHEN status = 'liquidado' THEN valor ELSE 0 END), 0) AS a_receber_liquidado,
      COUNT(CASE WHEN status = 'pendente' THEN 1 END) AS titulos_receber_pendentes
     FROM contas_receber
     WHERE empresa_id = ?`,
    [empresaId]
  );

  const [payableRows] = await pool.query(
    `SELECT
      COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END), 0) AS a_pagar_pendente,
      COALESCE(SUM(CASE WHEN status = 'liquidado' THEN valor ELSE 0 END), 0) AS a_pagar_liquidado,
      COUNT(CASE WHEN status = 'pendente' THEN 1 END) AS titulos_pagar_pendentes
     FROM contas_pagar
     WHERE empresa_id = ?`,
    [empresaId]
  );

  const [cardRows] = await pool.query(
    `SELECT
      COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor_liquido ELSE 0 END), 0) AS cartoes_pendentes,
      COALESCE(SUM(CASE WHEN status = 'conciliado' THEN valor_liquido ELSE 0 END), 0) AS cartoes_conciliados,
      COUNT(CASE WHEN status = 'pendente' THEN 1 END) AS conciliacoes_pendentes
     FROM conciliacoes_cartao
     WHERE empresa_id = ?`,
    [empresaId]
  );

  const [flowRows] = await pool.query(
    `SELECT
      COALESCE(SUM(CASE WHEN tipo = 'receita' AND status = 'liquidado' AND DATE(data_liquidacao) = CURDATE() THEN valor ELSE 0 END), 0) AS recebido_hoje,
      COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status = 'liquidado' AND DATE(data_liquidacao) = CURDATE() THEN valor ELSE 0 END), 0) AS pago_hoje
     FROM lancamentos_financeiros
     WHERE empresa_id = ?`,
    [empresaId]
  );

  return {
    a_receber_pendente: roundCurrency(receivableRows[0].a_receber_pendente || 0),
    a_receber_liquidado: roundCurrency(receivableRows[0].a_receber_liquidado || 0),
    titulos_receber_pendentes: Number(receivableRows[0].titulos_receber_pendentes || 0),
    a_pagar_pendente: roundCurrency(payableRows[0].a_pagar_pendente || 0),
    a_pagar_liquidado: roundCurrency(payableRows[0].a_pagar_liquidado || 0),
    titulos_pagar_pendentes: Number(payableRows[0].titulos_pagar_pendentes || 0),
    cartoes_pendentes: roundCurrency(cardRows[0].cartoes_pendentes || 0),
    cartoes_conciliados: roundCurrency(cardRows[0].cartoes_conciliados || 0),
    conciliacoes_pendentes: Number(cardRows[0].conciliacoes_pendentes || 0),
    recebido_hoje: roundCurrency(flowRows[0].recebido_hoje || 0),
    pago_hoje: roundCurrency(flowRows[0].pago_hoje || 0),
    saldo_previsto: roundCurrency(
      Number(receivableRows[0].a_receber_pendente || 0) - Number(payableRows[0].a_pagar_pendente || 0)
    ),
  };
}

export async function listarLancamentos(empresaId, filtros = {}) {
  const limiteInformado = Number(filtros.limite || 80);
  const limiteNormalizado = Number.isInteger(limiteInformado) ? limiteInformado : 80;
  const limite = Math.min(Math.max(limiteNormalizado, 1), 200);
  const status = filtros.status
    ? ensureEnum(filtros.status, FINANCIAL_STATUSES, 'Status do lancamento')
    : null;
  const tipo = filtros.tipo ? ensureEnum(filtros.tipo, FINANCIAL_TYPES, 'Tipo do lancamento') : null;

  let sql = `
    SELECT
      lf.id,
      lf.tipo,
      lf.categoria,
      lf.origem,
      lf.origem_id,
      lf.descricao,
      lf.valor,
      lf.vencimento,
      lf.data_liquidacao,
      lf.status,
      c.nome AS cliente_nome,
      f.razao_social AS fornecedor_nome,
      lf.created_at
     FROM lancamentos_financeiros lf
     LEFT JOIN clientes c ON c.id = lf.cliente_id
     LEFT JOIN fornecedores f ON f.id = lf.fornecedor_id
     WHERE lf.empresa_id = ?
  `;
  const params = [empresaId];

  if (status) {
    sql += ' AND lf.status = ?';
    params.push(status);
  }

  if (tipo) {
    sql += ' AND lf.tipo = ?';
    params.push(tipo);
  }

  sql += ' ORDER BY lf.vencimento ASC, lf.id DESC LIMIT ?';
  params.push(limite);

  const [rows] = await pool.query(sql, params);
  return rows.map(mapFinancialValueRow);
}

export async function criarLancamentoManual(usuario, dados) {
  const tipo = ensureEnum(dados?.tipo, FINANCIAL_TYPES, 'Tipo');
  const categoria = ensureEnum(dados?.categoria || 'manual', FINANCIAL_CATEGORIES, 'Categoria');
  const descricao = ensureRequiredString(dados?.descricao, 'Descricao', 255);
  const valor = ensureNonNegativeDecimal(dados?.valor, 'Valor');
  const vencimento = ensureDateString(dados?.vencimento, 'Vencimento');
  const clienteId = normalizeOptionalPositiveInteger(dados?.cliente_id, 'Cliente');
  const fornecedorId = normalizeOptionalPositiveInteger(dados?.fornecedor_id, 'Fornecedor');
  const liquidarAgora = String(dados?.liquidar_agora || '') === '1';

  const [result] = await pool.query(
    `INSERT INTO lancamentos_financeiros (
      empresa_id,
      tipo,
      categoria,
      origem,
      origem_id,
      cliente_id,
      fornecedor_id,
      descricao,
      valor,
      vencimento,
      data_liquidacao,
      status
    ) VALUES (?, ?, ?, 'manual', NULL, ?, ?, ?, ?, ?, ?, ?)`,
    [
      usuario.empresaId,
      tipo,
      categoria,
      clienteId,
      fornecedorId,
      descricao,
      valor,
      vencimento,
      liquidarAgora ? new Date() : null,
      liquidarAgora ? 'liquidado' : 'pendente',
    ]
  );

  return { id: result.insertId };
}

export async function listarContasReceber(empresaId, filtros = {}) {
  const limiteInformado = Number(filtros.limite || 80);
  const limiteNormalizado = Number.isInteger(limiteInformado) ? limiteInformado : 80;
  const limite = Math.min(Math.max(limiteNormalizado, 1), 200);
  const status = filtros.status
    ? ensureEnum(filtros.status, RECEIVABLE_STATUSES, 'Status da conta a receber')
    : null;

  let sql = `
    SELECT
      cr.id,
      cr.cliente_id,
      cr.venda_id,
      cr.venda_pagamento_id,
      cr.forma_pagamento,
      cr.valor,
      cr.vencimento,
      cr.data_recebimento,
      cr.status,
      cr.observacoes,
      c.nome AS cliente_nome,
      v.created_at AS data_venda
     FROM contas_receber cr
     LEFT JOIN clientes c ON c.id = cr.cliente_id
     LEFT JOIN vendas v ON v.id = cr.venda_id
     WHERE cr.empresa_id = ?
  `;
  const params = [empresaId];

  if (status) {
    sql += ' AND cr.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY cr.vencimento ASC, cr.id DESC LIMIT ?';
  params.push(limite);

  const [rows] = await pool.query(sql, params);
  return rows.map(mapFinancialValueRow);
}

export async function receberConta(usuario, contaId, dados) {
  const normalizedId = ensurePositiveInteger(contaId, 'Conta a receber');
  const observacoes = normalizeOptionalString(dados?.observacoes, 255);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, cliente_id, forma_pagamento, venda_id, valor, status
       FROM contas_receber
       WHERE empresa_id = ?
         AND id = ?
       LIMIT 1
       FOR UPDATE`,
      [usuario.empresaId, normalizedId]
    );

    const conta = rows[0];

    if (!conta) {
      throw createHttpError(404, 'Conta a receber nao encontrada.');
    }

    if (conta.status !== 'pendente') {
      throw createHttpError(409, 'Somente contas pendentes podem ser recebidas.');
    }

    if (String(conta.forma_pagamento).startsWith('cartao_')) {
      throw createHttpError(409, 'Use a conciliacao de cartao para liquidar recebimentos de cartao.');
    }

    await connection.query(
      `UPDATE contas_receber
       SET status = 'liquidado',
           data_recebimento = NOW(),
           observacoes = COALESCE(?, observacoes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [observacoes, normalizedId]
    );

    await updateLaunchStatusByOrigin(connection, {
      empresa_id: usuario.empresaId,
      origem: 'venda',
      origem_id: conta.venda_id,
      status: 'liquidado',
      data_liquidacao: new Date(),
    });

    await registrarHistoricoCliente(connection, {
      cliente_id: conta.cliente_id,
      usuario_id: usuario.id,
      tipo_evento: 'recebimento',
      referencia_tipo: 'conta_receber',
      referencia_id: normalizedId,
      descricao: `Conta a receber #${normalizedId} liquidada.`,
      valor_referencia: conta.valor,
    });

    await connection.commit();
    return { id: normalizedId, status: 'liquidado' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listarContasPagar(empresaId, filtros = {}) {
  const limiteInformado = Number(filtros.limite || 80);
  const limiteNormalizado = Number.isInteger(limiteInformado) ? limiteInformado : 80;
  const limite = Math.min(Math.max(limiteNormalizado, 1), 200);
  const status = filtros.status
    ? ensureEnum(filtros.status, PAYABLE_STATUSES, 'Status da conta a pagar')
    : null;

  let sql = `
    SELECT
      cp.id,
      cp.fornecedor_id,
      cp.entrada_mercadoria_id,
      cp.valor,
      cp.vencimento,
      cp.data_pagamento,
      cp.status,
      cp.observacoes,
      f.razao_social AS fornecedor_nome
     FROM contas_pagar cp
     INNER JOIN fornecedores f ON f.id = cp.fornecedor_id
     WHERE cp.empresa_id = ?
  `;
  const params = [empresaId];

  if (status) {
    sql += ' AND cp.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY cp.vencimento ASC, cp.id DESC LIMIT ?';
  params.push(limite);

  const [rows] = await pool.query(sql, params);
  return rows.map(mapFinancialValueRow);
}

export async function pagarConta(usuario, contaId, dados) {
  const normalizedId = ensurePositiveInteger(contaId, 'Conta a pagar');
  const observacoes = normalizeOptionalString(dados?.observacoes, 255);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, entrada_mercadoria_id, status
       FROM contas_pagar
       WHERE empresa_id = ?
         AND id = ?
       LIMIT 1
       FOR UPDATE`,
      [usuario.empresaId, normalizedId]
    );

    const conta = rows[0];

    if (!conta) {
      throw createHttpError(404, 'Conta a pagar nao encontrada.');
    }

    if (conta.status !== 'pendente') {
      throw createHttpError(409, 'Somente contas pendentes podem ser pagas.');
    }

    await connection.query(
      `UPDATE contas_pagar
       SET status = 'liquidado',
           data_pagamento = NOW(),
           observacoes = COALESCE(?, observacoes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [observacoes, normalizedId]
    );

    await updateLaunchStatusByOrigin(connection, {
      empresa_id: usuario.empresaId,
      origem: 'entrada_mercadoria',
      origem_id: conta.entrada_mercadoria_id,
      status: 'liquidado',
      data_liquidacao: new Date(),
    });

    await connection.commit();
    return { id: normalizedId, status: 'liquidado' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listarConciliacoesCartao(empresaId, filtros = {}) {
  const limiteInformado = Number(filtros.limite || 80);
  const limiteNormalizado = Number.isInteger(limiteInformado) ? limiteInformado : 80;
  const limite = Math.min(Math.max(limiteNormalizado, 1), 200);
  const status = filtros.status
    ? ensureEnum(filtros.status, CARD_RECONCILIATION_STATUSES, 'Status da conciliacao')
    : null;

  let sql = `
    SELECT
      cc.id,
      cc.conta_receber_id,
      cc.venda_pagamento_id,
      cc.forma_pagamento,
      cc.bandeira,
      cc.taxa_percentual,
      cc.valor_bruto,
      cc.valor_taxa,
      cc.valor_liquido,
      cc.data_prevista,
      cc.data_conciliacao,
      cc.status,
      cc.observacoes,
      cr.venda_id,
      c.nome AS cliente_nome
     FROM conciliacoes_cartao cc
     INNER JOIN contas_receber cr ON cr.id = cc.conta_receber_id
     LEFT JOIN clientes c ON c.id = cr.cliente_id
     WHERE cc.empresa_id = ?
  `;
  const params = [empresaId];

  if (status) {
    sql += ' AND cc.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY cc.data_prevista ASC, cc.id DESC LIMIT ?';
  params.push(limite);

  const [rows] = await pool.query(sql, params);
  return rows.map((row) => ({
    ...mapFinancialValueRow({ ...row, valor: row.valor_bruto }),
    taxa_percentual: roundCurrency(row.taxa_percentual || 0),
    valor_bruto: roundCurrency(row.valor_bruto || 0),
    valor_taxa: roundCurrency(row.valor_taxa || 0),
    valor_liquido: roundCurrency(row.valor_liquido || 0),
  }));
}

export async function conciliarCartao(usuario, conciliacaoId, dados) {
  const normalizedId = ensurePositiveInteger(conciliacaoId, 'Conciliacao');
  const taxaPercentualInformada =
    dados?.taxa_percentual !== undefined && dados?.taxa_percentual !== null && String(dados?.taxa_percentual).trim() !== ''
      ? ensureNonNegativeDecimal(dados.taxa_percentual, 'Taxa percentual')
      : null;
  const bandeira = normalizeOptionalString(dados?.bandeira, 40);
  const observacoes = normalizeOptionalString(dados?.observacoes, 255);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT
        cc.id,
        cc.conta_receber_id,
        cc.venda_pagamento_id,
        cc.forma_pagamento,
        cc.taxa_percentual,
        cc.valor_bruto,
        cc.data_prevista,
        cc.status,
        cr.venda_id,
        cr.cliente_id
       FROM conciliacoes_cartao cc
       INNER JOIN contas_receber cr ON cr.id = cc.conta_receber_id
       WHERE cc.empresa_id = ?
         AND cc.id = ?
       LIMIT 1
       FOR UPDATE`,
      [usuario.empresaId, normalizedId]
    );

    const conciliacao = rows[0];

    if (!conciliacao) {
      throw createHttpError(404, 'Conciliacao de cartao nao encontrada.');
    }

    if (conciliacao.status !== 'pendente') {
      throw createHttpError(409, 'Somente conciliacoes pendentes podem ser processadas.');
    }

    const taxaPercentual = taxaPercentualInformada ?? roundCurrency(conciliacao.taxa_percentual || 0);
    const valorBruto = roundCurrency(conciliacao.valor_bruto || 0);
    const valorTaxa = roundCurrency((valorBruto * taxaPercentual) / 100);
    const valorLiquido = roundCurrency(valorBruto - valorTaxa);

    await connection.query(
      `UPDATE conciliacoes_cartao
       SET bandeira = COALESCE(?, bandeira),
           taxa_percentual = ?,
           valor_taxa = ?,
           valor_liquido = ?,
           data_conciliacao = NOW(),
           status = 'conciliado',
           observacoes = COALESCE(?, observacoes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [bandeira, taxaPercentual, valorTaxa, valorLiquido, observacoes, normalizedId]
    );

    await connection.query(
      `UPDATE contas_receber
       SET status = 'liquidado',
           data_recebimento = NOW(),
           observacoes = COALESCE(?, observacoes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [observacoes, conciliacao.conta_receber_id]
    );

    await updateLaunchStatusByOrigin(connection, {
      empresa_id: usuario.empresaId,
      origem: 'venda',
      origem_id: conciliacao.venda_id,
      status: 'liquidado',
      data_liquidacao: new Date(),
    });

    await createCardFeeLaunchIfNeeded(connection, {
      empresa_id: usuario.empresaId,
      origem_id: normalizedId,
      valor_taxa: valorTaxa,
      vencimento: conciliacao.data_prevista,
      descricao: `Taxa da conciliacao do cartao da venda #${conciliacao.venda_id}`,
    });

    await registrarHistoricoCliente(connection, {
      cliente_id: conciliacao.cliente_id,
      usuario_id: usuario.id,
      tipo_evento: 'recebimento',
      referencia_tipo: 'conciliacao_cartao',
      referencia_id: normalizedId,
      descricao: `Recebimento de cartao conciliado para a venda #${conciliacao.venda_id}.`,
      valor_referencia: valorLiquido,
    });

    await connection.commit();
    return { id: normalizedId, status: 'conciliado', valor_liquido: valorLiquido };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
