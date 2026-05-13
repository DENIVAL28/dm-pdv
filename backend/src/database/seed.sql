USE dm_pdv;

INSERT INTO empresas (
  id,
  nome_fantasia,
  razao_social,
  documento,
  inscricao_estadual,
  regime_tributario,
  ambiente_fiscal,
  serie_nfce,
  proximo_numero_nfce,
  cep,
  logradouro,
  numero,
  complemento,
  bairro,
  cidade,
  estado
)
VALUES (
  1,
  'DM Sistemas Mercado Modelo',
  'DM Sistemas Mercado Modelo LTDA',
  '12345678000195',
  '123456789',
  'simples_nacional',
  'homologacao',
  '1',
  1,
  '78000000',
  'Avenida Central',
  '100',
  'Sala 1',
  'Centro',
  'Cuiaba',
  'MT'
)
ON DUPLICATE KEY UPDATE
  nome_fantasia = VALUES(nome_fantasia),
  razao_social = VALUES(razao_social),
  documento = VALUES(documento),
  inscricao_estadual = VALUES(inscricao_estadual),
  regime_tributario = VALUES(regime_tributario),
  ambiente_fiscal = VALUES(ambiente_fiscal),
  serie_nfce = VALUES(serie_nfce),
  proximo_numero_nfce = VALUES(proximo_numero_nfce),
  cep = VALUES(cep),
  logradouro = VALUES(logradouro),
  numero = VALUES(numero),
  complemento = VALUES(complemento),
  bairro = VALUES(bairro),
  cidade = VALUES(cidade),
  estado = VALUES(estado);

INSERT INTO usuarios (empresa_id, nome, email, senha_hash)
VALUES (1, 'Administrador', 'admin@dmsistemas.com', '$2a$10$CB5fzTB67p49dItUB46Y7O7mG1G33dvWVLMSDEaJYpiRc3OfB73.K')
ON DUPLICATE KEY UPDATE email = email;

INSERT INTO caixas (empresa_id, nome, identificador, status)
VALUES (1, 'Caixa principal', 'CX-01', 'ativo')
ON DUPLICATE KEY UPDATE
  identificador = VALUES(identificador),
  status = VALUES(status);

INSERT INTO formas_pagamento_empresa (empresa_id, codigo, nome, tipo_recebimento, prazo_dias, taxa_percentual, ativo)
VALUES
  (1, 'dinheiro', 'Dinheiro', 'caixa', 0, 0.00, 1),
  (1, 'pix', 'Pix', 'banco', 0, 0.00, 1),
  (1, 'cartao_debito', 'Cartao de debito', 'cartao', 1, 1.99, 1),
  (1, 'cartao_credito', 'Cartao de credito', 'cartao', 30, 3.49, 1),
  (1, 'crediario', 'Crediario', 'crediario', 30, 0.00, 1)
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  tipo_recebimento = VALUES(tipo_recebimento),
  prazo_dias = VALUES(prazo_dias),
  taxa_percentual = VALUES(taxa_percentual),
  ativo = VALUES(ativo);

INSERT INTO clientes (
  empresa_id,
  nome,
  documento,
  telefone,
  email,
  data_nascimento,
  observacoes,
  ativo
)
SELECT
  1,
  'Maria Oliveira',
  '12345678900',
  '(66) 99999-1001',
  'maria.oliveira@cliente.com',
  '1988-03-22',
  'Cliente que costuma identificar compras no caixa.',
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM clientes
  WHERE empresa_id = 1
    AND documento = '12345678900'
);

UPDATE clientes
SET
  nome = 'Maria Oliveira',
  telefone = '(66) 99999-1001',
  email = 'maria.oliveira@cliente.com',
  data_nascimento = '1988-03-22',
  observacoes = 'Cliente que costuma identificar compras no caixa.',
  ativo = 1
WHERE empresa_id = 1
  AND documento = '12345678900';

INSERT INTO clientes (
  empresa_id,
  nome,
  documento,
  telefone,
  email,
  data_nascimento,
  observacoes,
  ativo
)
SELECT
  1,
  'Joao Ferreira',
  '98765432100',
  '(66) 99999-2002',
  'joao.ferreira@cliente.com',
  '1982-11-09',
  'Cliente com limite liberado para crediario local.',
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM clientes
  WHERE empresa_id = 1
    AND documento = '98765432100'
);

UPDATE clientes
SET
  nome = 'Joao Ferreira',
  telefone = '(66) 99999-2002',
  email = 'joao.ferreira@cliente.com',
  data_nascimento = '1982-11-09',
  observacoes = 'Cliente com limite liberado para crediario local.',
  ativo = 1
WHERE empresa_id = 1
  AND documento = '98765432100';

INSERT INTO cliente_enderecos (
  cliente_id,
  titulo,
  cep,
  logradouro,
  numero,
  complemento,
  bairro,
  cidade,
  estado,
  principal
)
SELECT
  c.id,
  'Casa',
  '78045000',
  'Rua das Laranjeiras',
  '120',
  NULL,
  'Jardim Primavera',
  'Cuiaba',
  'MT',
  1
FROM clientes c
WHERE c.empresa_id = 1
  AND c.documento = '12345678900'
  AND NOT EXISTS (
    SELECT 1
    FROM cliente_enderecos ce
    WHERE ce.cliente_id = c.id
      AND ce.principal = 1
  );

INSERT INTO cliente_enderecos (
  cliente_id,
  titulo,
  cep,
  logradouro,
  numero,
  complemento,
  bairro,
  cidade,
  estado,
  principal
)
SELECT
  c.id,
  'Casa',
  '78050000',
  'Avenida das Palmeiras',
  '840',
  'Fundos',
  'Boa Esperanca',
  'Cuiaba',
  'MT',
  1
FROM clientes c
WHERE c.empresa_id = 1
  AND c.documento = '98765432100'
  AND NOT EXISTS (
    SELECT 1
    FROM cliente_enderecos ce
    WHERE ce.cliente_id = c.id
      AND ce.principal = 1
  );

INSERT INTO cliente_contatos (
  cliente_id,
  nome,
  funcao,
  telefone,
  whatsapp,
  email,
  observacoes
)
SELECT
  c.id,
  'Maria Oliveira',
  'Titular',
  '(66) 99999-1001',
  '(66) 99999-1001',
  'maria.oliveira@cliente.com',
  'Contato principal para avisos.'
FROM clientes c
WHERE c.empresa_id = 1
  AND c.documento = '12345678900'
  AND NOT EXISTS (
    SELECT 1
    FROM cliente_contatos cc
    WHERE cc.cliente_id = c.id
  );

INSERT INTO cliente_contatos (
  cliente_id,
  nome,
  funcao,
  telefone,
  whatsapp,
  email,
  observacoes
)
SELECT
  c.id,
  'Joao Ferreira',
  'Titular',
  '(66) 99999-2002',
  '(66) 99999-2002',
  'joao.ferreira@cliente.com',
  'Contato liberado para cobranca do crediario.'
FROM clientes c
WHERE c.empresa_id = 1
  AND c.documento = '98765432100'
  AND NOT EXISTS (
    SELECT 1
    FROM cliente_contatos cc
    WHERE cc.cliente_id = c.id
  );

INSERT INTO cliente_creditos (
  cliente_id,
  limite_credito,
  dias_vencimento,
  ativo,
  observacoes
)
SELECT
  c.id,
  250.00,
  30,
  1,
  'Limite inicial para vendas no crediario.'
FROM clientes c
WHERE c.empresa_id = 1
  AND c.documento = '98765432100'
ON DUPLICATE KEY UPDATE
  limite_credito = VALUES(limite_credito),
  dias_vencimento = VALUES(dias_vencimento),
  ativo = VALUES(ativo),
  observacoes = VALUES(observacoes);

INSERT INTO fornecedores (empresa_id, razao_social, nome_fantasia, documento, telefone, email, contato_nome)
SELECT 1, 'Alimentos do Vale LTDA', 'Distribuidora Vale', '11111111000191', '(66) 3333-1000', 'vendas@vale.com', 'Carlos'
WHERE NOT EXISTS (
  SELECT 1
  FROM fornecedores
  WHERE empresa_id = 1
    AND documento = '11111111000191'
);

INSERT INTO fornecedores (empresa_id, razao_social, nome_fantasia, documento, telefone, email, contato_nome)
SELECT 1, 'Atacado Regional LTDA', 'Atacado Regional', '22222222000191', '(66) 3333-2000', 'pedidos@regional.com', 'Fernanda'
WHERE NOT EXISTS (
  SELECT 1
  FROM fornecedores
  WHERE empresa_id = 1
    AND documento = '22222222000191'
);

INSERT INTO produtos (
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
) VALUES
(1, 'Arroz 5kg', '7891000000011', 'Vale Bom', 'UN', '10063021', '5102', NULL, '0', '102', 'UN', 24.30, 18.93, 28.90, 20, 6),
(1, 'Feijao 1kg', '7891000000028', 'Grao Forte', 'UN', '07133319', '5102', NULL, '0', '102', 'UN', 7.10, 26.62, 8.99, 35, 8),
(1, 'Oleo de Soja 900ml', '7891000000035', 'Sabor Nobre', 'UN', '15079011', '5102', NULL, '0', '102', 'UN', 5.25, 23.62, 6.49, 40, 8),
(1, 'Acucar 2kg', '7891000000042', 'Doce Campo', 'UN', '17019900', '5102', NULL, '0', '102', 'UN', 6.05, 23.97, 7.50, 25, 6),
(1, 'Cafe 500g', '7891000000059', 'Serra Alta', 'UN', '09012100', '5102', NULL, '0', '102', 'UN', 13.90, 21.58, 16.90, 15, 5)
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  marca = VALUES(marca),
  unidade = VALUES(unidade),
  ncm = VALUES(ncm),
  cfop_padrao = VALUES(cfop_padrao),
  cest = VALUES(cest),
  origem_mercadoria = VALUES(origem_mercadoria),
  cst_csosn = VALUES(cst_csosn),
  unidade_tributavel = VALUES(unidade_tributavel),
  custo = VALUES(custo),
  margem_percentual = VALUES(margem_percentual),
  preco = VALUES(preco);
