import { pool } from '../config/database.js';
import { createHttpError } from '../utils/http.js';
import {
  ensureEnum,
  ensureNonNegativeDecimal,
  ensurePositiveInteger,
  normalizeOptionalPositiveInteger,
  normalizeOptionalString,
  roundCurrency,
} from '../utils/validators.js';

const PAYMENT_METHODS = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito'];

function normalizeSaleAdjustments(dados) {
  return {
    descontoValor: ensureNonNegativeDecimal(dados?.desconto_valor ?? 0, 'Desconto'),
    acrescimoValor: ensureNonNegativeDecimal(dados?.acrescimo_valor ?? 0, 'Acrescimo'),
  };
}

function normalizeReceivedAmount(dados, formaPagamento, total) {
  if (formaPagamento !== 'dinheiro') {
    return {
      valorRecebido: total,
      troco: 0,
    };
  }

  const valorRecebidoInformado = dados?.valor_recebido;

  if (
    valorRecebidoInformado === undefined ||
    valorRecebidoInformado === null ||
    String(valorRecebidoInformado).trim() === ''
  ) {
    return {
      valorRecebido: total,
      troco: 0,
    };
  }

  const valorRecebido = ensureNonNegativeDecimal(valorRecebidoInformado, 'Valor recebido');

  if (valorRecebido < total) {
    throw createHttpError(400, 'O valor recebido nao pode ser menor que o total da venda.');
  }

  return {
    valorRecebido,
    troco: roundCurrency(valorRecebido - total),
  };
}

function normalizeItems(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    throw createHttpError(400, 'A venda precisa ter pelo menos um item.');
  }

  const groupedItems = new Map();

  for (const item of itens) {
    const produtoId = ensurePositiveInteger(item?.produto_id, 'Produto');
    const quantidade = ensurePositiveInteger(item?.quantidade, 'Quantidade');
    groupedItems.set(produtoId, (groupedItems.get(produtoId) || 0) + quantidade);
  }

  return Array.from(groupedItems.entries()).map(([produto_id, quantidade]) => ({
    produto_id,
    quantidade,
  }));
}

async function obterVendaPorId(connection, empresaId, vendaId) {
  const [saleRows] = await connection.query(
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
      v.observacoes,
      v.created_at,
      u.nome AS usuario,
      c.nome AS cliente_nome,
      c.documento AS cliente_documento
     FROM vendas v
     INNER JOIN usuarios u ON u.id = v.usuario_id
     LEFT JOIN clientes c ON c.id = v.cliente_id
     WHERE v.empresa_id = ?
       AND v.id = ?
     LIMIT 1`,
    [empresaId, vendaId]
  );

  if (!saleRows[0]) {
    throw createHttpError(404, 'Venda nao encontrada.');
  }

  const [itemRows] = await connection.query(
    `SELECT
      vi.id,
      vi.produto_id,
      p.nome,
      p.codigo_barras,
      vi.quantidade,
      vi.preco_unitario,
      vi.subtotal
     FROM venda_itens vi
     INNER JOIN produtos p ON p.id = vi.produto_id
     WHERE vi.venda_id = ?
     ORDER BY vi.id ASC`,
    [vendaId]
  );

  return {
    ...saleRows[0],
    subtotal: roundCurrency(saleRows[0].subtotal || 0),
    desconto_valor: roundCurrency(saleRows[0].desconto_valor || 0),
    acrescimo_valor: roundCurrency(saleRows[0].acrescimo_valor || 0),
    total: roundCurrency(saleRows[0].total || 0),
    valor_recebido: roundCurrency(saleRows[0].valor_recebido || 0),
    troco: roundCurrency(saleRows[0].troco || 0),
    itens: itemRows.map((item) => ({
      ...item,
      quantidade: Number(item.quantidade),
      preco_unitario: roundCurrency(item.preco_unitario || 0),
      subtotal: roundCurrency(item.subtotal || 0),
    })),
  };
}

export async function finalizarVenda(usuario, dados) {
  const normalizedItems = normalizeItems(dados?.itens);
  const formaPagamento = ensureEnum(
    dados?.forma_pagamento || 'dinheiro',
    PAYMENT_METHODS,
    'Forma de pagamento'
  );
  const clienteId = normalizeOptionalPositiveInteger(dados?.cliente_id, 'Cliente');
  const { descontoValor, acrescimoValor } = normalizeSaleAdjustments(dados);
  const observacoes = normalizeOptionalString(dados?.observacoes, 255);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let subtotal = 0;
    const itensCalculados = [];
    const productIds = normalizedItems.map((item) => item.produto_id);

    if (clienteId) {
      const [clientRows] = await connection.query(
        `SELECT id
         FROM clientes
         WHERE empresa_id = ?
           AND id = ?
         LIMIT 1`,
        [usuario.empresaId, clienteId]
      );

      if (!clientRows[0]) {
        throw createHttpError(404, 'Cliente nao encontrado.');
      }
    }

    const [productRows] = await connection.query(
      `SELECT id, nome, codigo_barras, preco, estoque, ativo
       FROM produtos
       WHERE empresa_id = ?
         AND id IN (?)
       FOR UPDATE`,
      [usuario.empresaId, productIds]
    );

    const productsById = new Map(productRows.map((product) => [product.id, product]));

    for (const item of normalizedItems) {
      const produto = productsById.get(item.produto_id);

      if (!produto || !produto.ativo) {
        throw createHttpError(404, `Produto ${item.produto_id} nao encontrado.`);
      }

      if (Number(produto.estoque) < item.quantidade) {
        throw createHttpError(400, `Estoque insuficiente para ${produto.nome}.`);
      }

      const preco = roundCurrency(produto.preco);
      const itemSubtotal = roundCurrency(preco * item.quantidade);
      subtotal = roundCurrency(subtotal + itemSubtotal);

      itensCalculados.push({
        produto_id: produto.id,
        nome: produto.nome,
        codigo_barras: produto.codigo_barras,
        quantidade: item.quantidade,
        preco_unitario: preco,
        subtotal: itemSubtotal,
      });
    }

    if (descontoValor > subtotal) {
      throw createHttpError(400, 'O desconto nao pode ser maior que o subtotal da venda.');
    }

    const total = roundCurrency(subtotal - descontoValor + acrescimoValor);

    if (total <= 0) {
      throw createHttpError(400, 'O total da venda precisa ser maior que zero.');
    }

    const { valorRecebido, troco } = normalizeReceivedAmount(dados, formaPagamento, total);

    const [vendaResult] = await connection.query(
      `INSERT INTO vendas (
        empresa_id,
        usuario_id,
        cliente_id,
        subtotal,
        desconto_valor,
        acrescimo_valor,
        total,
        valor_recebido,
        troco,
        forma_pagamento,
        observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario.empresaId,
        usuario.id,
        clienteId,
        subtotal,
        descontoValor,
        acrescimoValor,
        total,
        valorRecebido,
        troco,
        formaPagamento,
        observacoes,
      ]
    );

    const vendaId = vendaResult.insertId;

    for (const item of itensCalculados) {
      await connection.query(
        `INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [vendaId, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal]
      );

      await connection.query(
        'UPDATE produtos SET estoque = estoque - ? WHERE id = ?',
        [item.quantidade, item.produto_id]
      );
    }

    await connection.query(
      `INSERT INTO venda_pagamentos (venda_id, metodo, valor)
       VALUES (?, ?, ?)`,
      [vendaId, formaPagamento, total]
    );

    await connection.commit();

    return await obterVendaPorId(connection, usuario.empresaId, vendaId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listar(empresaId, filtros = {}) {
  const limiteInformado = Number(filtros.limite || 50);
  const limiteNormalizado = Number.isInteger(limiteInformado) ? limiteInformado : 50;
  const limite = Math.min(Math.max(limiteNormalizado, 1), 100);
  const [rows] = await pool.query(
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
     LIMIT ?`,
    [empresaId, limite]
  );

  return rows.map((sale) => ({
    ...sale,
    subtotal: roundCurrency(sale.subtotal || 0),
    desconto_valor: roundCurrency(sale.desconto_valor || 0),
    acrescimo_valor: roundCurrency(sale.acrescimo_valor || 0),
    total: roundCurrency(sale.total || 0),
    valor_recebido: roundCurrency(sale.valor_recebido || 0),
    troco: roundCurrency(sale.troco || 0),
    total_itens: Number(sale.total_itens || 0),
  }));
}
