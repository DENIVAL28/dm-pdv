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
- Cadastro de fornecedores
- Pedidos de compra
- Entrada de mercadoria com aumento de estoque
- Ajustes de estoque e perdas com motivo
- Inventario com abertura, contagem e fechamento
- Trilha auditavel de movimentacao de estoque
- Abertura e fechamento de caixa com sangria e suprimento
- Configuracao fiscal da empresa
- Cadastro fiscal do produto para emissao
- Documento fiscal pendente por venda
- Emissao fiscal local com numeracao e chave
- Cancelamento fiscal vinculado ao fluxo da venda
- Contas a receber geradas automaticamente pelas vendas
- Contas a pagar geradas automaticamente pelas entradas
- Conciliacao de cartao com taxa e valor liquido
- Lancamentos financeiros manuais
- Ficha completa de cliente com endereco, contatos e observacoes
- Historico comercial automatico por venda e recebimento
- Credito por cliente com limite, prazo e saldo disponivel
- Crediario integrado ao PDV e ao contas a receber
- PDV com busca por nome ou codigo de barras
- Selecao opcional de cliente no fechamento da venda
- Desconto, acrescimo, valor recebido e troco no fechamento da venda
- Venda vinculada a sessao de caixa aberta
- Baixa de estoque no fechamento da venda
- Cancelamento de venda com devolucao de estoque
- Relatorios com filtro por data

## Estrutura preparada para evolucao

O schema atual ja deixa a base pronta para crescer com:

- empresas
- clientes
- caixas
- fornecedores
- pedidos de compra
- entradas de mercadoria
- pagamentos
- documentos fiscais
- tributacao de produtos

Nesta versao, somente o necessario para a operacao local foi colocado no fluxo principal.

## Roadmap tecnico

O plano de evolucao por fases esta em [docs/ROADMAP-TECNICO.md](./docs/ROADMAP-TECNICO.md).

Esse documento organiza:

- passo zero de base tecnica
- fases de caixa, compras, estoque, fiscal e financeiro
- fortalecimento de clientes
- multiempresa real e permissoes
- tabelas, telas e APIs previstas por etapa

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

### 4. Automacao no Windows

Se estiver no Windows, voce pode usar:

```text
scripts\setup-dev.bat
scripts\start-dev.bat
```

Uso recomendado:

1. Rode `scripts\setup-dev.bat` uma vez para preparar backend e frontend
2. Configure o MySQL e importe `schema.sql` e `seed.sql`
3. Rode `scripts\start-dev.bat` para abrir backend e frontend

Se quiser mandar um atalho de clone para outra pessoa, use:

```text
scripts\clone-dm-pdv.bat
```

## Login inicial

- E-mail: `admin@dmsistemas.com`
- Senha: `123456`

## Colaboracao

Branches de trabalho:

- `main`: versao estavel
- `develop`: integracao
- `feat/*`, `fix/*`, `chore/*`: trabalho individual por tarefa

Fluxo recomendado:

1. Atualizar `develop`
2. Criar branch propria para a tarefa
3. Abrir PR para `develop`
4. Promover `develop` para `main` quando a rodada estiver validada

Detalhes completos em [CONTRIBUTING.md](./CONTRIBUTING.md).

## Fluxo de venda implementado

1. Abrir uma sessao de caixa
2. Buscar produto por nome ou codigo de barras
3. Adicionar item ao carrinho
4. Opcionalmente vincular um cliente a venda
5. Ajustar quantidade, desconto, acrescimo e pagamento
6. Calcular total, valor recebido e troco
7. Finalizar venda com validacao de estoque e caixa aberto no backend
8. Gravar venda, itens e pagamento na mesma transacao
9. Baixar estoque
10. Retornar a venda finalizada para o frontend
11. Limpar o carrinho e exibir confirmacao

## Endpoints principais

- `POST /api/auth/login`
- `GET /api/produtos`
- `POST /api/produtos`
- `PUT /api/produtos/:id`
- `DELETE /api/produtos/:id`
- `GET /api/clientes`
- `POST /api/clientes`
- `GET /api/clientes/:id`
- `GET /api/clientes/:id/compras`
- `GET /api/clientes/:id/historico`
- `PUT /api/clientes/:id`
- `POST /api/clientes/:id/enderecos`
- `PUT /api/clientes/:id/enderecos/:enderecoId`
- `DELETE /api/clientes/:id/enderecos/:enderecoId`
- `POST /api/clientes/:id/contatos`
- `PUT /api/clientes/:id/contatos/:contatoId`
- `DELETE /api/clientes/:id/contatos/:contatoId`
- `POST /api/clientes/:id/credito`
- `DELETE /api/clientes/:id`
- `GET /api/fornecedores`
- `POST /api/fornecedores`
- `PUT /api/fornecedores/:id`
- `DELETE /api/fornecedores/:id`
- `GET /api/compras/pedidos`
- `POST /api/compras/pedidos`
- `POST /api/compras/pedidos/:id/finalizar`
- `GET /api/compras/sugestao-compra`
- `GET /api/entradas`
- `POST /api/entradas`
- `GET /api/caixas`
- `GET /api/caixas/sessao-atual`
- `POST /api/caixas/sessoes/abrir`
- `POST /api/caixas/sessoes/:id/sangria`
- `POST /api/caixas/sessoes/:id/suprimento`
- `POST /api/caixas/sessoes/:id/fechar`
- `GET /api/caixas/sessoes/:id/resumo`
- `GET /api/estoque/movimentos`
- `POST /api/estoque/ajustes`
- `POST /api/estoque/perdas`
- `GET /api/estoque/inventarios`
- `GET /api/estoque/inventarios/atual`
- `POST /api/estoque/inventarios`
- `GET /api/estoque/inventarios/:id/itens`
- `POST /api/estoque/inventarios/:id/itens/contagem`
- `POST /api/estoque/inventarios/:id/finalizar`
- `POST /api/estoque/inventarios/:id/cancelar`
- `GET /api/fiscal/configuracao`
- `PUT /api/fiscal/configuracao`
- `GET /api/fiscal/documentos`
- `GET /api/fiscal/documentos/:id`
- `POST /api/fiscal/documentos/venda/:vendaId/emitir`
- `POST /api/fiscal/documentos/:id/cancelar`
- `GET /api/financeiro/resumo`
- `GET /api/financeiro/lancamentos`
- `POST /api/financeiro/lancamentos`
- `GET /api/financeiro/contas-receber`
- `POST /api/financeiro/contas-receber/:id/receber`
- `GET /api/financeiro/contas-pagar`
- `POST /api/financeiro/contas-pagar/:id/pagar`
- `GET /api/financeiro/conciliacoes/cartao`
- `POST /api/financeiro/conciliacoes/cartao/:id/conciliar`
- `POST /api/vendas`
- `GET /api/vendas`
- `POST /api/vendas/:id/cancelar`
- `GET /api/relatorios/dashboard`
- `GET /api/relatorios/vendas?data_inicial=AAAA-MM-DD&data_final=AAAA-MM-DD`

## Regras importantes ja atendidas

- Respostas da API padronizadas em `{ success, data }`
- Tratamento de erros com mensagens claras
- Venda com bloqueio de estoque insuficiente
- Venda bloqueada sem caixa aberto
- Entrada de mercadoria atualizando custo e estoque no mesmo fluxo
- Movimentos de estoque gravados para venda, cancelamento, entrada, ajuste, perda e inventario
- Cancelamento de venda bloqueado quando o documento fiscal estiver autorizado
- Venda em cartao gerando conciliacao financeira
- Venda no crediario exigindo cliente com limite disponivel
- Recebimento de cliente atualizando historico e saldo do credito
- Entrada de mercadoria gerando conta a pagar
- Transacao MySQL para venda, itens, pagamento e baixa de estoque
- Valores financeiros armazenados com `DECIMAL`
- Indices em nome de produto, codigo de barras e data da venda
- Produtos desativados sem apagar historico de vendas
