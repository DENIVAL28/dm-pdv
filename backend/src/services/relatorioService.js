import { pool } from '../config/database.js';
import { ensureDateRange, roundCurrency } from '../utils/validators.js';

function salesPeriodClause(alias = 'v') {
  return `
    ${alias}.empresa_id = ?
    AND ${alias}.status = 'finalizada'
    AND ${alias}.created_at >= ?
    AND ${alias}.created_at < DATE_ADD(?, INTERVAL 1 DAY)
  `;
}

function normalizeDashboardNumbers(summary, itemSummary, productSummary) {
  return {
    vendas_hoje: Number(summary.vendas_hoje || 0),
    total_vendido_hoje: roundCurrency(summary.total_vendido_hoje || 0),
    ticket_medio_hoje: roundCurrency(summary.ticket_medio_hoje || 0),
    itens_vendidos_hoje: Number(itemSummary.itens_vendidos_hoje || 0),
    produtos_cadastrados: Number(productSummary.produtos_cadastrados || 0),
    estoque_baixo: Number(productSummary.estoque_baixo || 0),
    sem_estoque: Number(productSummary.sem_estoque || 0),
  };
}

export async function obterResumoDashboard(empresaId) {
  const [salesRows] = await pool.query(
    `SELECT
      COUNT(*) AS vendas_hoje,
      COALESCE(SUM(total), 0) AS total_vendido_hoje,
      COALESCE(AVG(total), 0) AS ticket_medio_hoje
     FROM vendas
     WHERE empresa_id = ?
       AND status = 'finalizada'
       AND DATE(created_at) = CURDATE()`,
    [empresaId]
  );

  const [itemRows] = await pool.query(
    `SELECT COALESCE(SUM(vi.quantidade), 0) AS itens_vendidos_hoje
     FROM venda_itens vi
     INNER JOIN vendas v ON v.id = vi.venda_id
     WHERE v.empresa_id = ?
       AND v.status = 'finalizada'
       AND DATE(v.created_at) = CURDATE()`,
    [empresaId]
  );

  const [productRows] = await pool.query(
    `SELECT
      COUNT(*) AS produtos_cadastrados,
      SUM(CASE WHEN estoque <= estoque_minimo THEN 1 ELSE 0 END) AS estoque_baixo,
      SUM(CASE WHEN estoque = 0 THEN 1 ELSE 0 END) AS sem_estoque
     FROM produtos
     WHERE empresa_id = ?
       AND ativo = 1`,
    [empresaId]
  );

  const [latestSales] = await pool.query(
    `SELECT
      v.id,
      v.cliente_id,
      v.subtotal,
      v.desconto_valor,
      v.acrescimo_valor,
      v.total,
      v.valor_recebido,
      v.troco,
      v.forma_pagamento,
      v.created_at,
      u.nome AS usuario,
      c.nome AS cliente_nome,
      COALESCE(SUM(vi.quantidade), 0) AS total_itens
     FROM vendas v
     INNER JOIN usuarios u ON u.id = v.usuario_id
     LEFT JOIN clientes c ON c.id = v.cliente_id
     LEFT JOIN venda_itens vi ON vi.venda_id = v.id
     WHERE v.empresa_id = ?
       AND v.status = 'finalizada'
     GROUP BY
      v.id,
      v.cliente_id,
      v.subtotal,
      v.desconto_valor,
      v.acrescimo_valor,
      v.total,
      v.valor_recebido,
      v.troco,
      v.forma_pagamento,
      v.created_at,
      u.nome,
      c.nome
     ORDER BY v.created_at DESC
     LIMIT 8`,
    [empresaId]
  );

  const [criticalProducts] = await pool.query(
    `SELECT
      id,
      nome,
      codigo_barras,
      preco,
      estoque,
      estoque_minimo
     FROM produtos
     WHERE empresa_id = ?
       AND ativo = 1
       AND estoque <= estoque_minimo
     ORDER BY estoque ASC, nome ASC
     LIMIT 8`,
    [empresaId]
  );

  return {
    resumo: normalizeDashboardNumbers(salesRows[0], itemRows[0], productRows[0]),
    ultimas_vendas: latestSales.map((sale) => ({
      ...sale,
      subtotal: roundCurrency(sale.subtotal || 0),
      desconto_valor: roundCurrency(sale.desconto_valor || 0),
      acrescimo_valor: roundCurrency(sale.acrescimo_valor || 0),
      total: roundCurrency(sale.total),
      valor_recebido: roundCurrency(sale.valor_recebido || 0),
      troco: roundCurrency(sale.troco || 0),
      total_itens: Number(sale.total_itens || 0),
    })),
    produtos_criticos: criticalProducts.map((product) => ({
      ...product,
      preco: roundCurrency(product.preco),
      estoque: Number(product.estoque),
      estoque_minimo: Number(product.estoque_minimo),
    })),
  };
}

export async function obterRelatorioVendas(empresaId, filtros = {}) {
  const { startDate, endDate } = ensureDateRange(filtros.data_inicial, filtros.data_final);
  const params = [empresaId, startDate, endDate];

  const [summaryRows] = await pool.query(
    `SELECT
      COUNT(*) AS quantidade_vendas,
      COALESCE(SUM(total), 0) AS total_vendido,
      COALESCE(AVG(total), 0) AS ticket_medio
     FROM vendas v
     WHERE ${salesPeriodClause('v')}`,
    params
  );

  const [itemRows] = await pool.query(
    `SELECT COALESCE(SUM(vi.quantidade), 0) AS itens_vendidos
     FROM venda_itens vi
     INNER JOIN vendas v ON v.id = vi.venda_id
     WHERE ${salesPeriodClause('v')}`,
    params
  );

  const [salesByDayRows] = await pool.query(
    `SELECT
      DATE(v.created_at) AS data,
      COUNT(*) AS quantidade_vendas,
      COALESCE(SUM(v.total), 0) AS total_vendido
     FROM vendas v
     WHERE ${salesPeriodClause('v')}
     GROUP BY DATE(v.created_at)
     ORDER BY DATE(v.created_at) ASC`,
    params
  );

  const [paymentRows] = await pool.query(
    `SELECT
      v.forma_pagamento,
      COUNT(*) AS quantidade_vendas,
      COALESCE(SUM(v.total), 0) AS total_vendido
     FROM vendas v
     WHERE ${salesPeriodClause('v')}
     GROUP BY v.forma_pagamento
     ORDER BY total_vendido DESC, v.forma_pagamento ASC`,
    params
  );

  const [salesRows] = await pool.query(
    `SELECT
      v.id,
      v.cliente_id,
      v.subtotal,
      v.desconto_valor,
      v.acrescimo_valor,
      v.total,
      v.valor_recebido,
      v.troco,
      v.forma_pagamento,
      v.created_at,
      u.nome AS usuario,
      c.nome AS cliente_nome,
      COALESCE(SUM(vi.quantidade), 0) AS total_itens
     FROM vendas v
     INNER JOIN usuarios u ON u.id = v.usuario_id
     LEFT JOIN clientes c ON c.id = v.cliente_id
     LEFT JOIN venda_itens vi ON vi.venda_id = v.id
     WHERE ${salesPeriodClause('v')}
     GROUP BY
      v.id,
      v.cliente_id,
      v.subtotal,
      v.desconto_valor,
      v.acrescimo_valor,
      v.total,
      v.valor_recebido,
      v.troco,
      v.forma_pagamento,
      v.created_at,
      u.nome,
      c.nome
     ORDER BY v.created_at DESC
     LIMIT 100`,
    params
  );

  return {
    periodo: {
      data_inicial: startDate,
      data_final: endDate,
    },
    resumo: {
      quantidade_vendas: Number(summaryRows[0].quantidade_vendas || 0),
      total_vendido: roundCurrency(summaryRows[0].total_vendido || 0),
      ticket_medio: roundCurrency(summaryRows[0].ticket_medio || 0),
      itens_vendidos: Number(itemRows[0].itens_vendidos || 0),
    },
    vendas_por_dia: salesByDayRows.map((row) => ({
      ...row,
      quantidade_vendas: Number(row.quantidade_vendas || 0),
      total_vendido: roundCurrency(row.total_vendido || 0),
    })),
    formas_pagamento: paymentRows.map((row) => ({
      ...row,
      quantidade_vendas: Number(row.quantidade_vendas || 0),
      total_vendido: roundCurrency(row.total_vendido || 0),
    })),
    vendas: salesRows.map((row) => ({
      ...row,
      subtotal: roundCurrency(row.subtotal || 0),
      desconto_valor: roundCurrency(row.desconto_valor || 0),
      acrescimo_valor: roundCurrency(row.acrescimo_valor || 0),
      total: roundCurrency(row.total || 0),
      valor_recebido: roundCurrency(row.valor_recebido || 0),
      troco: roundCurrency(row.troco || 0),
      total_itens: Number(row.total_itens || 0),
    })),
  };
}
