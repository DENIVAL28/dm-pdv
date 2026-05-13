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
    marca: product.marca || null,
    unidade: product.unidade || 'UN',
    ncm: product.ncm || null,
    cfop_padrao: product.cfop_padrao || null,
    cest: product.cest || null,
    origem_mercadoria: product.origem_mercadoria || null,
    cst_csosn: product.cst_csosn || null,
    unidade_tributavel: product.unidade_tributavel || product.unidade || 'UN',
    custo: roundCurrency(product.custo || 0),
    margem_percentual: Number(product.margem_percentual || 0),
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
    marca: normalizeOptionalString(payload.marca, 80),
    unidade: ensureRequiredString(payload.unidade ?? 'UN', 'Unidade', 20).toUpperCase(),
    ncm: normalizeOptionalString(payload.ncm, 8),
    cfop_padrao: normalizeOptionalString(payload.cfop_padrao, 4),
    cest: normalizeOptionalString(payload.cest, 10),
    origem_mercadoria: normalizeOptionalString(payload.origem_mercadoria, 1),
    cst_csosn: normalizeOptionalString(payload.cst_csosn, 4),
    unidade_tributavel: normalizeOptionalString(payload.unidade_tributavel, 20),
    custo: ensureNonNegativeDecimal(payload.custo ?? 0, 'Custo'),
    margem_percentual: ensureNonNegativeDecimal(
      payload.margem_percentual ?? 0,
      'Margem percentual'
    ),
    preco: ensureNonNegativeDecimal(payload.preco, 'Preco'),
    estoque: ensureNonNegativeInteger(payload.estoque, 'Estoque'),
    estoque_minimo: ensureNonNegativeInteger(payload.estoque_minimo ?? 5, 'Estoque minimo'),
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
      marca,
      unidade,
      ncm,
      cfop_padrao,
      cest,
      origem_mercadoria,
      cst_csosn,
      unidade_tributavel,
      custo,
      margem_percentual,
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
      marca,
      unidade,
      ncm,
      cfop_padrao,
      cest,
      origem_mercadoria,
      cst_csosn,
      unidade_tributavel,
      custo,
      margem_percentual,
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
  const payload = normalizeProductPayload(dados);

  const [result] = await pool.query(
    `INSERT INTO produtos (
      empresa_id,
      nome,
      codigo_barras,
      marca,
      unidade,
      ncm,
      cfop_padrao,
      cest,
      origem_mercadoria,
      cst_csosn,
      unidade_tributavel,
      custo,
      margem_percentual,
      preco,
      estoque,
      estoque_minimo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      empresaId,
      payload.nome,
      payload.codigo_barras,
      payload.marca,
      payload.unidade,
      payload.ncm,
      payload.cfop_padrao,
      payload.cest,
      payload.origem_mercadoria,
      payload.cst_csosn,
      payload.unidade_tributavel,
      payload.custo,
      payload.margem_percentual,
      payload.preco,
      payload.estoque,
      payload.estoque_minimo,
    ]
  );

  return obterPorId(empresaId, result.insertId);
}

export async function atualizar(empresaId, id, dados) {
  const productId = ensurePositiveInteger(id, 'Produto');
  const payload = normalizeProductPayload(dados);

  const [result] = await pool.query(
    `UPDATE produtos
     SET nome = ?,
         codigo_barras = ?,
         marca = ?,
         unidade = ?,
         ncm = ?,
         cfop_padrao = ?,
         cest = ?,
         origem_mercadoria = ?,
         cst_csosn = ?,
         unidade_tributavel = ?,
         custo = ?,
         margem_percentual = ?,
         preco = ?,
         estoque = ?,
         estoque_minimo = ?
     WHERE empresa_id = ?
       AND id = ?
       AND ativo = 1`,
    [
      payload.nome,
      payload.codigo_barras,
      payload.marca,
      payload.unidade,
      payload.ncm,
      payload.cfop_padrao,
      payload.cest,
      payload.origem_mercadoria,
      payload.cst_csosn,
      payload.unidade_tributavel,
      payload.custo,
      payload.margem_percentual,
      payload.preco,
      payload.estoque,
      payload.estoque_minimo,
      empresaId,
      productId,
    ]
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

export async function listarSugestaoCompra(empresaId, filtros = {}) {
  const limiteInformado = Number(filtros.limite || 30);
  const limiteNormalizado = Number.isInteger(limiteInformado) ? limiteInformado : 30;
  const limite = Math.min(Math.max(limiteNormalizado, 1), 100);

  const [rows] = await pool.query(
    `SELECT
      id,
      nome,
      codigo_barras,
      marca,
      unidade,
      ncm,
      cfop_padrao,
      cest,
      origem_mercadoria,
      cst_csosn,
      unidade_tributavel,
      custo,
      margem_percentual,
      preco,
      estoque,
      estoque_minimo,
      ativo
     FROM produtos
     WHERE empresa_id = ?
       AND ativo = 1
       AND estoque <= estoque_minimo
     ORDER BY estoque ASC, nome ASC
     LIMIT ?`,
    [empresaId, limite]
  );

  return rows.map((row) => {
    const produto = normalizeProduct(row);

    return {
      ...produto,
      quantidade_sugerida: Math.max(produto.estoque_minimo * 2 - produto.estoque, 1),
    };
  });
}
