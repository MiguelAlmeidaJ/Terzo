# Terzo

Monorepo pnpm da Agência Terceiro Andar: **Next.js 16 + React 19**, **NestJS 11** e **Prisma 7 + PostgreSQL**. Arquivos e pastas de clientes integram-se ao Nextcloud via WebDAV.

> **Status:** a branch monorepo está em homologação. A interface React inicial ainda não reproduz todos os fluxos avançados do CRM legado. Não fazer merge em produção sem teste funcional.

## Estrutura

~~~text
apps/
  web/                  Next.js App Router + TypeScript
  api/                  NestJS: autenticação, documentos, Nextcloud
    assets/brand.png    Marca institucional
    rules.json          Políticas de acesso
packages/
  database/
    prisma/             Schema e migrations SQL preservadas
    src/                API pública @terzo/database
    prisma.config.ts
scripts/                Backup, manutenção e testes de integração
docs/                   Arquitetura e histórico de etapas
docker-compose.yml      PostgreSQL
ecosystem.config.cjs    PM2 (sem dependência de Nginx)
pnpm-workspace.yaml
pnpm-lock.yaml
~~~

O Prisma é um pacote interno compilado separadamente e usado pela API.

## Requisitos

Node.js 22+, Corepack e pnpm 10.19.0. Docker Compose para PostgreSQL local. Seu proxy reverso externo pode ser utilizado sem qualquer Nginx no repositório.

## Instalação

~~~bash
corepack enable
pnpm install --frozen-lockfile
~~~

Copie .env.example para .env e configure as credenciais. **Nunca versione o .env.**

~~~bash
docker compose up -d postgres
pnpm db:migrate
pnpm dev
~~~

Web: http://localhost:3000 · API: http://localhost:3001 · Saúde: http://localhost:3000/healthz

O Next.js encaminha /api, /_blob, /brand e /healthz para API_INTERNAL_URL. Seu proxy externo deve encaminhar tráfego para o frontend Next.js na porta 3000 e preservar cookies e cabeçalhos adequados. Não exponha a porta da API diretamente à internet.

## Comandos principais

| Comando | Descrição |
| --- | --- |
| pnpm dev | Inicia API e web (gerando e compilando Prisma) |
| pnpm typecheck | Verifica todos os workspaces |
| pnpm test | Executa regressões da API e do Nextcloud simulado |
| pnpm build | Compila Prisma, API e Next.js |
| pnpm db:generate | Gera o cliente Prisma |
| pnpm db:migrate | Aplica migrations existentes |
| pnpm db:backup | Cria backup validado do PostgreSQL |
| pnpm verify:local | Smoke test com Chrome |
| pnpm verify:storage | Smoke test real do Nextcloud |
| pnpm nextcloud:reconcile:dry | Simula reconciliação do Nextcloud |
| pnpm nextcloud:reconcile | Reconcilia objetos pendentes |
| pnpm nextcloud:verify | Inspeciona vínculos e integridade |
| pnpm pm2:reload | Reinicia serviços pelo PM2 |

Para desenvolver o schema, use pnpm --filter @terzo/database migrate:dev. Faça backup antes de executar qualquer migration com dados reais.

## Operação

~~~bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
pnpm pm2:reload
~~~

A API roda de apps/api/dist/main.js e o frontend é iniciado pelo Next.js do seu workspace. DATA_DIR mantém o diretório de arquivos persistentes; o banco continua em PostgreSQL. As migrations SQL não foram removidas ou redefinidas nesta migração.

### Nextcloud

Ative NEXTCLOUD_ENABLED e configure NEXTCLOUD_URL, NEXTCLOUD_USERNAME, NEXTCLOUD_USER_ID e NEXTCLOUD_APP_PASSWORD no .env. Credenciais WebDAV ficam apenas no servidor. Os vínculos cliente/pasta, migrations e mecanismos de reconciliação permanecem na API e no package database.

## Mudança em relação à versão anterior

Foram removidos src/base.html, src/build.py, src/modulos/crm_*.js, a pasta pública legacy, o runtime JavaScript antigo, deploy/nginx.conf e package-lock.json.

A nova interface React oferece login, alteração de senha, painel de módulos, cadastro básico e gerenciamento de usuários. **Fluxos complexos de planejamento, criativos e produção ainda precisam de reimplementação específica para atingir a paridade com o CRM legado.** Não use a branch como substituição imediata da instalação de produção.

Consulte [o guia do monorepo](docs/monorepo.md) e mantenha o PR de refatoração separado da main até a homologação.
