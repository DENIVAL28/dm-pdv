import { pool } from '../config/database.js';
import { createHttpError } from '../utils/http.js';
import {
  ensurePositiveInteger,
  ensureRequiredString,
  normalizeOptionalString,
  normalizeSearchTerm,
} from '../utils/validators.js';

function normalizeSupplier(row) {
  return {
    ...row,
    nome_fantasia: row.nome_fantasia || null,
    documento: row.documento || null,
    telefone: row.telefone || null,
    email: row.email || null,
    contato_nome: row.contato_nome || null,
    ativo: Boolean(row.ativo),
  };
}

function normalizeSupplierPayload(dados) {
  const payload = dados ?? {};

  return {
    razao_social: ensureRequiredString(payload.razao_social, 'Razao social', 180),
    nome_fantasia: normalizeOptionalString(payload.nome_fantasia, 180),
    documento: normalizeOptionalString(payload.documento, 20),
    telefone: normalizeOptionalString(payload.telefone, 30),
    email: normalizeOptionalString(payload.email, 160),
    contato_nome: normalizeOptionalString(payload.contato_nome, 120),
  };
}

export async function listar(empresaId, filtros = {}) {
  const busca = normalizeSearchTerm(filtros.busca);
  const incluirInativos = String(filtros.incluir_inativos || '') === '1';
  const limiteInformado = Number(filtros.limite || 100);
  const limiteNormalizado = Number.isInteger(limiteInformado) ? limiteInformado : 100;
  const limite = Math.min(Math.max(limiteNormalizado, 1), 200);
  const termo = `%${busca}%`;

  let sql = `
    SELECT
      id,
      razao_social,
      nome_fantasia,
      documento,
      telefone,
      email,
      contato_nome,
      ativo,
      created_at,
      updated_at
    FROM fornecedores
    WHERE empresa_id = ?
  `;

  const params = [empresaId];

  if (!incluirInativos) {
    sql += ' AND ativo = 1';
  }

  if (busca) {
    sql += ' AND (razao_social LIKE ? OR nome_fantasia LIKE ? OR documento LIKE ?)';
    params.push(termo, termo, termo);
  }

  sql += ' ORDER BY razao_social ASC LIMIT ?';
  params.push(limite);

  const [rows] = await pool.query(sql, params);
  return rows.map(normalizeSupplier);
}

export async function obterPorId(empresaId, id) {
  const supplierId = ensurePositiveInteger(id, 'Fornecedor');
  const [rows] = await pool.query(
    `SELECT
      id,
      razao_social,
      nome_fantasia,
      documento,
      telefone,
      email,
      contato_nome,
      ativo,
      created_at,
      updated_at
     FROM fornecedores
     WHERE empresa_id = ?
       AND id = ?
     LIMIT 1`,
    [empresaId, supplierId]
  );

  if (!rows[0]) {
    throw createHttpError(404, 'Fornecedor nao encontrado.');
  }

  return normalizeSupplier(rows[0]);
}

export async function criar(empresaId, dados) {
  const payload = normalizeSupplierPayload(dados);

  const [result] = await pool.query(
    `INSERT INTO fornecedores (
      empresa_id,
      razao_social,
      nome_fantasia,
      documento,
      telefone,
      email,
      contato_nome
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      empresaId,
      payload.razao_social,
      payload.nome_fantasia,
      payload.documento,
      payload.telefone,
      payload.email,
      payload.contato_nome,
    ]
  );

  return obterPorId(empresaId, result.insertId);
}

export async function atualizar(empresaId, id, dados) {
  const supplierId = ensurePositiveInteger(id, 'Fornecedor');
  const payload = normalizeSupplierPayload(dados);

  const [result] = await pool.query(
    `UPDATE fornecedores
     SET razao_social = ?,
         nome_fantasia = ?,
         documento = ?,
         telefone = ?,
         email = ?,
         contato_nome = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE empresa_id = ?
       AND id = ?
       AND ativo = 1`,
    [
      payload.razao_social,
      payload.nome_fantasia,
      payload.documento,
      payload.telefone,
      payload.email,
      payload.contato_nome,
      empresaId,
      supplierId,
    ]
  );

  if (!result.affectedRows) {
    throw createHttpError(404, 'Fornecedor nao encontrado.');
  }

  return obterPorId(empresaId, supplierId);
}

export async function remover(empresaId, id) {
  const supplierId = ensurePositiveInteger(id, 'Fornecedor');
  const [result] = await pool.query(
    `UPDATE fornecedores
     SET ativo = 0,
         updated_at = CURRENT_TIMESTAMP
     WHERE empresa_id = ?
       AND id = ?
       AND ativo = 1`,
    [empresaId, supplierId]
  );

  if (!result.affectedRows) {
    throw createHttpError(404, 'Fornecedor nao encontrado.');
  }

  return { message: 'Fornecedor desativado com sucesso.' };
}
