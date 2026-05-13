USE dm_pdv;

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS email VARCHAR(160) NULL AFTER telefone,
  ADD COLUMN IF NOT EXISTS data_nascimento DATE NULL AFTER email,
  ADD COLUMN IF NOT EXISTS observacoes VARCHAR(255) NULL AFTER data_nascimento,
  ADD COLUMN IF NOT EXISTS ativo TINYINT(1) NOT NULL DEFAULT 1 AFTER observacoes,
  ADD INDEX IF NOT EXISTS idx_clientes_empresa_telefone (empresa_id, telefone);

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

INSERT IGNORE INTO formas_pagamento_empresa (
  empresa_id,
  codigo,
  nome,
  tipo_recebimento,
  prazo_dias,
  taxa_percentual,
  ativo
)
SELECT
  e.id,
  'crediario',
  'Crediario',
  'crediario',
  30,
  0.00,
  1
FROM empresas e;
