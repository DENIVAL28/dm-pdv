import { pool } from '../config/database.js';
import { obterSessaoAbertaDoUsuario } from './caixaService.js';
import { obterResumoCreditoCliente } from './clienteService.js';
import { registrarMovimentoEstoque } from './estoqueService.js';
import { registrarFinanceiroVenda } from './financeiroService.js';
import { garantirDocumentoFiscalPendente } from './fiscalService.js';
import { createHttpError } from '../utils/http.js';
import {
  ensureEnum,
  ensureNonNegativeDecimal,
  ensurePositiveInteger,
  normalizeOptionalPositiveInteger,
  normalizeOptionalString,
  roundCurrency,
} from '../utils/validators.js';

const PAYMENT_METHODS = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'crediario'];

function normalizeSaleAdjustments(dados) {
  return {
    descontoValor: ensureNonNegativeDecimal(dados?.desconto_valor ?? 0, 'Desconto'),
    acrescimoValor: ensureNonNegativeDecimal(dados?.acrescimo_valor ?? 0, 'Acrescimo'),
  };
}

function normalizeReceivedAmount(dados, formaPagamento, total) {
  if (formaPagamento === 'crediario') {
    return {
      valorRecebido: 0,
      troco: 0,
    };
  }

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
      v.caixa_sessao_id,
      v.observacoes,
      v.created_at,
      u.nome AS usuario,
      c.nome AS cliente_nome,
      c.documento AS cliente_documento,
      cx.nome AS caixa_nome,
      cx.identificador AS caixa_identificador
     FROM vendas v
     INNER JOIN usuarios u ON u.id = v.usuario_id
     LEFT JOIN clientes c ON c.id = v.cliente_id
     LEFT JOIN caixa_sessoes cs ON cs.id = v.caixa_sessao_id
     LEFT JOIN caixas cx ON cx.id = cs.caixa_id
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

    const sessaoCaixa = await obterSessaoAbertaDoUsuario(connection, usuario);

    if (!sessaoCaixa) {
      throw createHttpError(409, 'Abra o caixa antes de finalizar a venda.');
    }

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

    if (formaPagamento === 'crediario') {
      if (!clienteId) {
        throw createHttpError(400, 'Selecione um cliente para vender no crediario.');
      }

      const credito = await obterResumoCreditoCliente(connection, usuario.empresaId, clienteId);

      if (!credito.ativo) {
        throw createHttpError(409, 'O cliente selecionado nao possui crediario ativo.');
      }

      if (credito.credito_disponivel <= 0) {
        throw createHttpError(409, 'O cliente nao possui limite disponivel para novas compras no crediario.');
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

    if (formaPagamento === 'crediario') {
      const credito = await obterResumoCreditoCliente(connection, usuario.empresaId, clienteId);

      if (credito.credito_disponivel < total) {
        throw createHttpError(
          409,
          `Limite insuficiente para o crediario. Disponivel: ${credito.credito_disponivel.toFixed(2)}.`
        );
      }
    }

    const { valorRecebido, troco } = normalizeReceivedAmount(dados, formaPagamento, total);

    const [vendaResult] = await connection.query(
      `INSERT INTO vendas (
        empresa_id,
        usuario_id,
        cliente_id,
        caixa_id,
        caixa_sessao_id,
        subtotal,
        desconto_valor,
        acrescimo_valor,
        total,
        valor_recebido,
        troco,
        forma_pagamento,
        observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario.empresaId,
        usuario.id,
        clienteId,
        sessaoCaixa.caixa_id,
        sessaoCaixa.id,
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
      const produtoAtual = productsById.get(item.produto_id);
      const saldoAnterior = Number(produtoAtual.estoque);
      const saldoPosterior = saldoAnterior - item.quantidade;

      await connection.query(
        `INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [vendaId, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal]
      );

      await connection.query(
        'UPDATE produtos SET estoque = estoque - ? WHERE id = ?',
        [item.quantidade, item.produto_id]
      );

      await registrarMovimentoEstoque(connection, {
        empresa_id: usuario.empresaId,
        produto_id: item.produto_id,
        tipo: 'venda',
        origem: 'venda',
        origem_id: vendaId,
        quantidade: -item.quantidade,
        saldo_anterior: saldoAnterior,
        saldo_posterior: saldoPosterior,
        observacoes: `Saida pela venda #${vendaId}`,
        usuario_id: usuario.id,
      });
    }

    const [paymentResult] = await connection.query(
      `INSERT INTO venda_pagamentos (venda_id, metodo, valor)
       VALUES (?, ?, ?)`,
      [vendaId, formaPagamento, total]
    );

    await registrarFinanceiroVenda(connection, usuario, {
      venda_id: vendaId,
      venda_pagamento_id: paymentResult.insertId,
      cliente_id: clienteId,
      forma_pagamento: formaPagamento,
      valor: total,
      data_venda: new Date(),
    });

    await garantirDocumentoFiscalPendente(connection, usuario, vendaId);

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
      v.caixa_sessao_id,
      v.created_at,
      u.nome AS usuario,
      c.nome AS cliente_nome,
      cx.nome AS caixa_nome,
      COALESCE(SUM(vi.quantidade), 0) AS total_itens
     FROM vendas v
     INNER JOIN usuarios u ON u.id = v.usuario_id
     LEFT JOIN clientes c ON c.id = v.cliente_id
     LEFT JOIN caixa_sessoes cs ON cs.id = v.caixa_sessao_id
     LEFT JOIN caixas cx ON cx.id = cs.caixa_id
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
      v.caixa_sessao_id,
      v.created_at,
      u.nome,
      c.nome,
      cx.nome
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
