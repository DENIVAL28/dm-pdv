# Colaboracao no DM PDV

Este projeto usa um fluxo simples para evitar conflito entre duas pessoas trabalhando ao mesmo tempo.

## Branches

- `main`: versao estavel
- `develop`: integracao das mudancas em andamento
- `feat/<nome-curto>`: novas funcionalidades
- `fix/<nome-curto>`: correcoes
- `chore/<nome-curto>`: ajustes tecnicos, docs e manutencao

## Regra de trabalho

1. Nunca desenvolva direto em `main`.
2. No dia a dia, cada tarefa sai de `develop`.
3. Cada pessoa trabalha na propria branch.
4. Ao terminar, abre PR para `develop`.
5. `main` recebe merge apenas quando a rodada estiver validada.

## Fluxo recomendado

Atualizar base local:

```bash
git checkout develop
git pull origin develop
```

Criar uma branch para a tarefa:

```bash
git checkout -b feat/nome-da-tarefa
```

Salvar as mudancas:

```bash
git add .
git commit -m "feat: descricao curta"
git push -u origin feat/nome-da-tarefa
```

## Como nao se atropelar

- Antes de começar, alinhem qual modulo cada um vai mexer.
- Evitem duas pessoas alterando o mesmo arquivo no mesmo momento.
- Se a tarefa for grande, dividam por camada:
  - uma pessoa no frontend
  - outra no backend ou banco
- Se precisarem mexer no mesmo fluxo, combinem a ordem:
  - primeiro API e banco
  - depois integracao no frontend

## Padrao de nomes de branch

- `feat/pdv-leitura-codigo`
- `feat/clientes-cadastro`
- `fix/erro-login`
- `chore/ajuste-readme`

## Antes de abrir PR

- Rode o frontend:

```bash
cd frontend
npm run build
```

- Verifique se o backend sobe sem erro:

```bash
cd backend
npm run dev
```

- Se houve mudanca de banco, atualize o `README.md` e os scripts necessarios.

## Merge para main

Use este caminho:

1. PRs entram em `develop`
2. Validacao local
3. Merge de `develop` para `main`
4. Publicacao da versao estavel
