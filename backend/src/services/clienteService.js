import { pool } from '../config/database.js';
import { createHttpError } from '../utils/http.js';
import {
  ensureNonNegativeDecimal,
  ensurePositiveInteger,
  ensureRequiredString,
  normalizeBooleanFlag,
  normalizeOptionalDateString,
  normalizeOptionalString,
  normalizeSearchTerm,
  roundCurrency,
} from '../utils/validators.js';

function normalizeEmail(value) {
  const normalized = normalizeOptionalString(value, 160);

  if (!normalized) {
    return null;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw createHttpError(400, 'E-mail invalido.');
  }

  return normalized.toLowerCase();
}

function normalizeClientPayload(dados) {
  const payload = dados ?? {};

  return {
    nome: ensureRequiredString(payload.nome, 'Nome', 180),
    documento: normalizeOptionalString(payload.documento, 20),
    telefone: normalizeOptionalString(payload.telefone, 30),
    email: normalizeEmail(payload.email),
    data_nascimento: normalizeOptionalDateString(payload.data_nascimento, 'Data de nascimento'),
    observacoes: normalizeOptionalString(payload.observacoes, 255),
    ativo: normalizeBooleanFlag(payload.ativo, true) ? 1 : 0,
  };
}

function normalizeAddressPayload(dados) {
  const payload = dados ?? {};

  return {
    titulo: normalizeOptionalString(payload.titulo, 60),
    cep: normalizeOptionalString(payload.cep, 12),
    logradouro: ensureRequiredString(payload.logradouro, 'Logradouro', 160),
    numero: normalizeOptionalString(payload.numero, 20),
    complemento: normalizeOptionalString(payload.complemento, 80),
    bairro: ensureRequiredString(payload.bairro, 'Bairro', 80),
    cidade: ensureRequiredString(payload.cidade, 'Cidade', 80),
    estado: ensureRequiredString(payload.estado, 'Estado', 2).toUpperCase(),
    principal: normalizeBooleanFlag(payload.principal, false) ? 1 : 0,
  };
}

function normalizeContactPayload(dados) {
  const payload = dados ?? {};

  return {
    nome: ensureRequiredString(payload.nome, 'Nome do contato', 120),
    funcao: normalizeOptionalString(payload.funcao, 80),
    telefone: normalizeOptionalString(payload.telefone, 30),
    whatsapp: normalizeOptionalString(payload.whatsapp, 30),
    email: normalizeEmail(payload.email),
    observacoes: normalizeOptionalString(payload.observacoes, 255),
  };
}

function normalizeCreditPayload(dados) {
  const payload = dados ?? {};
  const diasVencimento = Number(payload.dias_vencimento ?? 30);

  if (!Number.isInteger(diasVencimento) || diasVencimento <= 0 || diasVencimento > 365) {
    throw createHttpError(400, 'Dias de vencimento deve ser um inteiro entre 1 e 365.');
  }

  return {
    limite_credito: ensureNonNegativeDecimal(payload.limite_credito ?? 0, 'Limite de credito'),
    dias_vencimento: diasVencimento,
    ativo: normalizeBooleanFlag(payload.ativo, false) ? 1 : 0,
    observacoes: normalizeOptionalString(payload.observacoes, 255),
  };
}

function mapClientRow(cliente) {
  return {
    ...cliente,
    documento: cliente.documento || null,
    telefone: cliente.telefone || null,
    email: cliente.email || null,
    data_nascimento: cliente.data_nascimento || null,
    observacoes: cliente.observacoes || null,
    ativo: Boolean(cliente.ativo),
    limite_credito: roundCurrency(cliente.limite_credito || 0),
    credito_ativo: Boolean(cliente.credito_ativo),
    credito_utilizado: roundCurrency(cliente.credito_utilizado || 0),
    credito_disponivel: roundCurrency(
      Math.max(Number(cliente.limite_credito || 0) - Number(cliente.credito_utilizado || 0), 0)
    ),
    total_compras: Number(cliente.total_compras || 0),
    total_gasto: roundCurrency(cliente.total_gasto || 0),
  };
}

async function obterClienteBase(connection, empresaId, clienteId, forUpdate = false) {
  const [rows] = await connection.query(
    `SELECT
      c.id,
      c.empresa_id,
      c.nome,
      c.documento,
      c.telefone,
      c.email,
      c.data_nascimento,
      c.observacoes,
      c.ativo,
      c.created_at,
      c.updated_at
     FROM clientes c
     WHERE c.empresa_id = ?
       AND c.id = ?
     LIMIT 1
     ${forUpdate ? 'FOR UPDATE' : ''}`,
    [empresaId, clienteId]
  );

  if (!rows[0]) {
    throw createHttpError(404, 'Cliente nao encontrado.');
  }

  return rows[0];
}

async function obterUsoCredito(connection, empresaId, clienteId) {
  const [rows] = await connection.query(
    `SELECT COALESCE(SUM(valor), 0) AS total
     FROM contas_receber
     WHERE empresa_id = ?
       AND cliente_id = ?
       AND forma_pagamento = 'crediario'
       AND status = 'pendente'`,
    [empresaId, clienteId]
  );

  return roundCurrency(rows[0]?.total || 0);
}

async function obterCreditoCliente(connection, empresaId, clienteId) {
  await obterClienteBase(connection, empresaId, clienteId);

  const [rows] = await connection.query(
    `SELECT
      cc.id,
      cc.limite_credito,
      cc.dias_vencimento,
      cc.ativo,
      cc.observacoes,
      cc.created_at,
      cc.updated_at
     FROM cliente_creditos cc
     INNER JOIN clientes c ON c.id = cc.cliente_id
     WHERE c.empresa_id = ?
       AND cc.cliente_id = ?
     LIMIT 1`,
    [empresaId, clienteId]
  );

  const credito = rows[0] || {
    id: null,
    limite_credito: 0,
    dias_vencimento: 30,
    ativo: 0,
    observacoes: null,
    created_at: null,
    updated_at: null,
  };
  const creditoUtilizado = await obterUsoCredito(connection, empresaId, clienteId);

  return {
    ...credito,
    limite_credito: roundCurrency(credito.limite_credito || 0),
    dias_vencimento: Number(credito.dias_vencimento || 30),
    ativo: Boolean(credito.ativo),
    observacoes: credito.observacoes || null,
    credito_utilizado: creditoUtilizado,
    credito_disponivel: roundCurrency(
      Math.max(Number(credito.limite_credito || 0) - Number(creditoUtilizado || 0), 0)
    ),
  };
}

async function obterResumoCliente(connection, empresaId, clienteId) {
  const [rows] = await connection.query(
    `SELECT
      COALESCE(vs.total_compras, 0) AS total_compras,
      COALESCE(vs.total_gasto, 0) AS total_gasto,
      COALESCE(vs.ticket_medio, 0) AS ticket_medio,
      vs.ultima_compra,
      COALESCE(crs.contas_abertas, 0) AS contas_abertas
     FROM clientes c
     LEFT JOIN (
       SELECT
         cliente_id,
         COUNT(*) AS total_compras,
         COALESCE(SUM(total), 0) AS total_gasto,
         COALESCE(AVG(total), 0) AS ticket_medio,
         MAX(created_at) AS ultima_compra
       FROM vendas
       WHERE empresa_id = ?
         AND status = 'finalizada'
       GROUP BY cliente_id
     ) vs ON vs.cliente_id = c.id
     LEFT JOIN (
       SELECT
         cliente_id,
         COALESCE(SUM(valor), 0) AS contas_abertas
       FROM contas_receber
       WHERE empresa_id = ?
         AND status = 'pendente'
       GROUP BY cliente_id
     ) crs ON crs.cliente_id = c.id
     WHERE c.empresa_id = ?
       AND c.id = ?
     LIMIT 1`,
    [empresaId, empresaId, empresaId, clienteId]
  );

  const resumo = rows[0] || {};

  return {
    total_compras: Number(resumo.total_compras || 0),
    total_gasto: roundCurrency(resumo.total_gasto || 0),
    ticket_medio: roundCurrency(resumo.ticket_medio || 0),
    ultima_compra: resumo.ultima_compra || null,
    contas_abertas: roundCurrency(resumo.contas_abertas || 0),
  };
}

async function listarEnderecos(connection, empresaId, clienteId) {
  await obterClienteBase(connection, empresaId, clienteId);

  const [rows] = await connection.query(
    `SELECT
      ce.id,
      ce.titulo,
      ce.cep,
      ce.logradouro,
      ce.numero,
      ce.complemento,
      ce.bairro,
      ce.cidade,
      ce.estado,
      ce.principal,
      ce.created_at,
      ce.updated_at
     FROM cliente_enderecos ce
     INNER JOIN clientes c ON c.id = ce.cliente_id
     WHERE c.empresa_id = ?
       AND ce.cliente_id = ?
     ORDER BY ce.principal DESC, ce.id ASC`,
    [empresaId, clienteId]
  );

  return rows.map((row) => ({
    ...row,
    principal: Boolean(row.principal),
    titulo: row.titulo || null,
    cep: row.cep || null,
    numero: row.numero || null,
    complemento: row.complemento || null,
  }));
}

async function listarContatos(connection, empresaId, clienteId) {
  await obterClienteBase(connection, empresaId, clienteId);

  const [rows] = await connection.query(
    `SELECT
      cc.id,
      cc.nome,
      cc.funcao,
      cc.telefone,
      cc.whatsapp,
      cc.email,
      cc.observacoes,
      cc.created_at,
      cc.updated_at
     FROM cliente_contatos cc
     INNER JOIN clientes c ON c.id = cc.cliente_id
     WHERE c.empresa_id = ?
       AND cc.cliente_id = ?
     ORDER BY cc.id ASC`,
    [empresaId, clienteId]
  );

  return rows.map((row) => ({
    ...row,
    funcao: row.funcao || null,
    telefone: row.telefone || null,
    whatsapp: row.whatsapp || null,
    email: row.email || null,
    observacoes: row.observacoes || null,
  }));
}

export async function listarCompras(empresaId, clienteId, filtros = {}) {
  const normalizedClientId = ensurePositiveInteger(clienteId, 'Cliente');
  const limiteInformado = Number(filtros.limite || 12);
  const limite = Math.min(Math.max(Number.isInteger(limiteInformado) ? limiteInformado : 12, 1), 50);

  const [rows] = await pool.query(
    `SELECT
      v.id,
      v.total,
      v.forma_pagamento,
      v.created_at,
      COALESCE(SUM(vi.quantidade), 0) AS total_itens
     FROM vendas v
     LEFT JOIN venda_itens vi ON vi.venda_id = v.id
     WHERE v.empresa_id = ?
       AND v.cliente_id = ?
       AND v.status = 'finalizada'
     GROUP BY v.id, v.total, v.forma_pagamento, v.created_at
     ORDER BY v.created_at DESC
     LIMIT ?`,
    [empresaId, normalizedClientId, limite]
  );

  return rows.map((row) => ({
    ...row,
    total: roundCurrency(row.total || 0),
    total_itens: Number(row.total_itens || 0),
  }));
}

export async function listarHistorico(empresaId, clienteId, filtros = {}) {
  const normalizedClientId = ensurePositiveInteger(clienteId, 'Cliente');
  const limiteInformado = Number(filtros.limite || 20);
  const limite = Math.min(Math.max(Number.isInteger(limiteInformado) ? limiteInformado : 20, 1), 100);

  const [rows] = await pool.query(
    `SELECT
      ch.id,
      ch.tipo_evento,
      ch.referencia_tipo,
      ch.referencia_id,
      ch.descricao,
      ch.valor_referencia,
      ch.created_at,
      u.nome AS usuario_nome
     FROM cliente_historico ch
     LEFT JOIN usuarios u ON u.id = ch.usuario_id
     INNER JOIN clientes c ON c.id = ch.cliente_id
     WHERE c.empresa_id = ?
       AND ch.cliente_id = ?
     ORDER BY ch.created_at DESC, ch.id DESC
     LIMIT ?`,
    [empresaId, normalizedClientId, limite]
  );

  return rows.map((row) => ({
    ...row,
    valor_referencia: row.valor_referencia === null ? null : roundCurrency(row.valor_referencia),
    usuario_nome: row.usuario_nome || null,
    referencia_tipo: row.referencia_tipo || null,
  }));
}

async function listarContasAbertas(connection, empresaId, clienteId) {
  const [rows] = await connection.query(
    `SELECT
      id,
      venda_id,
      forma_pagamento,
      valor,
      vencimento,
      status,
      observacoes
     FROM contas_receber
     WHERE empresa_id = ?
       AND cliente_id = ?
       AND status = 'pendente'
     ORDER BY vencimento ASC, id DESC
     LIMIT 12`,
    [empresaId, clienteId]
  );

  return rows.map((row) => ({
    ...row,
    valor: roundCurrency(row.valor || 0),
    observacoes: row.observacoes || null,
  }));
}

export async function registrarHistoricoCliente(connection, payload) {
  if (!payload?.cliente_id) {
    return null;
  }

  const descricao = ensureRequiredString(payload.descricao, 'Descricao do historico', 255);
  const tipoEvento = ensureRequiredString(payload.tipo_evento, 'Tipo do historico', 40);
  const valorReferencia =
    payload.valor_referencia === undefined || payload.valor_referencia === null || payload.valor_referencia === ''
      ? null
      : ensureNonNegativeDecimal(payload.valor_referencia, 'Valor de referencia');

  const [result] = await connection.query(
    `INSERT INTO cliente_historico (
      cliente_id,
      usuario_id,
      tipo_evento,
      referencia_tipo,
      referencia_id,
      descricao,
      valor_referencia
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.cliente_id,
      payload.usuario_id ?? null,
      tipoEvento,
      payload.referencia_tipo ?? null,
      payload.referencia_id ?? null,
      descricao,
      valorReferencia,
    ]
  );

  return result.insertId;
}

export async function obterResumoCreditoCliente(connection, empresaId, clienteId) {
  const normalizedClientId = ensurePositiveInteger(clienteId, 'Cliente');
  return obterCreditoCliente(connection, empresaId, normalizedClientId);
}

export async function listar(empresaId, filtros = {}) {
  const busca = normalizeSearchTerm(filtros.busca);
  const limiteInformado = Number(filtros.limite || 100);
  const limite = Math.min(Math.max(Number.isInteger(limiteInformado) ? limiteInformado : 100, 1), 200);
  const termo = `%${busca}%`;

  let sql = `
    SELECT
      c.id,
      c.nome,
      c.documento,
      c.telefone,
      c.email,
      c.data_nascimento,
      c.observacoes,
      c.ativo,
      c.created_at,
      c.updated_at,
      COALESCE(cc.limite_credito, 0) AS limite_credito,
      COALESCE(cc.dias_vencimento, 30) AS dias_vencimento,
      COALESCE(cc.ativo, 0) AS credito_ativo,
      COALESCE(cred.credito_utilizado, 0) AS credito_utilizado,
      COALESCE(vs.total_compras, 0) AS total_compras,
      COALESCE(vs.total_gasto, 0) AS total_gasto,
      vs.ultima_compra
    FROM clientes c
    LEFT JOIN cliente_creditos cc ON cc.cliente_id = c.id
    LEFT JOIN (
      SELECT
        cliente_id,
        COALESCE(SUM(valor), 0) AS credito_utilizado
      FROM contas_receber
      WHERE empresa_id = ?
        AND forma_pagamento = 'crediario'
        AND status = 'pendente'
      GROUP BY cliente_id
    ) cred ON cred.cliente_id = c.id
    LEFT JOIN (
      SELECT
        cliente_id,
        COUNT(*) AS total_compras,
        COALESCE(SUM(total), 0) AS total_gasto,
        MAX(created_at) AS ultima_compra
      FROM vendas
      WHERE empresa_id = ?
        AND status = 'finalizada'
      GROUP BY cliente_id
    ) vs ON vs.cliente_id = c.id
    WHERE c.empresa_id = ?
  `;

  const params = [empresaId, empresaId, empresaId];

  if (busca) {
    sql += ' AND (c.nome LIKE ? OR c.documento LIKE ? OR c.telefone LIKE ? OR c.email LIKE ?)';
    params.push(termo, termo, termo, termo);
  }

  sql += ' ORDER BY c.nome ASC LIMIT ?';
  params.push(limite);

  const [rows] = await pool.query(sql, params);
  return rows.map(mapClientRow);
}

export async function obterPorId(empresaId, id) {
  const clienteId = ensurePositiveInteger(id, 'Cliente');
  const connection = await pool.getConnection();

  try {
    const clienteBase = await obterClienteBase(connection, empresaId, clienteId);
    const credito = await obterCreditoCliente(connection, empresaId, clienteId);
    const resumo = await obterResumoCliente(connection, empresaId, clienteId);
    const [compras, historico, enderecos, contatos, contas_abertas] = await Promise.all([
      listarCompras(empresaId, clienteId, { limite: 10 }),
      listarHistorico(empresaId, clienteId, { limite: 12 }),
      listarEnderecos(connection, empresaId, clienteId),
      listarContatos(connection, empresaId, clienteId),
      listarContasAbertas(connection, empresaId, clienteId),
    ]);

    return {
      ...mapClientRow({
        ...clienteBase,
        limite_credito: credito.limite_credito,
        credito_ativo: credito.ativo ? 1 : 0,
        credito_utilizado: credito.credito_utilizado,
        total_compras: resumo.total_compras,
        total_gasto: resumo.total_gasto,
        ultima_compra: resumo.ultima_compra,
      }),
      credito: {
        ...credito,
        saldo_utilizado: credito.credito_utilizado,
        saldo_disponivel: credito.credito_disponivel,
      },
      resumo,
      enderecos,
      contatos,
      compras_recentes: compras,
      historico_recente: historico,
      contas_abertas,
    };
  } finally {
    connection.release();
  }
}

export async function criar(empresaId, dados, usuario = null) {
  const payload = normalizeClientPayload(dados);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO clientes (
        empresa_id,
        nome,
        documento,
        telefone,
        email,
        data_nascimento,
        observacoes,
        ativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empresaId,
        payload.nome,
        payload.documento,
        payload.telefone,
        payload.email,
        payload.data_nascimento,
        payload.observacoes,
        payload.ativo,
      ]
    );

    await registrarHistoricoCliente(connection, {
      cliente_id: result.insertId,
      usuario_id: usuario?.id ?? null,
      tipo_evento: 'cadastro',
      referencia_tipo: 'cliente',
      referencia_id: result.insertId,
      descricao: 'Cadastro inicial do cliente.',
    });

    await connection.commit();
    return obterPorId(empresaId, result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function atualizar(empresaId, id, dados, usuario = null) {
  const clienteId = ensurePositiveInteger(id, 'Cliente');
  const payload = normalizeClientPayload(dados);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await obterClienteBase(connection, empresaId, clienteId, true);

    const [result] = await connection.query(
      `UPDATE clientes
       SET nome = ?,
           documento = ?,
           telefone = ?,
           email = ?,
           data_nascimento = ?,
           observacoes = ?,
           ativo = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE empresa_id = ?
         AND id = ?`,
      [
        payload.nome,
        payload.documento,
        payload.telefone,
        payload.email,
        payload.data_nascimento,
        payload.observacoes,
        payload.ativo,
        empresaId,
        clienteId,
      ]
    );

    if (!result.affectedRows) {
      throw createHttpError(404, 'Cliente nao encontrado.');
    }

    await registrarHistoricoCliente(connection, {
      cliente_id: clienteId,
      usuario_id: usuario?.id ?? null,
      tipo_evento: 'atualizacao',
      referencia_tipo: 'cliente',
      referencia_id: clienteId,
      descricao: 'Ficha principal do cliente atualizada.',
    });

    await connection.commit();
    return obterPorId(empresaId, clienteId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function salvarEndereco(empresaId, clienteId, dados, usuario = null, enderecoId = null) {
  const normalizedClientId = ensurePositiveInteger(clienteId, 'Cliente');
  const normalizedEnderecoId = enderecoId ? ensurePositiveInteger(enderecoId, 'Endereco') : null;
  const payload = normalizeAddressPayload(dados);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await obterClienteBase(connection, empresaId, normalizedClientId, true);

    if (payload.principal) {
      await connection.query(
        'UPDATE cliente_enderecos SET principal = 0, updated_at = CURRENT_TIMESTAMP WHERE cliente_id = ?',
        [normalizedClientId]
      );
    }

    if (normalizedEnderecoId) {
      const [result] = await connection.query(
        `UPDATE cliente_enderecos
         SET titulo = ?,
             cep = ?,
             logradouro = ?,
             numero = ?,
             complemento = ?,
             bairro = ?,
             cidade = ?,
             estado = ?,
             principal = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
           AND cliente_id = ?`,
        [
          payload.titulo,
          payload.cep,
          payload.logradouro,
          payload.numero,
          payload.complemento,
          payload.bairro,
          payload.cidade,
          payload.estado,
          payload.principal,
          normalizedEnderecoId,
          normalizedClientId,
        ]
      );

      if (!result.affectedRows) {
        throw createHttpError(404, 'Endereco nao encontrado.');
      }
    } else {
      await connection.query(
        `INSERT INTO cliente_enderecos (
          cliente_id,
          titulo,
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          principal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          normalizedClientId,
          payload.titulo,
          payload.cep,
          payload.logradouro,
          payload.numero,
          payload.complemento,
          payload.bairro,
          payload.cidade,
          payload.estado,
          payload.principal,
        ]
      );
    }

    const [principalRows] = await connection.query(
      'SELECT COUNT(*) AS total FROM cliente_enderecos WHERE cliente_id = ? AND principal = 1',
      [normalizedClientId]
    );

    if (Number(principalRows[0]?.total || 0) === 0) {
      await connection.query(
        `UPDATE cliente_enderecos
         SET principal = 1, updated_at = CURRENT_TIMESTAMP
         WHERE cliente_id = ?
         ORDER BY id ASC
         LIMIT 1`,
        [normalizedClientId]
      );
    }

    await registrarHistoricoCliente(connection, {
      cliente_id: normalizedClientId,
      usuario_id: usuario?.id ?? null,
      tipo_evento: 'endereco',
      referencia_tipo: 'cliente_endereco',
      referencia_id: normalizedEnderecoId,
      descricao: normalizedEnderecoId
        ? 'Endereco do cliente atualizado.'
        : 'Novo endereco adicionado ao cliente.',
    });

    await connection.commit();
    return obterPorId(empresaId, normalizedClientId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function removerEndereco(empresaId, clienteId, enderecoId, usuario = null) {
  const normalizedClientId = ensurePositiveInteger(clienteId, 'Cliente');
  const normalizedEnderecoId = ensurePositiveInteger(enderecoId, 'Endereco');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await obterClienteBase(connection, empresaId, normalizedClientId, true);

    const [result] = await connection.query(
      'DELETE FROM cliente_enderecos WHERE id = ? AND cliente_id = ?',
      [normalizedEnderecoId, normalizedClientId]
    );

    if (!result.affectedRows) {
      throw createHttpError(404, 'Endereco nao encontrado.');
    }

    const [principalRows] = await connection.query(
      'SELECT COUNT(*) AS total FROM cliente_enderecos WHERE cliente_id = ? AND principal = 1',
      [normalizedClientId]
    );

    if (Number(principalRows[0]?.total || 0) === 0) {
      await connection.query(
        `UPDATE cliente_enderecos
         SET principal = 1, updated_at = CURRENT_TIMESTAMP
         WHERE cliente_id = ?
         ORDER BY id ASC
         LIMIT 1`,
        [normalizedClientId]
      );
    }

    await registrarHistoricoCliente(connection, {
      cliente_id: normalizedClientId,
      usuario_id: usuario?.id ?? null,
      tipo_evento: 'endereco',
      referencia_tipo: 'cliente_endereco',
      referencia_id: normalizedEnderecoId,
      descricao: 'Endereco removido da ficha do cliente.',
    });

    await connection.commit();
    return { message: 'Endereco removido com sucesso.' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function salvarContato(empresaId, clienteId, dados, usuario = null, contatoId = null) {
  const normalizedClientId = ensurePositiveInteger(clienteId, 'Cliente');
  const normalizedContatoId = contatoId ? ensurePositiveInteger(contatoId, 'Contato') : null;
  const payload = normalizeContactPayload(dados);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await obterClienteBase(connection, empresaId, normalizedClientId, true);

    if (normalizedContatoId) {
      const [result] = await connection.query(
        `UPDATE cliente_contatos
         SET nome = ?,
             funcao = ?,
             telefone = ?,
             whatsapp = ?,
             email = ?,
             observacoes = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
           AND cliente_id = ?`,
        [
          payload.nome,
          payload.funcao,
          payload.telefone,
          payload.whatsapp,
          payload.email,
          payload.observacoes,
          normalizedContatoId,
          normalizedClientId,
        ]
      );

      if (!result.affectedRows) {
        throw createHttpError(404, 'Contato nao encontrado.');
      }
    } else {
      await connection.query(
        `INSERT INTO cliente_contatos (
          cliente_id,
          nome,
          funcao,
          telefone,
          whatsapp,
          email,
          observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          normalizedClientId,
          payload.nome,
          payload.funcao,
          payload.telefone,
          payload.whatsapp,
          payload.email,
          payload.observacoes,
        ]
      );
    }

    await registrarHistoricoCliente(connection, {
      cliente_id: normalizedClientId,
      usuario_id: usuario?.id ?? null,
      tipo_evento: 'contato',
      referencia_tipo: 'cliente_contato',
      referencia_id: normalizedContatoId,
      descricao: normalizedContatoId
        ? 'Contato do cliente atualizado.'
        : 'Novo contato adicionado ao cliente.',
    });

    await connection.commit();
    return obterPorId(empresaId, normalizedClientId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function removerContato(empresaId, clienteId, contatoId, usuario = null) {
  const normalizedClientId = ensurePositiveInteger(clienteId, 'Cliente');
  const normalizedContatoId = ensurePositiveInteger(contatoId, 'Contato');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await obterClienteBase(connection, empresaId, normalizedClientId, true);

    const [result] = await connection.query(
      'DELETE FROM cliente_contatos WHERE id = ? AND cliente_id = ?',
      [normalizedContatoId, normalizedClientId]
    );

    if (!result.affectedRows) {
      throw createHttpError(404, 'Contato nao encontrado.');
    }

    await registrarHistoricoCliente(connection, {
      cliente_id: normalizedClientId,
      usuario_id: usuario?.id ?? null,
      tipo_evento: 'contato',
      referencia_tipo: 'cliente_contato',
      referencia_id: normalizedContatoId,
      descricao: 'Contato removido da ficha do cliente.',
    });

    await connection.commit();
    return { message: 'Contato removido com sucesso.' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function atualizarCredito(empresaId, clienteId, dados, usuario = null) {
  const normalizedClientId = ensurePositiveInteger(clienteId, 'Cliente');
  const payload = normalizeCreditPayload(dados);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await obterClienteBase(connection, empresaId, normalizedClientId, true);

    await connection.query(
      `INSERT INTO cliente_creditos (
        cliente_id,
        limite_credito,
        dias_vencimento,
        ativo,
        observacoes
      ) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        limite_credito = VALUES(limite_credito),
        dias_vencimento = VALUES(dias_vencimento),
        ativo = VALUES(ativo),
        observacoes = VALUES(observacoes),
        updated_at = CURRENT_TIMESTAMP`,
      [
        normalizedClientId,
        payload.limite_credito,
        payload.dias_vencimento,
        payload.ativo,
        payload.observacoes,
      ]
    );

    await registrarHistoricoCliente(connection, {
      cliente_id: normalizedClientId,
      usuario_id: usuario?.id ?? null,
      tipo_evento: 'credito',
      referencia_tipo: 'cliente_credito',
      referencia_id: normalizedClientId,
      descricao: payload.ativo
        ? `Credito atualizado com limite de ${payload.limite_credito.toFixed(2)}.`
        : 'Credito do cliente desativado.',
      valor_referencia: payload.limite_credito,
    });

    await connection.commit();
    return obterPorId(empresaId, normalizedClientId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function remover(empresaId, id, usuario = null) {
  const clienteId = ensurePositiveInteger(id, 'Cliente');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await obterClienteBase(connection, empresaId, clienteId, true);

    const [usageRows] = await connection.query(
      `SELECT
        (SELECT COUNT(*) FROM vendas WHERE empresa_id = ? AND cliente_id = ?) AS total_vendas,
        (SELECT COUNT(*) FROM contas_receber WHERE empresa_id = ? AND cliente_id = ? AND status <> 'cancelado') AS total_titulos`,
      [empresaId, clienteId, empresaId, clienteId]
    );

    const usage = usageRows[0] || {};

    if (Number(usage.total_vendas || 0) > 0 || Number(usage.total_titulos || 0) > 0) {
      await connection.query(
        `UPDATE clientes
         SET ativo = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE empresa_id = ?
           AND id = ?`,
        [empresaId, clienteId]
      );

      await registrarHistoricoCliente(connection, {
        cliente_id: clienteId,
        usuario_id: usuario?.id ?? null,
        tipo_evento: 'inativacao',
        referencia_tipo: 'cliente',
        referencia_id: clienteId,
        descricao: 'Cliente inativado por possuir historico comercial no sistema.',
      });

      await connection.commit();
      return { message: 'Cliente inativado com sucesso.' };
    }

    await connection.query('DELETE FROM clientes WHERE empresa_id = ? AND id = ?', [empresaId, clienteId]);
    await connection.commit();
    return { message: 'Cliente removido com sucesso.' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
