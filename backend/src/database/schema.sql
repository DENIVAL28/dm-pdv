CREATE DATABASE IF NOT EXISTS dm_pdv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dm_pdv;

CREATE TABLE IF NOT EXISTS empresas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome_fantasia VARCHAR(160) NOT NULL,
  razao_social VARCHAR(180) NULL,
  documento VARCHAR(20) NULL UNIQUE,
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  INDEX idx_clientes_empresa_nome (empresa_id, nome),
  INDEX idx_clientes_empresa_documento (empresa_id, documento)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS caixas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  nome VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  UNIQUE KEY uk_caixas_empresa_nome (empresa_id, nome),
  INDEX idx_caixas_empresa_status (empresa_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vendas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT NOT NULL,
  usuario_id INT NOT NULL,
  cliente_id INT NULL,
  caixa_id INT NULL,
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

CREATE TABLE IF NOT EXISTS documentos_fiscais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venda_id INT NOT NULL,
  tipo_documento VARCHAR(40) NOT NULL DEFAULT 'pendente',
  numero_documento VARCHAR(60) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pendente',
  chave_acesso VARCHAR(60) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
  INDEX idx_documentos_fiscais_status (status)
) ENGINE=InnoDB;
