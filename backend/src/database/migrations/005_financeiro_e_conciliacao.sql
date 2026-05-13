USE dm_pdv;

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
