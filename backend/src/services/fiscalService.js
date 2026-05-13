import { pool } from '../config/database.js';
import { createHttpError } from '../utils/http.js';
import {
  ensureEnum,
  ensurePositiveInteger,
  ensureRequiredString,
  normalizeOptionalString,
  roundCurrency,
} from '../utils/validators.js';

const REGIMES_TRIBUTARIOS = ['simples_nacional', 'lucro_presumido', 'lucro_real'];
const AMBIENTES_FISCAIS = ['homologacao', 'producao'];
const DOCUMENT_STATUS = ['pendente', 'autorizado', 'cancelado', 'erro'];
const DOCUMENT_TYPE = 'nfce';

const STATE_CODES = {
  AC: '12',
  AL: '27',
  AP: '16',
  AM: '13',
  BA: '29',
  CE: '23',
  DF: '53',
  ES: '32',
  GO: '52',
  MA: '21',
  MT: '51',
  MS: '50',
  MG: '31',
  PA: '15',
  PB: '25',
  PR: '41',
  PE: '26',
  PI: '22',
  RJ: '33',
  RN: '24',
  RS: '43',
  RO: '11',
  RR: '14',
  SC: '42',
  SP: '35',
  SE: '28',
  TO: '17',
};

function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function padNumber(value, size) {
  return String(value).padStart(size, '0');
}

function ensureDigits(value, fieldName, size) {
  const normalized = digitsOnly(value);

  if (normalized.length !== size) {
    throw createHttpError(400, `${fieldName} deve ter ${size} digitos numericos.`);
  }

  return normalized;
}

function ensureState(value) {
  const normalized = ensureRequiredString(value, 'Estado', 2).toUpperCase();

  if (!STATE_CODES[normalized]) {
    throw createHttpError(400, 'Estado fiscal invalido.');
  }

  return normalized;
}

function mapFiscalConfig(row) {
  if (!row) {
    return null;
  }

  return {
    empresa_id: row.id,
    nome_fantasia: row.nome_fantasia,
    razao_social: row.razao_social || null,
    documento: row.documento || null,
    inscricao_estadual: row.inscricao_estadual || null,
    regime_tributario: row.regime_tributario,
    ambiente_fiscal: row.ambiente_fiscal,
    serie_nfce: row.serie_nfce,
    proximo_numero_nfce: Number(row.proximo_numero_nfce || 1),
    cep: row.cep || null,
    logradouro: row.logradouro || null,
    numero: row.numero || null,
    complemento: row.complemento || null,
    bairro: row.bairro || null,
    cidade: row.cidade || null,
    estado: row.estado || null,
  };
}

function normalizeFiscalConfigPayload(dados) {
  return {
    nome_fantasia: ensureRequiredString(dados?.nome_fantasia, 'Nome fantasia', 160),
    razao_social: ensureRequiredString(dados?.razao_social, 'Razao social', 180),
    documento: ensureDigits(dados?.documento, 'CNPJ', 14),
    inscricao_estadual: ensureRequiredString(dados?.inscricao_estadual, 'Inscricao estadual', 30),
    regime_tributario: ensureEnum(
      dados?.regime_tributario,
      REGIMES_TRIBUTARIOS,
      'Regime tributario'
    ),
    ambiente_fiscal: ensureEnum(
      dados?.ambiente_fiscal,
      AMBIENTES_FISCAIS,
      'Ambiente fiscal'
    ),
    serie_nfce: ensureRequiredString(dados?.serie_nfce, 'Serie da NFC-e', 10),
    proximo_numero_nfce: ensurePositiveInteger(dados?.proximo_numero_nfce, 'Proximo numero da NFC-e'),
    cep: ensureDigits(dados?.cep, 'CEP', 8),
    logradouro: ensureRequiredString(dados?.logradouro, 'Logradouro', 160),
    numero: ensureRequiredString(dados?.numero, 'Numero', 20),
    complemento: normalizeOptionalString(dados?.complemento, 80),
    bairro: ensureRequiredString(dados?.bairro, 'Bairro', 80),
    cidade: ensureRequiredString(dados?.cidade, 'Cidade', 80),
    estado: ensureState(dados?.estado),
  };
}

function ensureFiscalConfigReady(config) {
  if (!config) {
    throw createHttpError(404, 'Configuracao fiscal nao encontrada.');
  }

  ensureDigits(config.documento, 'CNPJ da empresa', 14);
  ensureRequiredString(config.razao_social, 'Razao social', 180);
  ensureRequiredString(config.inscricao_estadual, 'Inscricao estadual', 30);
  ensureRequiredString(config.serie_nfce, 'Serie da NFC-e', 10);
  ensureRequiredString(config.logradouro, 'Logradouro', 160);
  ensureRequiredString(config.numero, 'Numero', 20);
  ensureRequiredString(config.bairro, 'Bairro', 80);
  ensureRequiredString(config.cidade, 'Cidade', 80);
  ensureState(config.estado);
}

function ensureItemsReadyForFiscal(items) {
  const invalidItem = items.find(
    (item) =>
      !item.ncm ||
      !item.cfop_padrao ||
      !item.origem_mercadoria ||
      !item.cst_csosn ||
      !item.unidade_tributavel
  );

  if (invalidItem) {
    throw createHttpError(
      409,
      `O produto ${invalidItem.nome} ainda nao possui cadastro fiscal completo para emissao.`
    );
  }
}

function generateNumericCode(seed) {
  let hash = 0;

  for (const char of String(seed)) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100000000;
  }

  return padNumber(hash, 8);
}

function calculateKeyDigit(key43) {
  let weight = 2;
  let sum = 0;

  for (let index = key43.length - 1; index >= 0; index -= 1) {
    sum += Number(key43[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }

  const mod = sum % 11;
  const digit = mod === 0 || mod === 1 ? 0 : 11 - mod;
  return String(digit);
}

function buildAccessKey(config, numero, issuedAt) {
  const cUF = STATE_CODES[config.estado];
  const yearMonth = `${String(issuedAt.getFullYear()).slice(-2)}${padNumber(issuedAt.getMonth() + 1, 2)}`;
  const cnpj = ensureDigits(config.documento, 'CNPJ da empresa', 14);
  const modelo = '65';
  const serie = padNumber(digitsOnly(config.serie_nfce).slice(-3) || '1', 3);
  const numeroFiscal = padNumber(numero, 9);
  const tipoEmissao = '1';
  const codigoNumerico = generateNumericCode(`${config.id || config.empresa_id}${numeroFiscal}${yearMonth}`);
  const key43 = `${cUF}${yearMonth}${cnpj}${modelo}${serie}${numeroFiscal}${tipoEmissao}${codigoNumerico}`;
  return `${key43}${calculateKeyDigit(key43)}`;
}

function buildProtocol(numero, issuedAt) {
  return `${issuedAt.getFullYear()}${padNumber(issuedAt.getMonth() + 1, 2)}${padNumber(
    issuedAt.getDate(),
    2
  )}${padNumber(numero, 9)}`;
}

function buildLocalFiscalXml(documento, venda, itens, config) {
  const itensXml = itens
    .map(
      (item, index) => `
    <item nItem="${index + 1}">
      <codigo>${item.produto_id}</codigo>
      <descricao>${item.nome}</descricao>
      <codigoBarras>${item.codigo_barras || ''}</codigoBarras>
      <ncm>${item.ncm || ''}</ncm>
      <cfop>${item.cfop_padrao || ''}</cfop>
      <cst>${item.cst_csosn || ''}</cst>
      <origem>${item.origem_mercadoria || ''}</origem>
      <unidade>${item.unidade_tributavel || item.unidade || 'UN'}</unidade>
      <quantidade>${item.quantidade}</quantidade>
      <valorUnitario>${Number(item.preco_unitario).toFixed(2)}</valorUnitario>
      <valorTotal>${Number(item.subtotal).toFixed(2)}</valorTotal>
    </item>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfce>
  <emitente>
    <razaoSocial>${config.razao_social}</razaoSocial>
    <nomeFantasia>${config.nome_fantasia}</nomeFantasia>
    <cnpj>${config.documento}</cnpj>
    <inscricaoEstadual>${config.inscricao_estadual}</inscricaoEstadual>
    <regime>${config.regime_tributario}</regime>
    <endereco>
      <logradouro>${config.logradouro}</logradouro>
      <numero>${config.numero}</numero>
      <complemento>${config.complemento || ''}</complemento>
      <bairro>${config.bairro}</bairro>
      <cidade>${config.cidade}</cidade>
      <estado>${config.estado}</estado>
      <cep>${config.cep}</cep>
    </endereco>
  </emitente>
  <documento>
    <tipo>${documento.tipo_documento}</tipo>
    <ambiente>${documento.ambiente}</ambiente>
    <serie>${documento.serie}</serie>
    <numero>${documento.numero}</numero>
    <chave>${documento.chave_acesso}</chave>
    <protocolo>${documento.protocolo_autorizacao}</protocolo>
    <dataEmissao>${documento.data_emissao}</dataEmissao>
  </documento>
  <venda>
    <id>${venda.id}</id>
    <cliente>${venda.cliente_nome || 'Consumidor final'}</cliente>
    <formaPagamento>${venda.forma_pagamento}</formaPagamento>
    <subtotal>${Number(venda.subtotal).toFixed(2)}</subtotal>
    <desconto>${Number(venda.desconto_valor).toFixed(2)}</desconto>
    <acrescimo>${Number(venda.acrescimo_valor).toFixed(2)}</acrescimo>
    <total>${Number(venda.total).toFixed(2)}</total>
  </venda>
  <itens>${itensXml}
  </itens>
</nfce>`;
}

function mapFiscalDocument(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    subtotal_venda:
      row.subtotal_venda === undefined ? undefined : roundCurrency(row.subtotal_venda || 0),
    desconto_valor:
      row.desconto_valor === undefined ? undefined : roundCurrency(row.desconto_valor || 0),
    acrescimo_valor:
      row.acrescimo_valor === undefined ? undefined : roundCurrency(row.acrescimo_valor || 0),
    total_venda: row.total_venda === undefined ? undefined : roundCurrency(row.total_venda || 0),
  };
}

async function getCompanyConfigForUpdate(connection, empresaId) {
  const [rows] = await connection.query(
    `SELECT *
     FROM empresas
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [empresaId]
  );

  return mapFiscalConfig(rows[0]);
}

async function getCompanyConfig(empresaId) {
  const [rows] = await pool.query(
    `SELECT *
     FROM empresas
     WHERE id = ?
     LIMIT 1`,
    [empresaId]
  );

  return mapFiscalConfig(rows[0]);
}

async function getSaleFiscalPayload(connection, empresaId, vendaId) {
  const [saleRows] = await connection.query(
    `SELECT
      v.id,
      v.status,
      v.forma_pagamento,
      v.subtotal,
      v.desconto_valor,
      v.acrescimo_valor,
      v.total,
      v.created_at,
      c.nome AS cliente_nome
     FROM vendas v
     LEFT JOIN clientes c ON c.id = v.cliente_id
     WHERE v.empresa_id = ?
       AND v.id = ?
     LIMIT 1
     FOR UPDATE`,
    [empresaId, vendaId]
  );

  const venda = saleRows[0];

  if (!venda) {
    throw createHttpError(404, 'Venda nao encontrada para emissao fiscal.');
  }

  const [itemRows] = await connection.query(
    `SELECT
      vi.produto_id,
      vi.quantidade,
      vi.preco_unitario,
      vi.subtotal,
      p.nome,
      p.codigo_barras,
      p.unidade,
      p.ncm,
      p.cfop_padrao,
      p.cest,
      p.origem_mercadoria,
      p.cst_csosn,
      p.unidade_tributavel
     FROM venda_itens vi
     INNER JOIN produtos p ON p.id = vi.produto_id
     WHERE vi.venda_id = ?
     ORDER BY vi.id ASC`,
    [vendaId]
  );

  return {
    venda: mapFiscalDocument(venda),
    itens: itemRows.map((item) => ({
      ...item,
      quantidade: Number(item.quantidade),
      preco_unitario: roundCurrency(item.preco_unitario || 0),
      subtotal: roundCurrency(item.subtotal || 0),
    })),
  };
}

async function getDocumentBySaleId(connection, vendaId, forUpdate = false) {
  const [rows] = await connection.query(
    `SELECT *
     FROM documentos_fiscais
     WHERE venda_id = ?
     LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [vendaId]
  );

  return rows[0] || null;
}

async function getDocumentById(connection, empresaId, documentoId, forUpdate = false) {
  const [rows] = await connection.query(
    `SELECT
      df.id,
      df.empresa_id,
      df.venda_id,
      df.usuario_id,
      df.tipo_documento,
      df.ambiente,
      df.serie,
      df.numero,
      df.numero_documento,
      df.status,
      df.chave_acesso,
      df.protocolo_autorizacao,
      df.mensagem_retorno,
      df.xml_conteudo,
      df.data_emissao,
      df.data_autorizacao,
      df.data_cancelamento,
      df.motivo_cancelamento,
      df.created_at,
      v.total AS total_venda,
      v.subtotal AS subtotal_venda,
      v.desconto_valor,
      v.acrescimo_valor,
      v.forma_pagamento,
      v.status AS status_venda,
      v.created_at AS venda_created_at,
      c.nome AS cliente_nome,
      u.nome AS usuario_nome
     FROM documentos_fiscais df
     INNER JOIN vendas v ON v.id = df.venda_id
     LEFT JOIN clientes c ON c.id = v.cliente_id
     INNER JOIN usuarios u ON u.id = df.usuario_id
     WHERE df.empresa_id = ?
       AND df.id = ?
     LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [empresaId, documentoId]
  );

  return mapFiscalDocument(rows[0]);
}

export async function garantirDocumentoFiscalPendente(connection, usuario, vendaId) {
  const existing = await getDocumentBySaleId(connection, vendaId, false);

  if (existing) {
    return existing.id;
  }

  const config = await getCompanyConfigForUpdate(connection, usuario.empresaId);
  const ambiente = config?.ambiente_fiscal || 'homologacao';

  const [result] = await connection.query(
    `INSERT INTO documentos_fiscais (
      empresa_id,
      venda_id,
      usuario_id,
      tipo_documento,
      ambiente,
      status,
      mensagem_retorno
    ) VALUES (?, ?, ?, ?, ?, 'pendente', 'Documento aguardando emissao fiscal.')`,
    [usuario.empresaId, vendaId, usuario.id, DOCUMENT_TYPE, ambiente]
  );

  return result.insertId;
}

export async function obterConfiguracaoFiscal(empresaId) {
  const config = await getCompanyConfig(empresaId);

  if (!config) {
    throw createHttpError(404, 'Empresa nao encontrada.');
  }

  return config;
}

export async function salvarConfiguracaoFiscal(empresaId, dados) {
  const payload = normalizeFiscalConfigPayload(dados);

  await pool.query(
    `UPDATE empresas
     SET nome_fantasia = ?,
         razao_social = ?,
         documento = ?,
         inscricao_estadual = ?,
         regime_tributario = ?,
         ambiente_fiscal = ?,
         serie_nfce = ?,
         proximo_numero_nfce = ?,
         cep = ?,
         logradouro = ?,
         numero = ?,
         complemento = ?,
         bairro = ?,
         cidade = ?,
         estado = ?
     WHERE id = ?`,
    [
      payload.nome_fantasia,
      payload.razao_social,
      payload.documento,
      payload.inscricao_estadual,
      payload.regime_tributario,
      payload.ambiente_fiscal,
      payload.serie_nfce,
      payload.proximo_numero_nfce,
      payload.cep,
      payload.logradouro,
      payload.numero,
      payload.complemento,
      payload.bairro,
      payload.cidade,
      payload.estado,
      empresaId,
    ]
  );

  return obterConfiguracaoFiscal(empresaId);
}

export async function listarDocumentosFiscais(empresaId, filtros = {}) {
  const limiteInformado = Number(filtros.limite || 50);
  const limiteNormalizado = Number.isInteger(limiteInformado) ? limiteInformado : 50;
  const limite = Math.min(Math.max(limiteNormalizado, 1), 100);
  const status = filtros.status
    ? ensureEnum(filtros.status, DOCUMENT_STATUS, 'Status do documento')
    : null;

  let sql = `
    SELECT
      df.id,
      df.empresa_id,
      df.venda_id,
      df.usuario_id,
      df.tipo_documento,
      df.ambiente,
      df.serie,
      df.numero,
      df.numero_documento,
      df.status,
      df.chave_acesso,
      df.protocolo_autorizacao,
      df.mensagem_retorno,
      df.data_emissao,
      df.data_autorizacao,
      df.data_cancelamento,
      df.motivo_cancelamento,
      df.created_at,
      v.total AS total_venda,
      v.subtotal AS subtotal_venda,
      v.desconto_valor,
      v.acrescimo_valor,
      v.forma_pagamento,
      c.nome AS cliente_nome,
      u.nome AS usuario_nome
     FROM documentos_fiscais df
     INNER JOIN vendas v ON v.id = df.venda_id
     LEFT JOIN clientes c ON c.id = v.cliente_id
     INNER JOIN usuarios u ON u.id = df.usuario_id
     WHERE df.empresa_id = ?
  `;

  const params = [empresaId];

  if (status) {
    sql += ' AND df.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY df.created_at DESC, df.id DESC LIMIT ?';
  params.push(limite);

  const [rows] = await pool.query(sql, params);
  return rows.map(mapFiscalDocument);
}

export async function obterDocumentoFiscal(empresaId, documentoId) {
  const normalizedDocumentId = ensurePositiveInteger(documentoId, 'Documento fiscal');
  const connection = await pool.getConnection();

  try {
    const documento = await getDocumentById(connection, empresaId, normalizedDocumentId, false);

    if (!documento) {
      throw createHttpError(404, 'Documento fiscal nao encontrado.');
    }

    return documento;
  } finally {
    connection.release();
  }
}

export async function emitirDocumentoFiscal(usuario, vendaId) {
  const normalizedSaleId = ensurePositiveInteger(vendaId, 'Venda');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { venda, itens } = await getSaleFiscalPayload(connection, usuario.empresaId, normalizedSaleId);

    if (venda.status !== 'finalizada') {
      throw createHttpError(409, 'Somente vendas finalizadas podem ser emitidas fiscalmente.');
    }

    ensureItemsReadyForFiscal(itens);

    const config = await getCompanyConfigForUpdate(connection, usuario.empresaId);
    ensureFiscalConfigReady(config);

    await garantirDocumentoFiscalPendente(connection, usuario, normalizedSaleId);
    const documentoAtual = await getDocumentBySaleId(connection, normalizedSaleId, true);

    if (!documentoAtual) {
      throw createHttpError(500, 'Nao foi possivel preparar o documento fiscal.');
    }

    if (documentoAtual.status === 'autorizado') {
      await connection.commit();
      return await obterDocumentoFiscal(usuario.empresaId, documentoAtual.id);
    }

    if (documentoAtual.status === 'cancelado') {
      throw createHttpError(409, 'Este documento fiscal ja foi cancelado.');
    }

    const numero = documentoAtual.numero || Number(config.proximo_numero_nfce || 1);
    const issuedAt = new Date();
    const chaveAcesso = buildAccessKey(config, numero, issuedAt);
    const protocoloAutorizacao = buildProtocol(numero, issuedAt);
    const ambiente = config.ambiente_fiscal;
    const serie = config.serie_nfce;
    const numeroDocumento = `${serie}-${numero}`;

    const documentoPreview = {
      tipo_documento: DOCUMENT_TYPE,
      ambiente,
      serie,
      numero,
      chave_acesso: chaveAcesso,
      protocolo_autorizacao: protocoloAutorizacao,
      data_emissao: issuedAt.toISOString(),
    };

    const xmlConteudo = buildLocalFiscalXml(documentoPreview, venda, itens, config);

    await connection.query(
      `UPDATE documentos_fiscais
       SET usuario_id = ?,
           tipo_documento = ?,
           ambiente = ?,
           serie = ?,
           numero = ?,
           numero_documento = ?,
           status = 'autorizado',
           chave_acesso = ?,
           protocolo_autorizacao = ?,
           mensagem_retorno = 'Documento autorizado em ambiente local.',
           xml_conteudo = ?,
           data_emissao = NOW(),
           data_autorizacao = NOW(),
           data_cancelamento = NULL,
           motivo_cancelamento = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        usuario.id,
        DOCUMENT_TYPE,
        ambiente,
        serie,
        numero,
        numeroDocumento,
        chaveAcesso,
        protocoloAutorizacao,
        xmlConteudo,
        documentoAtual.id,
      ]
    );

    if (!documentoAtual.numero) {
      await connection.query(
        `UPDATE empresas
         SET proximo_numero_nfce = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [numero + 1, usuario.empresaId]
      );
    }

    await connection.commit();

    return await obterDocumentoFiscal(usuario.empresaId, documentoAtual.id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function cancelarDocumentoFiscal(usuario, documentoId, dados) {
  const normalizedDocumentId = ensurePositiveInteger(documentoId, 'Documento fiscal');
  const motivo = ensureRequiredString(dados?.motivo, 'Motivo', 255);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const documento = await getDocumentById(
      connection,
      usuario.empresaId,
      normalizedDocumentId,
      true
    );

    if (!documento) {
      throw createHttpError(404, 'Documento fiscal nao encontrado.');
    }

    if (documento.status === 'cancelado') {
      throw createHttpError(409, 'Documento fiscal ja cancelado.');
    }

    await connection.query(
      `UPDATE documentos_fiscais
       SET status = 'cancelado',
           mensagem_retorno = 'Documento fiscal cancelado no ambiente local.',
           motivo_cancelamento = ?,
           data_cancelamento = NOW(),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [motivo, normalizedDocumentId]
    );

    await connection.commit();

    return await obterDocumentoFiscal(usuario.empresaId, normalizedDocumentId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
