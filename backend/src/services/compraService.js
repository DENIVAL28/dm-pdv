import { pool } from '../config/database.js';
import { registrarMovimentoEstoque } from './estoqueService.js';
import { createHttpError } from '../utils/http.js';
import {
  ensureDateString,
  ensureNonNegativeDecimal,
  ensurePositiveInteger,
  normalizeOptionalPositiveInteger,
  normalizeOptionalString,
  roundCurrency,
} from '../utils/validators.js';

const PURCHASE_STATUSES = ['rascunho', 'emitido', 'recebido', 'cancelado'];

function normalizeItems(items, label = 'pedido') {
  if (!Array.isArray(items) || items.length === 0) {
    throw createHttpError(400, `O ${label} precisa ter pelo menos um item.`);
  }

  return items.map((item, index) => ({
    produto_id: ensurePositiveInteger(item?.produto_id, `Produto do item ${index + 1}`),
    quantidade: ensurePositiveInteger(item?.quantidade, `Quantidade do item ${index + 1}`),
    custo_unitario: ensureNonNegativeDecimal(
      item?.custo_unitario ?? 0,
      `Custo do item ${index + 1}`
    ),
  }));
}

async function ensureSupplier(connection, empresaId, fornecedorId) {
  const [rows] = await connection.query(
    `SELECT id, ativo
     FROM fornecedores
     WHERE empresa_id = ?
       AND id = ?
     LIMIT 1`,
    [empresaId, fornecedorId]
  );

  const supplier = rows[0];

  if (!supplier || !supplier.ativo) {
    throw createHttpError(404, 'Fornecedor nao encontrado.');
  }

  return supplier;
}

async function loadProductsMap(connection, empresaId, items) {
  const ids = [...new Set(items.map((item) => item.produto_id))];
  const [rows] = await connection.query(
    `SELECT id, nome, estoque, ativo
     FROM produtos
     WHERE empresa_id = ?
       AND id IN (?)`,
    [empresaId, ids]
  );

  const map = new Map(rows.map((row) => [row.id, row]));

  for (const item of items) {
    const product = map.get(item.produto_id);

    if (!product || !product.ativo) {
      throw createHttpError(404, `Produto ${item.produto_id} nao encontrado.`);
    }
  }

  return map;
}

function calculateTotals(items) {
  let subtotal = 0;

  const normalized = items.map((item) => {
    const itemSubtotal = roundCurrency(item.quantidade * item.custo_unitario);
    subtotal = roundCurrency(subtotal + itemSubtotal);

    return {
      ...item,
      subtotal: itemSubtotal,
    };
  });

  return {
    itens: normalized,
    subtotal,
    total: subtotal,
  };
}

export async function listarPedidos(empresaId, filtros = {}) {
  const limiteInformado = Number(filtros.limite || 50);
  const limiteNormalizado = Number.isInteger(limiteInformado) ? limiteInformado : 50;
  const limite = Math.min(Math.max(limiteNormalizado, 1), 200);
  const status = normalizeOptionalString(filtros.status, 20);

  let sql = `
    SELECT
      pc.id,
      pc.status,
      pc.data_emissao,
      pc.data_prevista,
      pc.subtotal,
      pc.total,
      pc.observacoes,
      f.id AS fornecedor_id,
      f.razao_social AS fornecedor_nome,
      u.nome AS usuario,
      COUNT(pci.id) AS total_itens
    FROM pedidos_compra pc
    INNER JOIN fornecedores f ON f.id = pc.fornecedor_id
    INNER JOIN usuarios u ON u.id = pc.usuario_id
    LEFT JOIN pedido_compra_itens pci ON pci.pedido_compra_id = pc.id
    WHERE pc.empresa_id = ?
  `;

  const params = [empresaId];

  if (status) {
    if (!PURCHASE_STATUSES.includes(status)) {
      throw createHttpError(400, 'Status do pedido invalido.');
    }

    sql += ' AND pc.status = ?';
    params.push(status);
  }

  sql += `
    GROUP BY
      pc.id,
      pc.status,
      pc.data_emissao,
      pc.data_prevista,
      pc.subtotal,
      pc.total,
      pc.observacoes,
      f.id,
      f.razao_social,
      u.nome
    ORDER BY pc.data_emissao DESC, pc.id DESC
    LIMIT ?
  `;
  params.push(limite);

  const [rows] = await pool.query(sql, params);

  return rows.map((row) => ({
    ...row,
    subtotal: roundCurrency(row.subtotal || 0),
    total: roundCurrency(row.total || 0),
    total_itens: Number(row.total_itens || 0),
  }));
}

export async function criarPedido(usuario, dados) {
  const fornecedorId = ensurePositiveInteger(dados?.fornecedor_id, 'Fornecedor');
  const dataPrevista = dados?.data_prevista
    ? ensureDateString(dados.data_prevista, 'Data prevista')
    : null;
  const observacoes = normalizeOptionalString(dados?.observacoes, 255);
  const items = normalizeItems(dados?.itens, 'pedido');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await ensureSupplier(connection, usuario.empresaId, fornecedorId);
    await loadProductsMap(connection, usuario.empresaId, items);
    const totals = calculateTotals(items);

    const [result] = await connection.query(
      `INSERT INTO pedidos_compra (
        empresa_id,
        fornecedor_id,
        usuario_id,
        status,
        data_prevista,
        subtotal,
        total,
        observacoes
      ) VALUES (?, ?, ?, 'rascunho', ?, ?, ?, ?)`,
      [
        usuario.empresaId,
        fornecedorId,
        usuario.id,
        dataPrevista,
        totals.subtotal,
        totals.total,
        observacoes,
      ]
    );

    for (const item of totals.itens) {
      await connection.query(
        `INSERT INTO pedido_compra_itens (pedido_compra_id, produto_id, quantidade, custo_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [result.insertId, item.produto_id, item.quantidade, item.custo_unitario, item.subtotal]
      );
    }

    await connection.commit();
    return { id: result.insertId, status: 'rascunho' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function finalizarPedido(empresaId, pedidoId) {
  const normalizedId = ensurePositiveInteger(pedidoId, 'Pedido');
  const [result] = await pool.query(
    `UPDATE pedidos_compra
     SET status = 'emitido',
         updated_at = CURRENT_TIMESTAMP
     WHERE empresa_id = ?
       AND id = ?
       AND status = 'rascunho'`,
    [empresaId, normalizedId]
  );

  if (!result.affectedRows) {
    throw createHttpError(404, 'Pedido nao encontrado ou ja finalizado.');
  }

  return { id: normalizedId, status: 'emitido' };
}

export async function listarEntradas(empresaId, filtros = {}) {
  const limiteInformado = Number(filtros.limite || 50);
  const limiteNormalizado = Number.isInteger(limiteInformado) ? limiteInformado : 50;
  const limite = Math.min(Math.max(limiteNormalizado, 1), 200);

  const [rows] = await pool.query(
    `SELECT
      em.id,
      em.numero_documento,
      em.status,
      em.data_entrada,
      em.subtotal,
      em.total,
      em.pedido_compra_id,
      f.id AS fornecedor_id,
      f.razao_social AS fornecedor_nome,
      u.nome AS usuario,
      COUNT(emi.id) AS total_itens
     FROM entradas_mercadoria em
     INNER JOIN fornecedores f ON f.id = em.fornecedor_id
     INNER JOIN usuarios u ON u.id = em.usuario_id
     LEFT JOIN entrada_mercadoria_itens emi ON emi.entrada_mercadoria_id = em.id
     WHERE em.empresa_id = ?
     GROUP BY
      em.id,
      em.numero_documento,
      em.status,
      em.data_entrada,
      em.subtotal,
      em.total,
      em.pedido_compra_id,
      f.id,
      f.razao_social,
      u.nome
     ORDER BY em.data_entrada DESC, em.id DESC
     LIMIT ?`,
    [empresaId, limite]
  );

  return rows.map((row) => ({
    ...row,
    subtotal: roundCurrency(row.subtotal || 0),
    total: roundCurrency(row.total || 0),
    total_itens: Number(row.total_itens || 0),
  }));
}

export async function registrarEntrada(usuario, dados) {
  const fornecedorId = ensurePositiveInteger(dados?.fornecedor_id, 'Fornecedor');
  const pedidoCompraId = normalizeOptionalPositiveInteger(dados?.pedido_compra_id, 'Pedido');
  const numeroDocumento = normalizeOptionalString(dados?.numero_documento, 60);
  const observacoes = normalizeOptionalString(dados?.observacoes, 255);
  const items = normalizeItems(dados?.itens, 'entrada');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await ensureSupplier(connection, usuario.empresaId, fornecedorId);
    await loadProductsMap(connection, usuario.empresaId, items);
    const totals = calculateTotals(items);

    if (pedidoCompraId) {
      const [rows] = await connection.query(
        `SELECT id, fornecedor_id, status
         FROM pedidos_compra
         WHERE empresa_id = ?
           AND id = ?
         LIMIT 1
         FOR UPDATE`,
        [usuario.empresaId, pedidoCompraId]
      );

      const order = rows[0];

      if (!order) {
        throw createHttpError(404, 'Pedido de compra nao encontrado.');
      }

      if (order.fornecedor_id !== fornecedorId) {
        throw createHttpError(400, 'O pedido informado pertence a outro fornecedor.');
      }

      if (order.status === 'cancelado' || order.status === 'recebido') {
        throw createHttpError(409, 'O pedido informado nao pode mais receber entrada.');
      }
    }

    const [result] = await connection.query(
      `INSERT INTO entradas_mercadoria (
        empresa_id,
        fornecedor_id,
        pedido_compra_id,
        usuario_id,
        numero_documento,
        subtotal,
        total,
        observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario.empresaId,
        fornecedorId,
        pedidoCompraId,
        usuario.id,
        numeroDocumento,
        totals.subtotal,
        totals.total,
        observacoes,
      ]
    );

    for (const item of totals.itens) {
      const produtoAtual = productsMap.get(item.produto_id);
      const saldoAnterior = Number(produtoAtual.estoque);
      const saldoPosterior = saldoAnterior + item.quantidade;

      await connection.query(
        `INSERT INTO entrada_mercadoria_itens (
          entrada_mercadoria_id,
          produto_id,
          quantidade,
          custo_unitario,
          subtotal
        ) VALUES (?, ?, ?, ?, ?)`,
        [result.insertId, item.produto_id, item.quantidade, item.custo_unitario, item.subtotal]
      );

      await connection.query(
        `UPDATE produtos
         SET estoque = estoque + ?,
             custo = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [item.quantidade, item.custo_unitario, item.produto_id]
      );

      await registrarMovimentoEstoque(connection, {
        empresa_id: usuario.empresaId,
        produto_id: item.produto_id,
        tipo: 'entrada_mercadoria',
        origem: 'entrada_mercadoria',
        origem_id: result.insertId,
        quantidade: item.quantidade,
        saldo_anterior: saldoAnterior,
        saldo_posterior: saldoPosterior,
        observacoes: numeroDocumento
          ? `Entrada pela mercadoria ${numeroDocumento}`
          : `Entrada de mercadoria #${result.insertId}`,
        usuario_id: usuario.id,
      });

      await connection.query(
        `INSERT INTO fornecedor_produtos (fornecedor_id, produto_id, custo_padrao)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           custo_padrao = VALUES(custo_padrao),
           updated_at = CURRENT_TIMESTAMP`,
        [fornecedorId, item.produto_id, item.custo_unitario]
      );
    }

    if (pedidoCompraId) {
      await connection.query(
        `UPDATE pedidos_compra
         SET status = 'recebido',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [pedidoCompraId]
      );
    }

    await connection.commit();

    const [rows] = await connection.query(
      `SELECT
        em.id,
        em.numero_documento,
        em.total,
        em.data_entrada,
        f.razao_social AS fornecedor_nome
       FROM entradas_mercadoria em
       INNER JOIN fornecedores f ON f.id = em.fornecedor_id
       WHERE em.id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return {
      ...rows[0],
      total: roundCurrency(rows[0].total || 0),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
