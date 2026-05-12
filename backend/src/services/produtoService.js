import { pool } from '../config/database.js';
import { createHttpError } from '../utils/http.js';
import {
  ensureNonNegativeDecimal,
  ensureNonNegativeInteger,
  ensurePositiveInteger,
  ensureRequiredString,
  normalizeOptionalString,
  normalizeSearchTerm,
  roundCurrency,
} from '../utils/validators.js';

function normalizeProduct(product) {
  return {
    ...product,
    preco: roundCurrency(product.preco || 0),
    estoque: Number(product.estoque),
    estoque_minimo: Number(product.estoque_minimo),
    ativo: Boolean(product.ativo),
    status_estoque:
      Number(product.estoque) === 0
        ? 'sem_estoque'
        : Number(product.estoque) <= Number(product.estoque_minimo)
          ? 'baixo'
          : 'normal',
  };
}

function normalizeProductPayload(dados) {
  const payload = dados ?? {};

  return {
    nome: ensureRequiredString(payload.nome, 'Nome', 180),
    codigo_barras: normalizeOptionalString(payload.codigo_barras, 80),
    preco: ensureNonNegativeDecimal(payload.preco, 'Preco'),
    estoque: ensureNonNegativeInteger(payload.estoque, 'Estoque'),
    estoque_minimo: ensureNonNegativeInteger(
      payload.estoque_minimo ?? 5,
      'Estoque minimo'
    ),
  };
}

export async function listar(empresaId, filtros = {}) {
  const busca = normalizeSearchTerm(filtros.busca);
  const incluirInativos = String(filtros.incluir_inativos || '') === '1';
  const somenteEstoqueBaixo = String(filtros.somente_estoque_baixo || '') === '1';
  const codigoExato = String(filtros.codigo_exato || '') === '1';
  const limiteInformado = Number(filtros.limite || 0);
  const limite = Number.isInteger(limiteInformado) && limiteInformado > 0
    ? Math.min(limiteInformado, 200)
    : 0;
  const termo = `%${busca}%`;

  let sql = `
    SELECT
      id,
      nome,
      codigo_barras,
      preco,
      estoque,
      estoque_minimo,
      ativo,
      created_at,
      updated_at
    FROM produtos
    WHERE empresa_id = ?
  `;

  const params = [empresaId];

  if (!incluirInativos) {
    sql += ' AND ativo = 1';
  }

  if (busca && codigoExato) {
    sql += ' AND codigo_barras = ?';
    params.push(busca);
  } else if (busca) {
    sql += ' AND (nome LIKE ? OR codigo_barras LIKE ?)';
    params.push(termo, termo);
  }

  if (somenteEstoqueBaixo) {
    sql += ' AND estoque <= estoque_minimo';
  }

  sql += `
    ORDER BY
      CASE
        WHEN estoque = 0 THEN 0
        WHEN estoque <= estoque_minimo THEN 1
        ELSE 2
      END,
      nome ASC
  `;

  if (limite) {
    sql += ' LIMIT ?';
    params.push(limite);
  }

  const [rows] = await pool.query(sql, params);

  return rows.map(normalizeProduct);
}

export async function obterPorId(empresaId, id) {
  const productId = ensurePositiveInteger(id, 'Produto');
  const [rows] = await pool.query(
    `SELECT
      id,
      nome,
      codigo_barras,
      preco,
      estoque,
      estoque_minimo,
      ativo,
      created_at,
      updated_at
     FROM produtos
     WHERE empresa_id = ?
       AND id = ?
     LIMIT 1`,
    [empresaId, productId]
  );

  if (!rows[0]) {
    throw createHttpError(404, 'Produto nao encontrado.');
  }

  return normalizeProduct(rows[0]);
}

export async function criar(empresaId, dados) {
  const { nome, codigo_barras, preco, estoque, estoque_minimo } = normalizeProductPayload(dados);

  const [result] = await pool.query(
    `INSERT INTO produtos (
      empresa_id,
      nome,
      codigo_barras,
      preco,
      estoque,
      estoque_minimo
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [empresaId, nome, codigo_barras, preco, estoque, estoque_minimo]
  );

  return obterPorId(empresaId, result.insertId);
}

export async function atualizar(empresaId, id, dados) {
  const productId = ensurePositiveInteger(id, 'Produto');
  const { nome, codigo_barras, preco, estoque, estoque_minimo } = normalizeProductPayload(dados);

  const [result] = await pool.query(
    `UPDATE produtos
     SET nome = ?, codigo_barras = ?, preco = ?, estoque = ?, estoque_minimo = ?
     WHERE empresa_id = ?
       AND id = ?
       AND ativo = 1`,
    [nome, codigo_barras, preco, estoque, estoque_minimo, empresaId, productId]
  );

  if (!result.affectedRows) {
    throw createHttpError(404, 'Produto nao encontrado.');
  }

  return obterPorId(empresaId, productId);
}

export async function remover(empresaId, id) {
  const productId = ensurePositiveInteger(id, 'Produto');
  const [result] = await pool.query(
    `UPDATE produtos
     SET ativo = 0
     WHERE empresa_id = ?
       AND id = ?
       AND ativo = 1`,
    [empresaId, productId]
  );

  if (!result.affectedRows) {
    throw createHttpError(404, 'Produto nao encontrado.');
  }

  return { message: 'Produto desativado com sucesso.' };
}
