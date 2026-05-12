# DM PDV

Sistema web para pequenos mercados com foco em operacao diaria de caixa, cadastro de produtos, controle de estoque e consulta de vendas.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Banco: MySQL
- Autenticacao: JWT
- Senhas: bcrypt

## Escopo atual

- Login com JWT
- Dashboard com vendas do dia, total vendido, produtos cadastrados e estoque baixo
- Cadastro e edicao de produtos
- Cadastro e edicao de clientes
- PDV com busca por nome ou codigo de barras
- Selecao opcional de cliente no fechamento da venda
- Desconto, acrescimo, valor recebido e troco no fechamento da venda
- Baixa de estoque no fechamento da venda
- Relatorios com filtro por data

## Estrutura preparada para evolucao

O schema atual ja deixa a base pronta para crescer com:

- empresas
- clientes
- caixas
- pagamentos
- documentos fiscais

Nesta versao, somente o necessario para a operacao local foi colocado no fluxo principal.

## Como rodar

### 1. Banco de dados

Crie um banco MySQL chamado `dm_pdv` e execute:

```sql
backend/src/database/schema.sql
backend/src/database/seed.sql
```

Se voce ja tinha um banco criado com a estrutura anterior, o caminho mais seguro e recriar a base local antes de rodar esta versao.

Se estiver usando o MySQL local empacotado neste projeto, voce pode subir e reaplicar a base com:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-local-mysql.ps1
powershell -ExecutionPolicy Bypass -File scripts/reset-local-db.ps1
```

O script `reset-local-db.ps1` recria a base `dm_pdv` do zero para aplicar a estrutura mais recente.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Arquivo de ambiente:

```env
PORT=3333
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=dm_pdv
JWT_SECRET=troque_essa_chave_em_producao
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend consome `http://localhost:3333/api` por padrao.

## Login inicial

- E-mail: `admin@dmsistemas.com`
- Senha: `123456`

## Fluxo de venda implementado

1. Buscar produto por nome ou codigo de barras
2. Adicionar item ao carrinho
3. Opcionalmente vincular um cliente a venda
4. Ajustar quantidade, desconto, acrescimo e pagamento
5. Calcular total, valor recebido e troco
6. Finalizar venda com validacao de estoque no backend
7. Gravar venda, itens e pagamento na mesma transacao
8. Baixar estoque
9. Retornar a venda finalizada para o frontend
10. Limpar o carrinho e exibir confirmacao

## Endpoints principais

- `POST /api/auth/login`
- `GET /api/produtos`
- `POST /api/produtos`
- `PUT /api/produtos/:id`
- `DELETE /api/produtos/:id`
- `GET /api/clientes`
- `POST /api/clientes`
- `PUT /api/clientes/:id`
- `DELETE /api/clientes/:id`
- `POST /api/vendas`
- `GET /api/vendas`
- `GET /api/relatorios/dashboard`
- `GET /api/relatorios/vendas?data_inicial=AAAA-MM-DD&data_final=AAAA-MM-DD`

## Regras importantes ja atendidas

- Respostas da API padronizadas em `{ success, data }`
- Tratamento de erros com mensagens claras
- Venda com bloqueio de estoque insuficiente
- Transacao MySQL para venda, itens, pagamento e baixa de estoque
- Valores financeiros armazenados com `DECIMAL`
- Indices em nome de produto, codigo de barras e data da venda
- Produtos desativados sem apagar historico de vendas
