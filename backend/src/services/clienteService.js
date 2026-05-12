import { pool } from '../config/database.js';
import { createHttpError } from '../utils/http.js';
import {
  ensurePositiveInteger,
  ensureRequiredString,
  normalizeOptionalString,
  normalizeSearchTerm,
} from '../utils/validators.js';

function normalizeClient(cliente) {
  return {
    ...cliente,
    documento: cliente.documento || null,
    telefone: cliente.telefone || null,
  };
}

function normalizeClientPayload(dados) {
  const payload = dados ?? {};

  return {
    nome: ensureRequiredString(payload.nome, 'Nome', 180),
    documento: normalizeOptionalString(payload.documento, 20),
    telefone: normalizeOptionalString(payload.telefone, 30),
  };
}

export async function listar(empresaId, filtros = {}) {
  const busca = normalizeSearchTerm(filtros.busca);
  const limiteInformado = Number(filtros.limite || 100);
  const limiteNormalizado = Number.isInteger(limiteInformado) ? limiteInformado : 100;
  const limite = Math.min(Math.max(limiteNormalizado, 1), 200);
  const termo = `%${busca}%`;

  let sql = `
    SELECT
      id,
      nome,
      documento,
      telefone,
      created_at,
      updated_at
    FROM clientes
    WHERE empresa_id = ?
  `;

  const params = [empresaId];

  if (busca) {
    sql += ' AND (nome LIKE ? OR documento LIKE ? OR telefone LIKE ?)';
    params.push(termo, termo, termo);
  }

  sql += ' ORDER BY nome ASC LIMIT ?';
  params.push(limite);

  const [rows] = await pool.query(sql, params);
  return rows.map(normalizeClient);
}

export async function obterPorId(empresaId, id) {
  const clienteId = ensurePositiveInteger(id, 'Cliente');
  const [rows] = await pool.query(
    `SELECT
      id,
      nome,
      documento,
      telefone,
      created_at,
      updated_at
     FROM clientes
     WHERE empresa_id = ?
       AND id = ?
     LIMIT 1`,
    [empresaId, clienteId]
  );

  if (!rows[0]) {
    throw createHttpError(404, 'Cliente nao encontrado.');
  }

  return normalizeClient(rows[0]);
}

export async function criar(empresaId, dados) {
  const { nome, documento, telefone } = normalizeClientPayload(dados);
  const [result] = await pool.query(
    `INSERT INTO clientes (empresa_id, nome, documento, telefone)
     VALUES (?, ?, ?, ?)`,
    [empresaId, nome, documento, telefone]
  );

  return obterPorId(empresaId, result.insertId);
}

export async function atualizar(empresaId, id, dados) {
  const clienteId = ensurePositiveInteger(id, 'Cliente');
  const { nome, documento, telefone } = normalizeClientPayload(dados);
  const [result] = await pool.query(
    `UPDATE clientes
     SET nome = ?, documento = ?, telefone = ?, updated_at = CURRENT_TIMESTAMP
     WHERE empresa_id = ?
       AND id = ?`,
    [nome, documento, telefone, empresaId, clienteId]
  );

  if (!result.affectedRows) {
    throw createHttpError(404, 'Cliente nao encontrado.');
  }

  return obterPorId(empresaId, clienteId);
}

export async function remover(empresaId, id) {
  const clienteId = ensurePositiveInteger(id, 'Cliente');
  const [result] = await pool.query(
    `DELETE FROM clientes
     WHERE empresa_id = ?
       AND id = ?`,
    [empresaId, clienteId]
  );

  if (!result.affectedRows) {
    throw createHttpError(404, 'Cliente nao encontrado.');
  }

  return { message: 'Cliente removido com sucesso.' };
}
