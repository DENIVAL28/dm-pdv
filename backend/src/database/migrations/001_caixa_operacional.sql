USE dm_pdv;

ALTER TABLE caixas
  ADD COLUMN identificador VARCHAR(30) NULL AFTER nome;

ALTER TABLE caixas
  ADD UNIQUE KEY uk_caixas_empresa_identificador (empresa_id, identificador);

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

ALTER TABLE vendas
  ADD COLUMN caixa_sessao_id INT NULL AFTER caixa_id;

ALTER TABLE vendas
  ADD CONSTRAINT fk_vendas_caixa_sessao
  FOREIGN KEY (caixa_sessao_id) REFERENCES caixa_sessoes(id);

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
