USE dm_pdv;

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(30) NULL AFTER documento,
  ADD COLUMN IF NOT EXISTS regime_tributario VARCHAR(30) NOT NULL DEFAULT 'simples_nacional' AFTER inscricao_estadual,
  ADD COLUMN IF NOT EXISTS ambiente_fiscal VARCHAR(20) NOT NULL DEFAULT 'homologacao' AFTER regime_tributario,
  ADD COLUMN IF NOT EXISTS serie_nfce VARCHAR(10) NOT NULL DEFAULT '1' AFTER ambiente_fiscal,
  ADD COLUMN IF NOT EXISTS proximo_numero_nfce INT NOT NULL DEFAULT 1 AFTER serie_nfce,
  ADD COLUMN IF NOT EXISTS cep VARCHAR(12) NULL AFTER proximo_numero_nfce,
  ADD COLUMN IF NOT EXISTS logradouro VARCHAR(160) NULL AFTER cep,
  ADD COLUMN IF NOT EXISTS numero VARCHAR(20) NULL AFTER logradouro,
  ADD COLUMN IF NOT EXISTS complemento VARCHAR(80) NULL AFTER numero,
  ADD COLUMN IF NOT EXISTS bairro VARCHAR(80) NULL AFTER complemento,
  ADD COLUMN IF NOT EXISTS cidade VARCHAR(80) NULL AFTER bairro,
  ADD COLUMN IF NOT EXISTS estado CHAR(2) NULL AFTER cidade;

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS ncm VARCHAR(8) NULL AFTER unidade,
  ADD COLUMN IF NOT EXISTS cfop_padrao VARCHAR(4) NULL AFTER ncm,
  ADD COLUMN IF NOT EXISTS cest VARCHAR(10) NULL AFTER cfop_padrao,
  ADD COLUMN IF NOT EXISTS origem_mercadoria VARCHAR(1) NULL AFTER cest,
  ADD COLUMN IF NOT EXISTS cst_csosn VARCHAR(4) NULL AFTER origem_mercadoria,
  ADD COLUMN IF NOT EXISTS unidade_tributavel VARCHAR(20) NULL AFTER cst_csosn;

ALTER TABLE documentos_fiscais
  ADD COLUMN IF NOT EXISTS empresa_id INT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER venda_id,
  ADD COLUMN IF NOT EXISTS ambiente VARCHAR(20) NULL AFTER tipo_documento,
  ADD COLUMN IF NOT EXISTS serie VARCHAR(10) NULL AFTER ambiente,
  ADD COLUMN IF NOT EXISTS numero INT NULL AFTER serie,
  ADD COLUMN IF NOT EXISTS protocolo_autorizacao VARCHAR(80) NULL AFTER chave_acesso,
  ADD COLUMN IF NOT EXISTS mensagem_retorno VARCHAR(255) NULL AFTER protocolo_autorizacao,
  ADD COLUMN IF NOT EXISTS xml_conteudo LONGTEXT NULL AFTER mensagem_retorno,
  ADD COLUMN IF NOT EXISTS data_emissao TIMESTAMP NULL DEFAULT NULL AFTER xml_conteudo,
  ADD COLUMN IF NOT EXISTS data_autorizacao TIMESTAMP NULL DEFAULT NULL AFTER data_emissao,
  ADD COLUMN IF NOT EXISTS data_cancelamento TIMESTAMP NULL DEFAULT NULL AFTER data_autorizacao,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento VARCHAR(255) NULL AFTER data_cancelamento;

ALTER TABLE documentos_fiscais
  MODIFY COLUMN tipo_documento VARCHAR(40) NOT NULL DEFAULT 'nfce';

UPDATE documentos_fiscais df
INNER JOIN vendas v ON v.id = df.venda_id
SET
  df.empresa_id = v.empresa_id,
  df.usuario_id = v.usuario_id
WHERE df.empresa_id IS NULL
   OR df.usuario_id IS NULL;

ALTER TABLE documentos_fiscais
  MODIFY COLUMN empresa_id INT NOT NULL,
  MODIFY COLUMN usuario_id INT NOT NULL;

ALTER TABLE documentos_fiscais
  ADD CONSTRAINT fk_documentos_fiscais_empresa
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  ADD CONSTRAINT fk_documentos_fiscais_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id);

CREATE UNIQUE INDEX uk_documentos_fiscais_venda ON documentos_fiscais (venda_id);
CREATE UNIQUE INDEX uk_documentos_fiscais_numero
  ON documentos_fiscais (empresa_id, tipo_documento, serie, numero);
CREATE INDEX idx_documentos_fiscais_empresa_data ON documentos_fiscais (empresa_id, created_at);
