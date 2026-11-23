# Terzo — implantação das mudanças de 23/11 no Linux Manager

Referências: *Especificação das mudanças de 23/11 para o servidor* (Thiago Ihan) e *Guia visual de mudanças de 23/11*.

## O que entrou na branch main

- **Carteira:** editor de vídeo principal por cliente, além do designer já existente. Histórico de trocas `ownerHistory` mantido no JSONB `docs` do PostgreSQL, atribuído pela API ao usuário e relógio do servidor. As tabelas `client` e `member` sugeridas no documento **não existem** na arquitetura atual; não as crie.
- **Tarefas:** formulário ampliado, sugestões da carteira (não substituem edição local), editor secundário, encaminhamento único, busca sem acentos, participantes separados, urgência e prazo +2 dias úteis (sem finais de semana), histórico de executor e prazo.
- **Presença:** novas tabelas `presence_event`, `presence_current`, `presence_config`; status com motivo, almoço configurável (60 min), eventos gerados na API com timezone de negócio `America/Sao_Paulo`, painel gerencial e indicadores de horas. Complementa o Next Time; não substitui o ponto. **A especificação própria de presença, mencionada no documento, não foi incluída nos anexos**; o módulo necessita homologação das exceções e regras de fechamento diário.
- **Publicação:** status `Programado`, data programada, ator e confirmação manual de `Publicado`, alerta de programações vencidas em mais de duas horas (valor sugerido no documento, aguarda gestão). O mLabs continua externo.
- **Infraestrutura:** padrões `WEB_PORT=3003`, `API_PORT=4003`, `API_INTERNAL_URL=http://127.0.0.1:4003`; PM2 usa `next start` e o Next.js sem saída standalone. O Next.js lê o `.env` da raiz durante o build para preparar os rewrites.

## Antes de atualizar o servidor

1. Faça **backup verificado e externo** do banco em uso. Em Docker com container `terzo-postgres`: `pnpm db:backup`; em PostgreSQL externo use `pg_dump -Fc` com conexão autenticada. Não envie `.env` ao Git.
2. Faça também backup de `DATA_DIR` e dos arquivos do Nextcloud quando aplicável. Backup do PostgreSQL não inclui o conteúdo remoto do Nextcloud.
3. Confira a branch e mudanças locais: `git status`. Não sobrescreva alterações da máquina Linux. Se já houver migração manual pendente, revise antes.
4. Se o Linux Manager usa as portas 3003/4003, libere apenas a web no proxy reverso. Mantenha a API 4003 vinculada a `127.0.0.1`.

## Deploy no Linux

Na raiz do repositório do servidor, após preservar alterações locais:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
corepack enable
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
pnpm pm2:reload
pm2 status
curl -fsS http://127.0.0.1:4003/healthz
curl -fsS http://127.0.0.1:3003/healthz
```

No `.env` da raiz:

```dotenv
WEB_PORT=3003
API_PORT=4003
API_HOST=127.0.0.1
API_INTERNAL_URL=http://127.0.0.1:4003
```

A migração nova cria **somente** as tabelas de presença, sem remover colunas nem documentos históricos. `pnpm db:migrate` deve ser executado com o banco configurado no `DATABASE_URL` do ambiente certo. Para validar a migração:

```bash
pnpm --filter @terzo/database migrate:status
```

## Carga inicial da carteira — nunca automática

A planilha versionada em `docs/carteira-2026-11-23.csv` tem 24 linhas de clientes com responsáveis. A carga lê os IDs reais das coleções `clients` e `members`; preserva as demais propriedades e não sobrescreve um responsável diferente já definido. Se não localizar um nome, reporta sem atribuir IDs incorretos.

**Primeiro** crie o cadastro real de Bruno no Terzo (se ele não existir). O script não cria usuário nem integrante fictício. Os clientes **Mega Lanches, Wing e Restaurante Varanda** devem existir antes da carga; se faltarem, a execução padrão os reportará como ausentes e não os criará. A opção `--create-missing-clients` existe, mas use-a **somente com aprovação explícita da gestão**, pois um cliente criado assim não terá contrato e demais dados da conta.

Simular sem gravar:

```bash
pnpm db:build
node scripts/apply-portfolio-2026-11-23.mjs
```

Depois de validar o relatório com a gestão e efetuar **novo backup**:

```bash
node scripts/apply-portfolio-2026-11-23.mjs --apply
```

O script registra `ownerHistory` e marca a Puma Proteção Veicular como inativa, preservando seu registro. Para rever nomes não encontrados, confira acentos, abreviações e integrantes desativados. Nunca execute `--apply` sobre um banco diferente daquele cujo relatório foi aprovado.

## Homologação funcional

- Carteira: página de cliente, definir designer e editor principal, testar alteração permitida apenas à gestão; auditar `ownerHistory`.
- Nova tarefa: categoria e título; arte com designer; vídeo com editor; secundário sem alterar carteira; cliente sem profissional, opção desabilitada; urgência gera prazo inicial de dois dias úteis; troca de executor e prazo deixa histórico.
- Usabilidade: no desktop modal em 2 colunas, no celular 1; busca por nome sem acentos, listas em vez de chips para pessoas; anexos da tarefa antiga intactos.
- Presença: login online, pausa com motivo, almoço com cronômetro e atraso, término de expediente, painel da gestão, hoje/semana/30 dias; conferir com o documento específico de presença antes de considerar os saldos definitivos.
- Publicações: aprovação → programação com data/hora → publicação apenas após confirmação; post programado vencido +2h fica pendente. O intervalo requer aprovação da gestão.
- Regressão: clientes e tarefas anteriores sem perda de campos `requester` e `nivel`; fotos, autorização, chat, calendário, Nextcloud.

**Não execute** `prisma migrate reset`, `docker compose down -v` ou limpezas de volume.
