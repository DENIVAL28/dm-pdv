USE dm_pdv;

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
