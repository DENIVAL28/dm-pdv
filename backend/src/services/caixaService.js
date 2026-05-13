import { pool } from '../config/database.js';
import { registrarMovimentoEstoque } from './estoqueService.js';
import { cancelarFinanceiroVenda } from './financeiroService.js';
import { createHttpError } from '../utils/http.js';
import {
  ensureNonNegativeDecimal,
  ensurePositiveInteger,
  ensureRequiredString,
  normalizeOptionalString,
  roundCurrency,
} from '../utils/validators.js';

const MOVEMENT_TYPES = ['sangria', 'suprimento'];

function mapSessaoBase(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    empresa_id: row.empresa_id,
    caixa_id: row.caixa_id,
    caixa_nome: row.caixa_nome,
    caixa_identificador: row.caixa_identificador,
    usuario_abertura_id: row.usuario_abertura_id,
    usuario_fechamento_id: row.usuario_fechamento_id,
    usuario_abertura_nome: row.usuario_abertura_nome,
    usuario_fechamento_nome: row.usuario_fechamento_nome,
    status: row.status,
    valor_abertura: roundCurrency(row.valor_abertura || 0),
    data_abertura: row.data_abertura,
    data_fechamento: row.data_fechamento,
    observacoes: row.observacoes,
  };
}

async function buscarSessaoPorId(connection, empresaId, sessaoId) {
  const [rows] = await connection.query(
    `SELECT
      cs.id,
      cs.empresa_id,
      cs.caixa_id,
      c.nome AS caixa_nome,
      c.identificador AS caixa_identificador,
      cs.usuario_abertura_id,
      cs.usuario_fechamento_id,
      ua.nome AS usuario_abertura_nome,
      uf.nome AS usuario_fechamento_nome,
      cs.status,
      cs.valor_abertura,
      cs.data_abertura,
      cs.data_fechamento,
      cs.observacoes
     FROM caixa_sessoes cs
     INNER JOIN caixas c ON c.id = cs.caixa_id
     INNER JOIN usuarios ua ON ua.id = cs.usuario_abertura_id
     LEFT JOIN usuarios uf ON uf.id = cs.usuario_fechamento_id
     WHERE cs.empresa_id = ?
       AND cs.id = ?
     LIMIT 1`,
    [empresaId, sessaoId]
  );

  return mapSessaoBase(rows[0]);
}

async function listarMovimentos(connection, sessaoId) {
  const [rows] = await connection.query(
    `SELECT
      cm.id,
      cm.tipo,
      cm.valor,
      cm.descricao,
      cm.created_at,
      u.nome AS usuario
     FROM caixa_movimentos cm
     INNER JOIN usuarios u ON u.id = cm.usuario_id
     WHERE cm.caixa_sessao_id = ?
     ORDER BY cm.created_at DESC, cm.id DESC`,
    [sessaoId]
  );

  return rows.map((row) => ({
    ...row,
    valor: roundCurrency(row.valor || 0),
  }));
}

async function montarResumoSessao(connection, sessao) {
  const [salesSummaryRows] = await connection.query(
    `SELECT
      COUNT(*) AS quantidade_vendas,
      COALESCE(SUM(total), 0) AS total_vendido,
      COALESCE(SUM(CASE WHEN forma_pagamento = 'dinheiro' THEN total ELSE 0 END), 0) AS total_dinheiro
     FROM vendas
     WHERE caixa_sessao_id = ?
       AND status = 'finalizada'`,
    [sessao.id]
  );

  const [paymentRows] = await connection.query(
    `SELECT
      forma_pagamento,
      COUNT(*) AS quantidade_vendas,
      COALESCE(SUM(total), 0) AS total_vendido
     FROM vendas
     WHERE caixa_sessao_id = ?
       AND status = 'finalizada'
     GROUP BY forma_pagamento
     ORDER BY total_vendido DESC, forma_pagamento ASC`,
    [sessao.id]
  );

  const [movementSummaryRows] = await connection.query(
    `SELECT
      tipo,
      COALESCE(SUM(valor), 0) AS total
     FROM caixa_movimentos
     WHERE caixa_sessao_id = ?
     GROUP BY tipo`,
    [sessao.id]
  );

  const movimentos = await listarMovimentos(connection, sessao.id);
  const salesSummary = salesSummaryRows[0] || {};

  const totaisMovimentos = movementSummaryRows.reduce(
    (acc, row) => ({
      ...acc,
      [row.tipo]: roundCurrency(row.total || 0),
    }),
    {}
  );

  const totalSangria = roundCurrency(totaisMovimentos.sangria || 0);
  const totalSuprimento = roundCurrency(totaisMovimentos.suprimento || 0);
  const totalDinheiro = roundCurrency(salesSummary.total_dinheiro || 0);
  const valorEmCaixaSistema = roundCurrency(
    sessao.valor_abertura + totalDinheiro + totalSuprimento - totalSangria
  );

  return {
    sessao,
    resumo_vendas: {
      quantidade_vendas: Number(salesSummary.quantidade_vendas || 0),
      total_vendido: roundCurrency(salesSummary.total_vendido || 0),
      total_dinheiro: totalDinheiro,
    },
    formas_pagamento: paymentRows.map((row) => ({
      ...row,
      quantidade_vendas: Number(row.quantidade_vendas || 0),
      total_vendido: roundCurrency(row.total_vendido || 0),
    })),
    resumo_movimentos: {
      sangria: totalSangria,
      suprimento: totalSuprimento,
    },
    valor_em_caixa_sistema: valorEmCaixaSistema,
    movimentos,
  };
}

export async function obterSessaoAbertaDoUsuario(connection, usuario) {
  const [rows] = await connection.query(
    `SELECT
      cs.id,
      cs.empresa_id,
      cs.caixa_id,
      c.nome AS caixa_nome,
      c.identificador AS caixa_identificador,
      cs.usuario_abertura_id,
      cs.usuario_fechamento_id,
      ua.nome AS usuario_abertura_nome,
      uf.nome AS usuario_fechamento_nome,
      cs.status,
      cs.valor_abertura,
      cs.data_abertura,
      cs.data_fechamento,
      cs.observacoes
     FROM caixa_sessoes cs
     INNER JOIN caixas c ON c.id = cs.caixa_id
     INNER JOIN usuarios ua ON ua.id = cs.usuario_abertura_id
     LEFT JOIN usuarios uf ON uf.id = cs.usuario_fechamento_id
     WHERE cs.empresa_id = ?
       AND cs.usuario_abertura_id = ?
       AND cs.status = 'aberto'
     ORDER BY cs.data_abertura DESC, cs.id DESC
     LIMIT 1`,
    [usuario.empresaId, usuario.id]
  );

  return mapSessaoBase(rows[0]);
}

export async function listarCaixas(empresaId) {
  const [rows] = await pool.query(
    `SELECT
      id,
      nome,
      identificador,
      status,
      created_at,
      updated_at
     FROM caixas
     WHERE empresa_id = ?
     ORDER BY nome ASC`,
    [empresaId]
  );

  return rows;
}

export async function obterSessaoAtual(usuario) {
  const connection = await pool.getConnection();

  try {
    const sessao = await obterSessaoAbertaDoUsuario(connection, usuario);

    if (!sessao) {
      return null;
    }

    return await montarResumoSessao(connection, sessao);
  } finally {
    connection.release();
  }
}

export async function abrirSessao(usuario, dados) {
  const caixaId = ensurePositiveInteger(dados?.caixa_id, 'Caixa');
  const valorAbertura = ensureNonNegativeDecimal(dados?.valor_abertura ?? 0, 'Valor de abertura');
  const observacoes = normalizeOptionalString(dados?.observacoes, 255);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const sessaoAtual = await obterSessaoAbertaDoUsuario(connection, usuario);

    if (sessaoAtual) {
      throw createHttpError(409, 'Ja existe um caixa aberto para este usuario.');
    }

    const [cashierRows] = await connection.query(
      `SELECT id, nome, identificador, status
       FROM caixas
       WHERE empresa_id = ?
         AND id = ?
       LIMIT 1`,
      [usuario.empresaId, caixaId]
    );

    const caixa = cashierRows[0];

    if (!caixa) {
      throw createHttpError(404, 'Caixa nao encontrado.');
    }

    if (caixa.status !== 'ativo') {
      throw createHttpError(400, 'O caixa selecionado nao esta ativo.');
    }

    const [openRows] = await connection.query(
      `SELECT id
       FROM caixa_sessoes
       WHERE empresa_id = ?
         AND caixa_id = ?
         AND status = 'aberto'
       LIMIT 1
       FOR UPDATE`,
      [usuario.empresaId, caixaId]
    );

    if (openRows[0]) {
      throw createHttpError(409, 'Este caixa ja esta aberto em outra sessao.');
    }

    const [result] = await connection.query(
      `INSERT INTO caixa_sessoes (
        empresa_id,
        caixa_id,
        usuario_abertura_id,
        valor_abertura,
        observacoes
      ) VALUES (?, ?, ?, ?, ?)`,
      [usuario.empresaId, caixaId, usuario.id, valorAbertura, observacoes]
    );

    await connection.commit();

    const sessao = await buscarSessaoPorId(connection, usuario.empresaId, result.insertId);
    return await montarResumoSessao(connection, sessao);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function registrarMovimento(usuario, sessaoId, dados, tipo) {
  if (!MOVEMENT_TYPES.includes(tipo)) {
    throw createHttpError(400, 'Tipo de movimento invalido.');
  }

  const normalizedSessionId = ensurePositiveInteger(sessaoId, 'Sessao de caixa');
  const valor = ensureNonNegativeDecimal(dados?.valor, 'Valor');
  const descricao = normalizeOptionalString(dados?.descricao, 255);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const sessaoAtual = await obterSessaoAbertaDoUsuario(connection, usuario);

    if (!sessaoAtual || sessaoAtual.id !== normalizedSessionId) {
      throw createHttpError(409, 'A sessao informada nao esta aberta para este usuario.');
    }

    await connection.query(
      `INSERT INTO caixa_movimentos (caixa_sessao_id, usuario_id, tipo, valor, descricao)
       VALUES (?, ?, ?, ?, ?)`,
      [normalizedSessionId, usuario.id, tipo, valor, descricao]
    );

    await connection.commit();

    const sessao = await buscarSessaoPorId(connection, usuario.empresaId, normalizedSessionId);
    return await montarResumoSessao(connection, sessao);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function fecharSessao(usuario, sessaoId, dados) {
  const normalizedSessionId = ensurePositiveInteger(sessaoId, 'Sessao de caixa');
  const valorInformado = ensureNonNegativeDecimal(dados?.valor_informado, 'Valor informado');
  const observacoes = normalizeOptionalString(dados?.observacoes, 255);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const sessaoAtual = await obterSessaoAbertaDoUsuario(connection, usuario);

    if (!sessaoAtual || sessaoAtual.id !== normalizedSessionId) {
      throw createHttpError(409, 'A sessao informada nao esta aberta para este usuario.');
    }

    const resumo = await montarResumoSessao(connection, sessaoAtual);
    const valorSistema = resumo.valor_em_caixa_sistema;
    const diferenca = roundCurrency(valorInformado - valorSistema);

    await connection.query(
      `INSERT INTO caixa_fechamentos (
        caixa_sessao_id,
        usuario_id,
        valor_sistema,
        valor_informado,
        diferenca,
        observacoes
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [normalizedSessionId, usuario.id, valorSistema, valorInformado, diferenca, observacoes]
    );

    await connection.query(
      `UPDATE caixa_sessoes
       SET status = 'fechado',
           usuario_fechamento_id = ?,
           data_fechamento = NOW(),
           observacoes = COALESCE(?, observacoes)
       WHERE id = ?`,
      [usuario.id, observacoes, normalizedSessionId]
    );

    await connection.commit();

    const sessaoFechada = await buscarSessaoPorId(connection, usuario.empresaId, normalizedSessionId);
    return {
      ...(await montarResumoSessao(connection, sessaoFechada)),
      fechamento: {
        valor_sistema: valorSistema,
        valor_informado: valorInformado,
        diferenca,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function obterResumoSessao(empresaId, sessaoId) {
  const normalizedSessionId = ensurePositiveInteger(sessaoId, 'Sessao de caixa');
  const connection = await pool.getConnection();

  try {
    const sessao = await buscarSessaoPorId(connection, empresaId, normalizedSessionId);

    if (!sessao) {
      throw createHttpError(404, 'Sessao de caixa nao encontrada.');
    }

    return await montarResumoSessao(connection, sessao);
  } finally {
    connection.release();
  }
}

export async function cancelarVenda(usuario, vendaId, dados) {
  const normalizedSaleId = ensurePositiveInteger(vendaId, 'Venda');
  const motivo = ensureRequiredString(dados?.motivo, 'Motivo', 255);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [saleRows] = await connection.query(
      `SELECT id, status
       FROM vendas
       WHERE empresa_id = ?
         AND id = ?
       LIMIT 1
       FOR UPDATE`,
      [usuario.empresaId, normalizedSaleId]
    );

    const venda = saleRows[0];

    if (!venda) {
      throw createHttpError(404, 'Venda nao encontrada.');
    }

    if (venda.status !== 'finalizada') {
      throw createHttpError(409, 'Somente vendas finalizadas podem ser canceladas.');
    }

    const [documentRows] = await connection.query(
      `SELECT id, status
       FROM documentos_fiscais
       WHERE empresa_id = ?
         AND venda_id = ?
       LIMIT 1
       FOR UPDATE`,
      [usuario.empresaId, normalizedSaleId]
    );

    const documentoFiscal = documentRows[0];

    if (documentoFiscal?.status === 'autorizado') {
      throw createHttpError(
        409,
        'Cancele o documento fiscal antes de cancelar a venda.'
      );
    }

    const [itemRows] = await connection.query(
      `SELECT vi.produto_id, vi.quantidade, p.nome, p.estoque
       FROM venda_itens vi
       INNER JOIN produtos p ON p.id = vi.produto_id
       WHERE vi.venda_id = ?`,
      [normalizedSaleId]
    );

    for (const item of itemRows) {
      const saldoAnterior = Number(item.estoque);
      const saldoPosterior = saldoAnterior + Number(item.quantidade);

      await connection.query(
        'UPDATE produtos SET estoque = estoque + ? WHERE id = ?',
        [item.quantidade, item.produto_id]
      );

      await registrarMovimentoEstoque(connection, {
        empresa_id: usuario.empresaId,
        produto_id: item.produto_id,
        tipo: 'cancelamento_venda',
        origem: 'cancelamento_venda',
        origem_id: normalizedSaleId,
        quantidade: Number(item.quantidade),
        saldo_anterior: saldoAnterior,
        saldo_posterior: saldoPosterior,
        observacoes: `Retorno ao estoque pela venda cancelada #${normalizedSaleId}`,
        usuario_id: usuario.id,
      });
    }

    await connection.query(
      `INSERT INTO venda_cancelamentos (venda_id, usuario_id, motivo)
       VALUES (?, ?, ?)`,
      [normalizedSaleId, usuario.id, motivo]
    );

    await connection.query(
      `UPDATE vendas
       SET status = 'cancelada'
       WHERE id = ?`,
      [normalizedSaleId]
    );

    if (documentoFiscal && documentoFiscal.status !== 'cancelado') {
      await connection.query(
        `UPDATE documentos_fiscais
         SET status = 'cancelado',
             mensagem_retorno = 'Documento cancelado junto com a venda local.',
             motivo_cancelamento = ?,
             data_cancelamento = NOW(),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [motivo, documentoFiscal.id]
      );
    }

    await cancelarFinanceiroVenda(connection, usuario.empresaId, normalizedSaleId, motivo);

    await connection.commit();

    return {
      venda_id: normalizedSaleId,
      status: 'cancelada',
      motivo,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
