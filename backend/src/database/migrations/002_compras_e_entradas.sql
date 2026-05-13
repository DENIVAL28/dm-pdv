USE dm_pdv;

ALTER TABLE produtos
  ADD COLUMN marca VARCHAR(80) NULL AFTER codigo_barras,
  ADD COLUMN unidade VARCHAR(20) NOT NULL DEFAULT 'UN' AFTER marca,
  ADD COLUMN custo DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER unidade,
  ADD COLUMN margem_percentual DECIMAL(7,2) NOT NULL DEFAULT 0.00 AFTER custo;

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
