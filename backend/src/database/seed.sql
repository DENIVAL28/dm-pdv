USE dm_pdv;

INSERT INTO empresas (id, nome_fantasia, razao_social, documento)
VALUES (1, 'DM Sistemas Mercado Modelo', 'DM Sistemas Mercado Modelo LTDA', '00000000000191')
ON DUPLICATE KEY UPDATE nome_fantasia = VALUES(nome_fantasia);

INSERT INTO usuarios (empresa_id, nome, email, senha_hash)
VALUES (1, 'Administrador', 'admin@dmsistemas.com', '$2a$10$CB5fzTB67p49dItUB46Y7O7mG1G33dvWVLMSDEaJYpiRc3OfB73.K')
ON DUPLICATE KEY UPDATE email = email;

INSERT INTO caixas (empresa_id, nome, status)
VALUES (1, 'Caixa principal', 'ativo')
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO clientes (empresa_id, nome, documento, telefone)
SELECT 1, 'Maria Oliveira', '12345678900', '(66) 99999-1001'
WHERE NOT EXISTS (
  SELECT 1
  FROM clientes
  WHERE empresa_id = 1
    AND documento = '12345678900'
);

INSERT INTO clientes (empresa_id, nome, documento, telefone)
SELECT 1, 'Joao Ferreira', '98765432100', '(66) 99999-2002'
WHERE NOT EXISTS (
  SELECT 1
  FROM clientes
  WHERE empresa_id = 1
    AND documento = '98765432100'
);

INSERT INTO produtos (empresa_id, nome, codigo_barras, preco, estoque, estoque_minimo) VALUES
(1, 'Arroz 5kg', '7891000000011', 28.90, 20, 6),
(1, 'Feijao 1kg', '7891000000028', 8.99, 35, 8),
(1, 'Oleo de Soja 900ml', '7891000000035', 6.49, 40, 8),
(1, 'Acucar 2kg', '7891000000042', 7.50, 25, 6),
(1, 'Cafe 500g', '7891000000059', 16.90, 15, 5)
ON DUPLICATE KEY UPDATE nome = VALUES(nome);
