# Roadmap Tecnico DM PDV

## Objetivo

Este documento organiza a evolucao do DM PDV para sair de um PDV funcional inicial e caminhar para uma operacao de mercado pequena com fluxo completo de loja.

A referencia aqui nao e copiar toda a complexidade do CISS de uma vez. A meta e copiar a operacao certa, na ordem certa, com base solida de codigo, banco e produto.

## Estado atual

Hoje o projeto ja entrega:

- autenticacao com JWT
- cadastro de produtos
- cadastro de clientes
- PDV com leitura por nome ou codigo de barras
- venda com itens, pagamento, desconto, acrescimo, troco e baixa de estoque
- dashboard e relatorios basicos
- base inicial para empresas, caixas e documentos fiscais

Hoje o projeto ainda nao entrega:

- abertura e fechamento real de caixa
- sangria e suprimento
- fornecedores e compras
- entrada de mercadoria
- inventario e auditoria de estoque
- emissao fiscal
- conciliacao financeira
- historico forte de clientes
- multiempresa real com permissoes

## Principios tecnicos

- manter frontend e backend separados
- centralizar regra de negocio em `services`
- manter respostas padronizadas em `{ success, data, message }`
- evitar regra operacional dentro de componentes React
- usar `DECIMAL` para valores financeiros
- usar transacao em qualquer operacao que impacte venda, estoque, caixa ou financeiro
- manter tudo preparado para `empresa_id`
- documentar toda fase antes de expandir o schema

## Passo zero obrigatorio

Antes de entrar nas fases de negocio, o projeto precisa de uma base melhor de evolucao. Sem isso, cada fase vai ficar mais cara de manter.

### Banco e infraestrutura

- criar pasta `backend/src/database/migrations`
- separar `schema.sql` inicial de migracoes incrementais
- criar convencao de nomes para migracoes
- criar seeds separados por ambiente
- padronizar campos `created_at`, `updated_at`, `deleted_at` quando fizer sentido
- criar tabela de configuracoes por empresa

### Backend

- adicionar pastas por dominio quando o sistema crescer: `caixa`, `compras`, `estoque`, `fiscal`, `financeiro`
- manter padrao `controller -> service -> database`
- criar middleware de permissao alem do middleware de autenticacao
- padronizar validadores por modulo
- criar logs de auditoria para eventos operacionais criticos

### Frontend

- consolidar layout base, grid, formularios e tabelas reutilizaveis
- corrigir textos corrompidos e fechar padrao de nomenclatura nas telas
- criar biblioteca local de componentes do sistema: `PageHeader`, `StatCard`, `DataTable`, `EmptyState`, `FormField`, `StatusBadge`
- padronizar mensagens de erro, sucesso e confirmacao

### Resultado esperado do passo zero

- projeto pronto para evoluir sem depender de reset manual do banco em toda mudanca
- frontend mais consistente para receber modulos novos
- base preparada para permissoes e auditoria

## Fase 1 - Caixa operacional completo

### Objetivo

Transformar o PDV atual em frente de caixa real, com abertura, venda vinculada ao caixa aberto, movimentos de tesouraria e fechamento do turno.

### Tabelas e ajustes de banco

- expandir `caixas` com identificador operacional e configuracoes basicas
- criar `caixa_sessoes`
- criar `caixa_movimentos`
- criar `caixa_fechamentos`
- ajustar `vendas` para usar `caixa_sessao_id`
- criar `venda_cancelamentos`

### Estrutura sugerida

- `caixa_sessoes`: id, empresa_id, caixa_id, usuario_abertura_id, data_abertura, valor_abertura, status, observacoes
- `caixa_movimentos`: id, caixa_sessao_id, tipo, valor, descricao, usuario_id, created_at
- `caixa_fechamentos`: id, caixa_sessao_id, total_sistema, total_informado, diferenca, observacoes, usuario_fechamento_id, created_at
- `venda_cancelamentos`: id, venda_id, motivo, usuario_id, created_at

### APIs previstas

- `GET /api/caixas`
- `GET /api/caixas/sessao-atual`
- `POST /api/caixas/sessoes/abrir`
- `POST /api/caixas/sessoes/:id/sangria`
- `POST /api/caixas/sessoes/:id/suprimento`
- `POST /api/caixas/sessoes/:id/fechar`
- `GET /api/caixas/sessoes/:id/resumo`
- `POST /api/vendas/:id/cancelar`

### Arquivos backend previstos

- `backend/src/controllers/caixaController.js`
- `backend/src/routes/caixaRoutes.js`
- `backend/src/services/caixaService.js`

### Telas e fluxos frontend

- tela de abertura de caixa
- tela de fechamento de caixa
- tela de resumo do caixa aberto
- painel de sangria e suprimento
- PDV travado a um caixa aberto
- tela de historico de movimentos do caixa

### Regras de negocio

- nao permitir venda sem caixa aberto
- cada venda precisa ficar vinculada a uma sessao de caixa
- sangria e suprimento precisam entrar em historico
- fechamento precisa comparar total do sistema com total informado
- cancelamento de venda precisa registrar usuario e motivo
- operador sem permissao nao pode cancelar venda ou fechar caixa

### Marco de entrega

- abrir caixa
- vender com leitora de codigo de barras
- fazer sangria
- fazer suprimento
- fechar caixa
- emitir resumo do turno por forma de pagamento

## Fase 2 - Fornecedores, compras e entrada de mercadoria

### Objetivo

Fechar a retaguarda comercial basica para repor estoque de forma controlada.

### Tabelas e ajustes de banco

- criar `fornecedores`
- criar `fornecedor_produtos`
- criar `pedidos_compra`
- criar `pedido_compra_itens`
- criar `entradas_mercadoria`
- criar `entrada_mercadoria_itens`
- expandir `produtos` com custo, margem, unidade e marca

### Estrutura sugerida

- `fornecedores`: id, empresa_id, razao_social, nome_fantasia, documento, telefone, email, contato, ativo
- `fornecedor_produtos`: id, fornecedor_id, produto_id, codigo_fornecedor, custo_padrao
- `pedidos_compra`: id, empresa_id, fornecedor_id, usuario_id, status, data_emissao, data_prevista, observacoes
- `pedido_compra_itens`: id, pedido_compra_id, produto_id, quantidade, custo_unitario, subtotal
- `entradas_mercadoria`: id, empresa_id, fornecedor_id, pedido_compra_id, usuario_id, numero_documento, data_entrada, total
- `entrada_mercadoria_itens`: id, entrada_mercadoria_id, produto_id, quantidade, custo_unitario, subtotal

### APIs previstas

- `GET /api/fornecedores`
- `POST /api/fornecedores`
- `PUT /api/fornecedores/:id`
- `GET /api/compras/pedidos`
- `POST /api/compras/pedidos`
- `POST /api/compras/pedidos/:id/finalizar`
- `GET /api/entradas`
- `POST /api/entradas`
- `GET /api/produtos/sugestao-compra`

### Arquivos backend previstos

- `backend/src/controllers/fornecedorController.js`
- `backend/src/routes/fornecedorRoutes.js`
- `backend/src/services/fornecedorService.js`
- `backend/src/controllers/compraController.js`
- `backend/src/routes/compraRoutes.js`
- `backend/src/services/compraService.js`

### Telas e fluxos frontend

- cadastro de fornecedores
- lista de fornecedores
- pedido de compra
- sugestao de compra por estoque minimo
- entrada de mercadoria
- historico de compras por fornecedor

### Regras de negocio

- entrada de mercadoria aumenta estoque
- custo medio do produto precisa ser atualizado na entrada
- nao permitir entrada com item inexistente
- pedido pode nascer de sugestao de reposicao
- documento de entrada precisa ficar vinculado ao fornecedor

### Marco de entrega

- cadastrar fornecedor
- montar pedido de compra
- receber mercadoria
- atualizar estoque e custo
- consultar historico de entradas

## Fase 3 - Estoque avancado e inventario

### Objetivo

Sair do estoque por saldo simples e entrar em controle operacional auditavel.

### Tabelas e ajustes de banco

- criar `estoque_movimentos`
- criar `inventarios`
- criar `inventario_itens`
- criar `ajustes_estoque`
- criar `perdas_estoque`
- criar `produto_lotes`
- opcional para depois: `estoque_localizacoes`

### Estrutura sugerida

- `estoque_movimentos`: id, empresa_id, produto_id, tipo, origem, origem_id, quantidade, saldo_anterior, saldo_posterior, usuario_id, created_at
- `inventarios`: id, empresa_id, usuario_id, nome, status, data_inicio, data_fim
- `inventario_itens`: id, inventario_id, produto_id, saldo_sistema, saldo_contado, diferenca
- `ajustes_estoque`: id, empresa_id, produto_id, motivo, quantidade, usuario_id, created_at
- `perdas_estoque`: id, empresa_id, produto_id, motivo, quantidade, usuario_id, created_at
- `produto_lotes`: id, produto_id, lote, validade, quantidade

### APIs previstas

- `GET /api/estoque/movimentos`
- `POST /api/estoque/ajustes`
- `POST /api/estoque/perdas`
- `GET /api/inventarios`
- `POST /api/inventarios`
- `POST /api/inventarios/:id/contagem`
- `POST /api/inventarios/:id/finalizar`

### Arquivos backend previstos

- `backend/src/controllers/estoqueController.js`
- `backend/src/routes/estoqueRoutes.js`
- `backend/src/services/estoqueService.js`
- `backend/src/controllers/inventarioController.js`
- `backend/src/routes/inventarioRoutes.js`
- `backend/src/services/inventarioService.js`

### Telas e fluxos frontend

- extrato de movimentacao de estoque
- ajuste manual com motivo
- perda e avaria
- abertura de inventario
- tela de contagem
- divergencias do inventario

### Regras de negocio

- toda entrada e saida precisa gerar movimento de estoque
- ajuste manual nao pode acontecer sem motivo
- inventario precisa congelar a referencia de saldo do momento da abertura
- fechamento de inventario precisa gerar ajustes pelas diferencas aprovadas
- produtos por lote e validade precisam ser controlados quando o negocio exigir

### Marco de entrega

- extrato auditavel do estoque
- inventario com diferencas
- ajuste e perda registrados
- saldo com rastreabilidade

## Fase 4 - Fiscal

### Objetivo

Preparar o sistema para emissao e controle fiscal da operacao de venda e entrada.

### Tabelas e ajustes de banco

- expandir `documentos_fiscais`
- criar `config_fiscal_empresas`
- criar `produto_tributacao`
- criar `documento_fiscal_eventos`
- criar `entrada_documentos_fiscais`

### Estrutura sugerida

- `config_fiscal_empresas`: empresa_id, ambiente, serie, numero_atual, csc, token, uf
- `produto_tributacao`: produto_id, ncm, cest, cfop_padrao, csosn, icms_origem, pis, cofins
- `documento_fiscal_eventos`: id, documento_fiscal_id, tipo_evento, status, payload, resposta, created_at

### APIs previstas

- `GET /api/fiscal/configuracao`
- `POST /api/fiscal/configuracao`
- `POST /api/fiscal/documentos/:vendaId/emitir`
- `POST /api/fiscal/documentos/:id/cancelar`
- `GET /api/fiscal/documentos/:id/status`
- `GET /api/fiscal/documentos`

### Arquivos backend previstos

- `backend/src/controllers/fiscalController.js`
- `backend/src/routes/fiscalRoutes.js`
- `backend/src/services/fiscalService.js`

### Telas e fluxos frontend

- configuracao fiscal da empresa
- tributacao por produto
- painel de documentos emitidos
- reenvio e consulta de status
- cancelamento fiscal

### Regras de negocio

- venda fiscalizada precisa gerar documento por fluxo controlado
- erro de emissao nao pode corromper a venda
- documento fiscal precisa guardar resposta da integracao
- cancelamento precisa registrar motivo e status

### Marco de entrega

- emitir documento fiscal por venda
- consultar status
- cancelar documento quando permitido
- manter historico de eventos fiscais

## Fase 5 - Financeiro e conciliacao

### Objetivo

Levar o sistema de recebimento simples para controle financeiro basico da loja.

### Tabelas e ajustes de banco

- criar `lancamentos_financeiros`
- criar `contas_receber`
- criar `contas_pagar`
- criar `conciliacoes_cartao`
- criar `formas_pagamento_empresa`
- ajustar `venda_pagamentos` para conciliacao

### Estrutura sugerida

- `lancamentos_financeiros`: id, empresa_id, tipo, categoria, origem, origem_id, valor, vencimento, status
- `contas_receber`: id, empresa_id, cliente_id, venda_id, valor, vencimento, status
- `contas_pagar`: id, empresa_id, fornecedor_id, entrada_mercadoria_id, valor, vencimento, status
- `conciliacoes_cartao`: id, empresa_id, venda_pagamento_id, bandeira, taxa, valor_liquido, data_prevista, status

### APIs previstas

- `GET /api/financeiro/lancamentos`
- `POST /api/financeiro/lancamentos`
- `GET /api/financeiro/contas-receber`
- `POST /api/financeiro/contas-receber`
- `GET /api/financeiro/contas-pagar`
- `POST /api/financeiro/contas-pagar`
- `POST /api/financeiro/conciliacoes/cartao`

### Arquivos backend previstos

- `backend/src/controllers/financeiroController.js`
- `backend/src/routes/financeiroRoutes.js`
- `backend/src/services/financeiroService.js`

### Telas e fluxos frontend

- contas a pagar
- contas a receber
- conciliacao de cartao
- fluxo de caixa diario
- resumo financeiro por periodo

### Regras de negocio

- venda em dinheiro entra direto no caixa
- venda em cartao precisa ficar conciliavel
- compra recebida pode gerar conta a pagar
- venda a prazo pode gerar conta a receber
- fechamento financeiro precisa bater com tesouraria e vendas

### Marco de entrega

- acompanhar contas a pagar e receber
- conciliar cartoes
- ver fluxo financeiro diario
- fechar caixa com visao financeira melhor

## Fase 6 - Clientes mais fortes

### Objetivo

Sair do cliente basico e entrar em relacionamento comercial util para a loja.

### Tabelas e ajustes de banco

- expandir `clientes` com endereco e observacoes
- criar `cliente_enderecos`
- criar `cliente_creditos`
- criar `cliente_historico`
- criar `cliente_contatos`

### Estrutura sugerida

- `cliente_enderecos`: id, cliente_id, logradouro, numero, bairro, cidade, uf, cep, principal
- `cliente_creditos`: id, cliente_id, limite, saldo_utilizado, status
- `cliente_historico`: id, cliente_id, tipo_evento, referencia_id, descricao, created_at
- `cliente_contatos`: id, cliente_id, nome, telefone, whatsapp

### APIs previstas

- `GET /api/clientes/:id/historico`
- `GET /api/clientes/:id/compras`
- `POST /api/clientes/:id/credito`
- `POST /api/clientes/:id/endereco`
- `PUT /api/clientes/:id`

### Arquivos backend previstos

- manter `clienteController.js` e `clienteService.js`, expandindo o dominio
- opcional se crescer demais: separar em `clienteFinanceiroService.js`

### Telas e fluxos frontend

- ficha completa do cliente
- historico de compras
- limite e saldo de credito
- enderecos
- observacoes comerciais

### Regras de negocio

- venda comum continua podendo ser sem cliente
- cliente identificado precisa ter historico consolidado
- credito de cliente precisa respeitar limite e aprovacao
- toda venda vinculada precisa aparecer na ficha do cliente

### Marco de entrega

- ficha completa do cliente
- historico de compras
- credito controlado
- relatorio de clientes mais ativos

## Fase 7 - Multiempresa real e permissoes

### Objetivo

Sair da preparacao basica por `empresa_id` e entrar em operacao real com isolamento de dados, perfis e permissoes.

### Tabelas e ajustes de banco

- expandir `empresas`
- criar `filiais` se o produto pedir operacao separada por loja
- criar `perfis`
- criar `permissoes`
- criar `perfil_permissoes`
- criar `usuario_perfis`
- criar `auditoria_eventos`

### Estrutura sugerida

- `perfis`: id, empresa_id, nome, descricao
- `permissoes`: id, codigo, descricao
- `perfil_permissoes`: perfil_id, permissao_id
- `usuario_perfis`: usuario_id, perfil_id
- `auditoria_eventos`: id, empresa_id, usuario_id, modulo, acao, entidade, entidade_id, payload, created_at

### APIs previstas

- `GET /api/empresas`
- `POST /api/empresas`
- `GET /api/usuarios`
- `POST /api/usuarios`
- `GET /api/perfis`
- `POST /api/perfis`
- `PUT /api/usuarios/:id/perfis`
- `GET /api/auditoria`

### Arquivos backend previstos

- `backend/src/controllers/empresaController.js`
- `backend/src/routes/empresaRoutes.js`
- `backend/src/services/empresaService.js`
- `backend/src/controllers/permissaoController.js`
- `backend/src/routes/permissaoRoutes.js`
- `backend/src/services/permissaoService.js`

### Telas e fluxos frontend

- cadastro de empresas
- usuarios e perfis
- matriz de permissao
- auditoria por modulo

### Regras de negocio

- nenhum usuario pode ver dados de outra empresa
- toda consulta precisa sair filtrada por empresa
- a permissao precisa existir no backend e nao so no menu do frontend
- eventos criticos precisam ficar auditados

### Marco de entrega

- usuarios com perfis
- acessos controlados por modulo e acao
- auditoria de operacoes criticas
- base pronta para SaaS real

## Ordem de implementacao recomendada

1. Passo zero
2. Fase 1
3. Fase 2
4. Fase 3
5. Fase 4
6. Fase 5
7. Fase 6
8. Fase 7

## Sugestao pratica de entregas

### Entrega A

- passo zero
- fase 1 completa

### Entrega B

- fase 2
- fase 3

### Entrega C

- fase 4
- fase 5

### Entrega D

- fase 6
- fase 7

## Proximo passo sugerido

Se a meta e comecar a aproximar o sistema da operacao real agora, a primeira implementacao deve ser:

1. migracoes de banco
2. abertura e fechamento de caixa
3. sangria e suprimento
4. vincular toda venda a uma sessao de caixa
5. resumo de fechamento por forma de pagamento

Esse conjunto muda o projeto de "PDV que vende" para "caixa operacional de mercado".
