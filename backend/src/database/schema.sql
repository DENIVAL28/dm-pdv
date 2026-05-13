CREATE DATABASE IF NOT EXISTS dm_pdv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dm_pdv;

CREATE TABLE IF NOT EXISTS empresas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome_fantasia VARCHAR(160) NOT NULL,
  razao_social VARCHAR(180) NULL,
  documento VARCHAR(20) NULL UNIQUE,
  inscricao_estadual VARCHAR(30) NULL,
  regime_tributario VARCHAR(30) NOT NULL DEFAULT 'simples_nacional',
  ambiente_fiscal VARCHAR(20) NOT NULL DEFAULT 'homologacao',
  serie_nfce VARCHAR(10) NOT NULL DEFAULT '1',
  proximo_numero_nfce INT NOT NULL DEFAULT 1,
  cep VARCHAR(12) NULL,
  logradouro VARCHAR(160) NULL,
  numero VARCHAR(20) NULL,
  complemento VARCHAR(80) NULL,
  bairro VARCHAR(80) NULL,
  cidade VARCHAR(80) NULL,
  estado CHAR(2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  INDEX idx_usuarios_empresa (empresa_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS produtos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  nome VARCHAR(180) NOT NULL,
  codigo_barras VARCHAR(80) NULL,
  marca VARCHAR(80) NULL,
  unidade VARCHAR(20) NOT NULL DEFAULT 'UN',
  ncm VARCHAR(8) NULL,
  cfop_padrao VARCHAR(4) NULL,
  cest VARCHAR(10) NULL,
  origem_mercadoria VARCHAR(1) NULL,
  cst_csosn VARCHAR(4) NULL,
  unidade_tributavel VARCHAR(20) NULL,
  custo DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  margem_percentual DECIMAL(7,2) NOT NULL DEFAULT 0.00,
  preco DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  estoque INT NOT NULL DEFAULT 0,
  estoque_minimo INT NOT NULL DEFAULT 5,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  UNIQUE KEY uk_produtos_empresa_codigo (empresa_id, codigo_barras),
  INDEX idx_produtos_empresa_nome (empresa_id, nome),
  INDEX idx_produtos_empresa_codigo (empresa_id, codigo_barras)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  nome VARCHAR(180) NOT NULL,
  documento VARCHAR(20) NULL,
  telefone VARCHAR(30) NULL,
  email VARCHAR(160) NULL,
  data_nascimento DATE NULL,
  observacoes VARCHAR(255) NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  INDEX idx_clientes_empresa_nome (empresa_id, nome),
  INDEX idx_clientes_empresa_documento (empresa_id, documento),
  INDEX idx_clientes_empresa_telefone (empresa_id, telefone)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cliente_enderecos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  titulo VARCHAR(60) NULL,
  cep VARCHAR(12) NULL,
  logradouro VARCHAR(160) NOT NULL,
  numero VARCHAR(20) NULL,
  complemento VARCHAR(80) NULL,
  bairro VARCHAR(80) NOT NULL,
  cidade VARCHAR(80) NOT NULL,
  estado CHAR(2) NOT NULL,
  principal TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  INDEX idx_cliente_enderecos_cliente (cliente_id),
  INDEX idx_cliente_enderecos_principal (cliente_id, principal)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cliente_contatos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  nome VARCHAR(120) NOT NULL,
  funcao VARCHAR(80) NULL,
  telefone VARCHAR(30) NULL,
  whatsapp VARCHAR(30) NULL,
  email VARCHAR(160) NULL,
  observacoes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  INDEX idx_cliente_contatos_cliente (cliente_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cliente_creditos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  limite_credito DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  dias_vencimento INT NOT NULL DEFAULT 30,
  ativo TINYINT(1) NOT NULL DEFAULT 0,
  observacoes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  UNIQUE KEY uk_cliente_creditos_cliente (cliente_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cliente_historico (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  usuario_id INT NULL,
  tipo_evento VARCHAR(40) NOT NULL,
  referencia_tipo VARCHAR(40) NULL,
  referencia_id INT NULL,
  descricao VARCHAR(255) NOT NULL,
  valor_referencia DECIMAL(12,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_cliente_historico_cliente_data (cliente_id, created_at),
  INDEX idx_cliente_historico_tipo (cliente_id, tipo_evento)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fornecedores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  razao_social VARCHAR(180) NOT NULL,
  nome_fantasia VARCHAR(180) NULL,
  documento VARCHAR(20) NULL,
  telefone VARCHAR(30) NULL,
  email VARCHAR(160) NULL,
  contato_nome VARCHAR(120) NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  INDEX idx_fornecedores_empresa_razao (empresa_id, razao_social),
  INDEX idx_fornecedores_empresa_documento (empresa_id, documento)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fornecedor_produtos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fornecedor_id INT NOT NULL,
  produto_id INT NOT NULL,
  codigo_fornecedor VARCHAR(80) NULL,
  custo_padrao DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  UNIQUE KEY uk_fornecedor_produtos (fornecedor_id, produto_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedidos_compra (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  fornecedor_id INT NOT NULL,
  usuario_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'rascunho',
  data_emissao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_prevista DATE NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  observacoes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_pedidos_compra_empresa_status (empresa_id, status),
  INDEX idx_pedidos_compra_empresa_data (empresa_id, data_emissao)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedido_compra_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_compra_id INT NOT NULL,
  produto_id INT NOT NULL,
  quantidade INT NOT NULL,
  custo_unitario DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_compra_id) REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  INDEX idx_pedido_compra_itens_pedido (pedido_compra_id),
  INDEX idx_pedido_compra_itens_produto (produto_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS entradas_mercadoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  fornecedor_id INT NOT NULL,
  pedido_compra_id INT NULL,
  usuario_id INT NOT NULL,
  numero_documento VARCHAR(60) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'recebida',
  data_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  observacoes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  FOREIGN KEY (pedido_compra_id) REFERENCES pedidos_compra(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_entradas_empresa_data (empresa_id, data_entrada),
  INDEX idx_entradas_empresa_documento (empresa_id, numero_documento)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS entrada_mercadoria_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entrada_mercadoria_id INT NOT NULL,
  produto_id INT NOT NULL,
  quantidade INT NOT NULL,
  custo_unitario DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entrada_mercadoria_id) REFERENCES entradas_mercadoria(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  INDEX idx_entrada_itens_entrada (entrada_mercadoria_id),
  INDEX idx_entrada_itens_produto (produto_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS estoque_movimentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  produto_id INT NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  origem VARCHAR(40) NOT NULL,
  origem_id INT NULL,
  quantidade INT NOT NULL,
  saldo_anterior INT NOT NULL,
  saldo_posterior INT NOT NULL,
  observacoes VARCHAR(255) NULL,
  usuario_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_estoque_movimentos_empresa_data (empresa_id, created_at),
  INDEX idx_estoque_movimentos_produto_data (produto_id, created_at),
  INDEX idx_estoque_movimentos_origem (origem, origem_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ajustes_estoque (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  produto_id INT NOT NULL,
  tipo_ajuste VARCHAR(20) NOT NULL,
  quantidade INT NOT NULL,
  motivo VARCHAR(120) NOT NULL,
  observacoes VARCHAR(255) NULL,
  usuario_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_ajustes_estoque_empresa_data (empresa_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS perdas_estoque (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  produto_id INT NOT NULL,
  quantidade INT NOT NULL,
  motivo VARCHAR(120) NOT NULL,
  observacoes VARCHAR(255) NULL,
  usuario_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_perdas_estoque_empresa_data (empresa_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  usuario_id INT NOT NULL,
  nome VARCHAR(140) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'aberto',
  data_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_fim TIMESTAMP NULL DEFAULT NULL,
  observacoes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_inventarios_empresa_status (empresa_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventario_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventario_id INT NOT NULL,
  produto_id INT NOT NULL,
  saldo_sistema INT NOT NULL,
  saldo_contado INT NULL,
  diferenca INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (inventario_id) REFERENCES inventarios(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  UNIQUE KEY uk_inventario_produto (inventario_id, produto_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS caixas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  nome VARCHAR(100) NOT NULL,
  identificador VARCHAR(30) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  UNIQUE KEY uk_caixas_empresa_nome (empresa_id, nome),
  UNIQUE KEY uk_caixas_empresa_identificador (empresa_id, identificador),
  INDEX idx_caixas_empresa_status (empresa_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS formas_pagamento_empresa (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  codigo VARCHAR(40) NOT NULL,
  nome VARCHAR(80) NOT NULL,
  tipo_recebimento VARCHAR(20) NOT NULL DEFAULT 'caixa',
  prazo_dias INT NOT NULL DEFAULT 0,
  taxa_percentual DECIMAL(7,2) NOT NULL DEFAULT 0.00,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  UNIQUE KEY uk_formas_pagamento_empresa_codigo (empresa_id, codigo),
  INDEX idx_formas_pagamento_empresa_tipo (empresa_id, tipo_recebimento, ativo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS caixa_sessoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  caixa_id INT NOT NULL,
  usuario_abertura_id INT NOT NULL,
  usuario_fechamento_id INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'aberto',
  valor_abertura DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  data_abertura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_fechamento TIMESTAMP NULL DEFAULT NULL,
  observacoes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (caixa_id) REFERENCES caixas(id),
  FOREIGN KEY (usuario_abertura_id) REFERENCES usuarios(id),
  FOREIGN KEY (usuario_fechamento_id) REFERENCES usuarios(id),
  INDEX idx_caixa_sessoes_empresa_status (empresa_id, status),
  INDEX idx_caixa_sessoes_caixa_status (caixa_id, status),
  INDEX idx_caixa_sessoes_usuario_abertura (usuario_abertura_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS caixa_movimentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caixa_sessao_id INT NOT NULL,
  usuario_id INT NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  descricao VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (caixa_sessao_id) REFERENCES caixa_sessoes(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_caixa_movimentos_sessao_tipo (caixa_sessao_id, tipo),
  INDEX idx_caixa_movimentos_data (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS caixa_fechamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caixa_sessao_id INT NOT NULL,
  usuario_id INT NOT NULL,
  valor_sistema DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  valor_informado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  diferenca DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  observacoes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (caixa_sessao_id) REFERENCES caixa_sessoes(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  UNIQUE KEY uk_caixa_fechamentos_sessao (caixa_sessao_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vendas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  usuario_id INT NOT NULL,
  cliente_id INT NULL,
  caixa_id INT NULL,
  caixa_sessao_id INT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  desconto_valor DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  acrescimo_valor DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  valor_recebido DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  troco DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  forma_pagamento VARCHAR(40) NOT NULL DEFAULT 'dinheiro',
  status VARCHAR(20) NOT NULL DEFAULT 'finalizada',
  observacoes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (caixa_id) REFERENCES caixas(id),
  FOREIGN KEY (caixa_sessao_id) REFERENCES caixa_sessoes(id),
  INDEX idx_vendas_empresa_data (empresa_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS venda_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venda_id INT NOT NULL,
  produto_id INT NOT NULL,
  quantidade INT NOT NULL,
  preco_unitario DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  INDEX idx_venda_itens_venda (venda_id),
  INDEX idx_venda_itens_produto (produto_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS venda_pagamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venda_id INT NOT NULL,
  metodo VARCHAR(40) NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
  INDEX idx_venda_pagamentos_venda (venda_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contas_receber (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  cliente_id INT NULL,
  venda_id INT NULL,
  venda_pagamento_id INT NULL,
  forma_pagamento VARCHAR(40) NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  vencimento DATE NOT NULL,
  data_recebimento TIMESTAMP NULL DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  observacoes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE SET NULL,
  FOREIGN KEY (venda_pagamento_id) REFERENCES venda_pagamentos(id) ON DELETE SET NULL,
  UNIQUE KEY uk_contas_receber_venda_pagamento (venda_pagamento_id),
  INDEX idx_contas_receber_empresa_status (empresa_id, status, vencimento),
  INDEX idx_contas_receber_empresa_venda (empresa_id, venda_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contas_pagar (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  fornecedor_id INT NOT NULL,
  entrada_mercadoria_id INT NULL,
  valor DECIMAL(12,2) NOT NULL,
  vencimento DATE NOT NULL,
  data_pagamento TIMESTAMP NULL DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  observacoes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  FOREIGN KEY (entrada_mercadoria_id) REFERENCES entradas_mercadoria(id) ON DELETE SET NULL,
  UNIQUE KEY uk_contas_pagar_entrada (entrada_mercadoria_id),
  INDEX idx_contas_pagar_empresa_status (empresa_id, status, vencimento)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  categoria VARCHAR(40) NOT NULL,
  origem VARCHAR(40) NOT NULL,
  origem_id INT NULL,
  cliente_id INT NULL,
  fornecedor_id INT NULL,
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  vencimento DATE NOT NULL,
  data_liquidacao TIMESTAMP NULL DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  INDEX idx_lancamentos_financeiros_empresa_status (empresa_id, status, vencimento),
  INDEX idx_lancamentos_financeiros_origem (origem, origem_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS conciliacoes_cartao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  conta_receber_id INT NOT NULL,
  venda_pagamento_id INT NOT NULL,
  forma_pagamento VARCHAR(40) NOT NULL,
  bandeira VARCHAR(40) NULL,
  taxa_percentual DECIMAL(7,2) NOT NULL DEFAULT 0.00,
  valor_bruto DECIMAL(12,2) NOT NULL,
  valor_taxa DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  valor_liquido DECIMAL(12,2) NOT NULL,
  data_prevista DATE NOT NULL,
  data_conciliacao TIMESTAMP NULL DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  observacoes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (conta_receber_id) REFERENCES contas_receber(id) ON DELETE CASCADE,
  FOREIGN KEY (venda_pagamento_id) REFERENCES venda_pagamentos(id) ON DELETE CASCADE,
  UNIQUE KEY uk_conciliacoes_cartao_pagamento (venda_pagamento_id),
  INDEX idx_conciliacoes_cartao_empresa_status (empresa_id, status, data_prevista)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS venda_cancelamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venda_id INT NOT NULL,
  usuario_id INT NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  UNIQUE KEY uk_venda_cancelamentos_venda (venda_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS documentos_fiscais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  venda_id INT NOT NULL,
  usuario_id INT NOT NULL,
  tipo_documento VARCHAR(40) NOT NULL DEFAULT 'nfce',
  ambiente VARCHAR(20) NULL,
  serie VARCHAR(10) NULL,
  numero INT NULL,
  numero_documento VARCHAR(60) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pendente',
  chave_acesso VARCHAR(60) NULL,
  protocolo_autorizacao VARCHAR(80) NULL,
  mensagem_retorno VARCHAR(255) NULL,
  xml_conteudo LONGTEXT NULL,
  data_emissao TIMESTAMP NULL DEFAULT NULL,
  data_autorizacao TIMESTAMP NULL DEFAULT NULL,
  data_cancelamento TIMESTAMP NULL DEFAULT NULL,
  motivo_cancelamento VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  UNIQUE KEY uk_documentos_fiscais_venda (venda_id),
  UNIQUE KEY uk_documentos_fiscais_numero (empresa_id, tipo_documento, serie, numero),
  INDEX idx_documentos_fiscais_status (status),
  INDEX idx_documentos_fiscais_empresa_data (empresa_id, created_at)
) ENGINE=InnoDB;
