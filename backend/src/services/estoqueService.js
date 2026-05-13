import { pool } from '../config/database.js';
import { createHttpError } from '../utils/http.js';
import {
  ensureEnum,
  ensureNonNegativeInteger,
  ensurePositiveInteger,
  ensureRequiredString,
  normalizeOptionalString,
} from '../utils/validators.js';

const ADJUSTMENT_TYPES = ['entrada', 'saida'];
const INVENTORY_STATUSES = ['aberto', 'finalizado', 'cancelado'];

function mapInventoryRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    empresa_id: row.empresa_id,
    usuario_id: row.usuario_id,
    usuario_nome: row.usuario_nome,
    nome: row.nome,
    status: row.status,
    data_inicio: row.data_inicio,
    data_fim: row.data_fim,
    observacoes: row.observacoes,
    total_itens: Number(row.total_itens || 0),
    itens_contados: Number(row.itens_contados || 0),
    itens_pendentes: Number(row.itens_pendentes || 0),
    itens_com_diferenca: Number(row.itens_com_diferenca || 0),
  };
}

async function buscarInventarioPorId(connection, empresaId, inventarioId) {
  const [rows] = await connection.query(
    `SELECT
      i.id,
      i.empresa_id,
      i.usuario_id,
      u.nome AS usuario_nome,
      i.nome,
      i.status,
      i.data_inicio,
      i.data_fim,
      i.observacoes,
      COUNT(ii.id) AS total_itens,
      COALESCE(SUM(CASE WHEN ii.saldo_contado IS NOT NULL THEN 1 ELSE 0 END), 0) AS itens_contados,
      COALESCE(SUM(CASE WHEN ii.saldo_contado IS NULL THEN 1 ELSE 0 END), 0) AS itens_pendentes,
      COALESCE(SUM(CASE WHEN ii.diferenca IS NOT NULL AND ii.diferenca <> 0 THEN 1 ELSE 0 END), 0) AS itens_com_diferenca
     FROM inventarios i
     INNER JOIN usuarios u ON u.id = i.usuario_id
     LEFT JOIN inventario_itens ii ON ii.inventario_id = i.id
     WHERE i.empresa_id = ?
       AND i.id = ?
     GROUP BY
      i.id,
      i.empresa_id,
      i.usuario_id,
      u.nome,
      i.nome,
      i.status,
      i.data_inicio,
      i.data_fim,
      i.observacoes
     LIMIT 1`,
    [empresaId, inventarioId]
  );

  return mapInventoryRow(rows[0]);
}

async function buscarInventarioAberto(connection, empresaId) {
  const [rows] = await connection.query(
    `SELECT id
     FROM inventarios
     WHERE empresa_id = ?
       AND status = 'aberto'
     ORDER BY data_inicio DESC, id DESC
     LIMIT 1`,
    [empresaId]
  );

  const inventarioId = rows[0]?.id;

  if (!inventarioId) {
    return null;
  }

  return buscarInventarioPorId(connection, empresaId, inventarioId);
}

export async function registrarMovimentoEstoque(connection, dados) {
  const payload = dados ?? {};

  await connection.query(
    `INSERT INTO estoque_movimentos (
      empresa_id,
      produto_id,
      tipo,
      origem,
      origem_id,
      quantidade,
      saldo_anterior,
      saldo_posterior,
      observacoes,
      usuario_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.empresa_id,
      payload.produto_id,
      payload.tipo,
      payload.origem,
      payload.origem_id ?? null,
      payload.quantidade,
      payload.saldo_anterior,
      payload.saldo_posterior,
      payload.observacoes ?? null,
      payload.usuario_id,
    ]
  );
}

export async function listarMovimentos(empresaId, filtros = {}) {
  const limiteInformado = Number(filtros.limite || 100);
  const limiteNormalizado = Number.isInteger(limiteInformado) ? limiteInformado : 100;
  const limite = Math.min(Math.max(limiteNormalizado, 1), 200);
  const produtoId = filtros.produto_id ? ensurePositiveInteger(filtros.produto_id, 'Produto') : null;
  const busca = String(filtros.busca || '').trim();
  const termo = `%${busca}%`;

  let sql = `
    SELECT
      em.id,
      em.tipo,
      em.origem,
      em.origem_id,
      em.quantidade,
      em.saldo_anterior,
      em.saldo_posterior,
      em.observacoes,
      em.created_at,
      p.id AS produto_id,
      p.nome AS produto_nome,
      p.codigo_barras,
      u.nome AS usuario
    FROM estoque_movimentos em
    INNER JOIN produtos p ON p.id = em.produto_id
    INNER JOIN usuarios u ON u.id = em.usuario_id
    WHERE em.empresa_id = ?
  `;

  const params = [empresaId];

  if (produtoId) {
    sql += ' AND em.produto_id = ?';
    params.push(produtoId);
  }

  if (busca) {
    sql += ' AND (p.nome LIKE ? OR p.codigo_barras LIKE ? OR em.origem LIKE ?)';
    params.push(termo, termo, termo);
  }

  sql += ' ORDER BY em.created_at DESC, em.id DESC LIMIT ?';
  params.push(limite);

  const [rows] = await pool.query(sql, params);
  return rows.map((row) => ({
    ...row,
    quantidade: Number(row.quantidade),
    saldo_anterior: Number(row.saldo_anterior),
    saldo_posterior: Number(row.saldo_posterior),
  }));
}

export async function listarInventarios(empresaId, filtros = {}) {
  const limiteInformado = Number(filtros.limite || 10);
  const limiteNormalizado = Number.isInteger(limiteInformado) ? limiteInformado : 10;
  const limite = Math.min(Math.max(limiteNormalizado, 1), 30);
  const status = filtros.status
    ? ensureEnum(filtros.status, INVENTORY_STATUSES, 'Status do inventario')
    : null;

  let sql = `
    SELECT
      i.id,
      i.empresa_id,
      i.usuario_id,
      u.nome AS usuario_nome,
      i.nome,
      i.status,
      i.data_inicio,
      i.data_fim,
      i.observacoes,
      COUNT(ii.id) AS total_itens,
      COALESCE(SUM(CASE WHEN ii.saldo_contado IS NOT NULL THEN 1 ELSE 0 END), 0) AS itens_contados,
      COALESCE(SUM(CASE WHEN ii.saldo_contado IS NULL THEN 1 ELSE 0 END), 0) AS itens_pendentes,
      COALESCE(SUM(CASE WHEN ii.diferenca IS NOT NULL AND ii.diferenca <> 0 THEN 1 ELSE 0 END), 0) AS itens_com_diferenca
     FROM inventarios i
     INNER JOIN usuarios u ON u.id = i.usuario_id
     LEFT JOIN inventario_itens ii ON ii.inventario_id = i.id
     WHERE i.empresa_id = ?
  `;

  const params = [empresaId];

  if (status) {
    sql += ' AND i.status = ?';
    params.push(status);
  }

  sql += `
     GROUP BY
      i.id,
      i.empresa_id,
      i.usuario_id,
      u.nome,
      i.nome,
      i.status,
      i.data_inicio,
      i.data_fim,
      i.observacoes
     ORDER BY i.data_inicio DESC, i.id DESC
     LIMIT ?
  `;
  params.push(limite);

  const [rows] = await pool.query(sql, params);
  return rows.map(mapInventoryRow);
}

export async function obterInventarioAtual(empresaId) {
  const connection = await pool.getConnection();

  try {
    return await buscarInventarioAberto(connection, empresaId);
  } finally {
    connection.release();
  }
}

export async function iniciarInventario(usuario, dados) {
  const nome = ensureRequiredString(dados?.nome, 'Nome do inventario', 140);
  const observacoes = normalizeOptionalString(dados?.observacoes, 255);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const inventarioAberto = await buscarInventarioAberto(connection, usuario.empresaId);

    if (inventarioAberto) {
      throw createHttpError(409, 'Ja existe um inventario aberto para esta empresa.');
    }

    const [inventoryResult] = await connection.query(
      `INSERT INTO inventarios (empresa_id, usuario_id, nome, observacoes)
       VALUES (?, ?, ?, ?)`,
      [usuario.empresaId, usuario.id, nome, observacoes]
    );

    const inventarioId = inventoryResult.insertId;

    await connection.query(
      `INSERT INTO inventario_itens (inventario_id, produto_id, saldo_sistema)
       SELECT ?, p.id, p.estoque
       FROM produtos p
       WHERE p.empresa_id = ?
         AND p.ativo = 1
       ORDER BY p.nome ASC, p.id ASC`,
      [inventarioId, usuario.empresaId]
    );

    await connection.commit();

    return await buscarInventarioPorId(connection, usuario.empresaId, inventarioId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listarItensInventario(empresaId, inventarioId, filtros = {}) {
  const inventarioNormalizado = ensurePositiveInteger(inventarioId, 'Inventario');
  const limiteInformado = Number(filtros.limite || 300);
  const limiteNormalizado = Number.isInteger(limiteInformado) ? limiteInformado : 300;
  const limite = Math.min(Math.max(limiteNormalizado, 1), 500);
  const busca = String(filtros.busca || '').trim();
  const termo = `%${busca}%`;
  const somentePendentes = ['1', 'true', true].includes(filtros.pendentes);

  let sql = `
    SELECT
      ii.id,
      ii.produto_id,
      ii.saldo_sistema,
      ii.saldo_contado,
      ii.diferenca,
      ii.updated_at,
      p.nome AS produto_nome,
      p.codigo_barras,
      p.estoque AS estoque_atual,
      p.estoque_minimo
     FROM inventario_itens ii
     INNER JOIN inventarios i ON i.id = ii.inventario_id
     INNER JOIN produtos p ON p.id = ii.produto_id
     WHERE i.empresa_id = ?
       AND ii.inventario_id = ?
  `;

  const params = [empresaId, inventarioNormalizado];

  if (busca) {
    sql += ' AND (p.nome LIKE ? OR p.codigo_barras LIKE ?)';
    params.push(termo, termo);
  }

  if (somentePendentes) {
    sql += ' AND ii.saldo_contado IS NULL';
  }

  sql += `
     ORDER BY
      CASE WHEN ii.saldo_contado IS NULL THEN 0 ELSE 1 END,
      p.nome ASC,
      p.id ASC
     LIMIT ?
  `;
  params.push(limite);

  const [rows] = await pool.query(sql, params);
  return rows.map((row) => ({
    ...row,
    saldo_sistema: Number(row.saldo_sistema),
    saldo_contado:
      row.saldo_contado === null || row.saldo_contado === undefined ? null : Number(row.saldo_contado),
    diferenca: row.diferenca === null || row.diferenca === undefined ? null : Number(row.diferenca),
    estoque_atual: Number(row.estoque_atual),
    estoque_minimo: Number(row.estoque_minimo),
  }));
}

export async function registrarContagemInventario(usuario, inventarioId, dados) {
  const inventarioNormalizado = ensurePositiveInteger(inventarioId, 'Inventario');
  const produtoId = ensurePositiveInteger(dados?.produto_id, 'Produto');
  const saldoContado = ensureNonNegativeInteger(dados?.saldo_contado, 'Saldo contado');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const inventario = await buscarInventarioPorId(connection, usuario.empresaId, inventarioNormalizado);

    if (!inventario) {
      throw createHttpError(404, 'Inventario nao encontrado.');
    }

    if (inventario.status !== 'aberto') {
      throw createHttpError(409, 'Somente inventarios abertos podem receber contagem.');
    }

    const [rows] = await connection.query(
      `SELECT ii.id, ii.saldo_sistema, p.nome AS produto_nome
       FROM inventario_itens ii
       INNER JOIN produtos p ON p.id = ii.produto_id
       WHERE ii.inventario_id = ?
         AND ii.produto_id = ?
       LIMIT 1
       FOR UPDATE`,
      [inventarioNormalizado, produtoId]
    );

    const item = rows[0];

    if (!item) {
      throw createHttpError(404, 'Produto nao encontrado neste inventario.');
    }

    const diferenca = saldoContado - Number(item.saldo_sistema);

    await connection.query(
      `UPDATE inventario_itens
       SET saldo_contado = ?,
           diferenca = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [saldoContado, diferenca, item.id]
    );

    await connection.commit();

    return {
      inventario_id: inventarioNormalizado,
      produto_id: produtoId,
      produto_nome: item.produto_nome,
      saldo_sistema: Number(item.saldo_sistema),
      saldo_contado: saldoContado,
      diferenca,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function finalizarInventario(usuario, inventarioId, dados) {
  const inventarioNormalizado = ensurePositiveInteger(inventarioId, 'Inventario');
  const observacoes = normalizeOptionalString(dados?.observacoes, 255);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const inventario = await buscarInventarioPorId(connection, usuario.empresaId, inventarioNormalizado);

    if (!inventario) {
      throw createHttpError(404, 'Inventario nao encontrado.');
    }

    if (inventario.status !== 'aberto') {
      throw createHttpError(409, 'Somente inventarios abertos podem ser finalizados.');
    }

    const [itemRows] = await connection.query(
      `SELECT
        ii.produto_id,
        ii.saldo_sistema,
        ii.saldo_contado,
        ii.diferenca,
        p.nome AS produto_nome,
        p.estoque AS estoque_atual
       FROM inventario_itens ii
       INNER JOIN produtos p ON p.id = ii.produto_id
       WHERE ii.inventario_id = ?
         AND ii.saldo_contado IS NOT NULL
       ORDER BY p.nome ASC, p.id ASC
       FOR UPDATE`,
      [inventarioNormalizado]
    );

    if (!itemRows.length) {
      throw createHttpError(400, 'Registre ao menos uma contagem antes de finalizar o inventario.');
    }

    let itensAjustados = 0;

    for (const item of itemRows) {
      const saldoAtual = Number(item.estoque_atual);
      const saldoContado = Number(item.saldo_contado);

      if (saldoAtual === saldoContado) {
        continue;
      }

      await connection.query(
        `UPDATE produtos
         SET estoque = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [saldoContado, item.produto_id]
      );

      await registrarMovimentoEstoque(connection, {
        empresa_id: usuario.empresaId,
        produto_id: item.produto_id,
        tipo: 'inventario_ajuste',
        origem: 'inventario',
        origem_id: inventarioNormalizado,
        quantidade: saldoContado - saldoAtual,
        saldo_anterior: saldoAtual,
        saldo_posterior: saldoContado,
        observacoes: `Fechamento do inventario ${inventario.nome}`,
        usuario_id: usuario.id,
      });

      itensAjustados += 1;
    }

    await connection.query(
      `UPDATE inventarios
       SET status = 'finalizado',
           data_fim = CURRENT_TIMESTAMP,
           observacoes = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [observacoes ?? inventario.observacoes, inventarioNormalizado]
    );

    await connection.commit();

    return {
      inventario: await buscarInventarioPorId(connection, usuario.empresaId, inventarioNormalizado),
      itens_contados: itemRows.length,
      itens_ajustados: itensAjustados,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function cancelarInventario(usuario, inventarioId, dados) {
  const inventarioNormalizado = ensurePositiveInteger(inventarioId, 'Inventario');
  const observacoes = normalizeOptionalString(dados?.observacoes, 255);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const inventario = await buscarInventarioPorId(connection, usuario.empresaId, inventarioNormalizado);

    if (!inventario) {
      throw createHttpError(404, 'Inventario nao encontrado.');
    }

    if (inventario.status !== 'aberto') {
      throw createHttpError(409, 'Somente inventarios abertos podem ser cancelados.');
    }

    await connection.query(
      `UPDATE inventarios
       SET status = 'cancelado',
           data_fim = CURRENT_TIMESTAMP,
           observacoes = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [observacoes ?? inventario.observacoes, inventarioNormalizado]
    );

    await connection.commit();

    return await buscarInventarioPorId(connection, usuario.empresaId, inventarioNormalizado);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function registrarAjuste(usuario, dados) {
  const produtoId = ensurePositiveInteger(dados?.produto_id, 'Produto');
  const tipoAjuste = ensureEnum(dados?.tipo_ajuste, ADJUSTMENT_TYPES, 'Tipo de ajuste');
  const quantidade = ensurePositiveInteger(dados?.quantidade, 'Quantidade');
  const motivo = ensureRequiredString(dados?.motivo, 'Motivo', 120);
  const observacoes = normalizeOptionalString(dados?.observacoes, 255);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, nome, estoque, ativo
       FROM produtos
       WHERE empresa_id = ?
         AND id = ?
       LIMIT 1
       FOR UPDATE`,
      [usuario.empresaId, produtoId]
    );

    const produto = rows[0];

    if (!produto || !produto.ativo) {
      throw createHttpError(404, 'Produto nao encontrado.');
    }

    const saldoAnterior = Number(produto.estoque);
    const saldoPosterior =
      tipoAjuste === 'entrada' ? saldoAnterior + quantidade : saldoAnterior - quantidade;

    if (saldoPosterior < 0) {
      throw createHttpError(400, `Estoque insuficiente para ajustar ${produto.nome}.`);
    }

    const [adjustmentResult] = await connection.query(
      `INSERT INTO ajustes_estoque (
        empresa_id,
        produto_id,
        tipo_ajuste,
        quantidade,
        motivo,
        observacoes,
        usuario_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuario.empresaId, produtoId, tipoAjuste, quantidade, motivo, observacoes, usuario.id]
    );

    await connection.query(
      `UPDATE produtos
       SET estoque = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [saldoPosterior, produtoId]
    );

    await registrarMovimentoEstoque(connection, {
      empresa_id: usuario.empresaId,
      produto_id: produtoId,
      tipo: tipoAjuste === 'entrada' ? 'ajuste_entrada' : 'ajuste_saida',
      origem: 'ajuste_estoque',
      origem_id: adjustmentResult.insertId,
      quantidade: tipoAjuste === 'entrada' ? quantidade : -quantidade,
      saldo_anterior: saldoAnterior,
      saldo_posterior: saldoPosterior,
      observacoes: motivo,
      usuario_id: usuario.id,
    });

    await connection.commit();

    return {
      produto_id: produtoId,
      produto_nome: produto.nome,
      tipo_ajuste: tipoAjuste,
      quantidade,
      saldo_anterior: saldoAnterior,
      saldo_posterior: saldoPosterior,
      motivo,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function registrarPerda(usuario, dados) {
  const produtoId = ensurePositiveInteger(dados?.produto_id, 'Produto');
  const quantidade = ensurePositiveInteger(dados?.quantidade, 'Quantidade');
  const motivo = ensureRequiredString(dados?.motivo, 'Motivo', 120);
  const observacoes = normalizeOptionalString(dados?.observacoes, 255);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, nome, estoque, ativo
       FROM produtos
       WHERE empresa_id = ?
         AND id = ?
       LIMIT 1
       FOR UPDATE`,
      [usuario.empresaId, produtoId]
    );

    const produto = rows[0];

    if (!produto || !produto.ativo) {
      throw createHttpError(404, 'Produto nao encontrado.');
    }

    const saldoAnterior = Number(produto.estoque);
    const saldoPosterior = saldoAnterior - quantidade;

    if (saldoPosterior < 0) {
      throw createHttpError(400, `Estoque insuficiente para registrar perda de ${produto.nome}.`);
    }

    const [lossResult] = await connection.query(
      `INSERT INTO perdas_estoque (
        empresa_id,
        produto_id,
        quantidade,
        motivo,
        observacoes,
        usuario_id
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [usuario.empresaId, produtoId, quantidade, motivo, observacoes, usuario.id]
    );

    await connection.query(
      `UPDATE produtos
       SET estoque = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [saldoPosterior, produtoId]
    );

    await registrarMovimentoEstoque(connection, {
      empresa_id: usuario.empresaId,
      produto_id: produtoId,
      tipo: 'perda',
      origem: 'perda_estoque',
      origem_id: lossResult.insertId,
      quantidade: -quantidade,
      saldo_anterior: saldoAnterior,
      saldo_posterior: saldoPosterior,
      observacoes: motivo,
      usuario_id: usuario.id,
    });

    await connection.commit();

    return {
      produto_id: produtoId,
      produto_nome: produto.nome,
      quantidade,
      saldo_anterior: saldoAnterior,
      saldo_posterior: saldoPosterior,
      motivo,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
