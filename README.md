# Terzo

Monorepo pnpm da Agência Terceiro Andar: **Next.js 16 + React 19**, **NestJS 11** e **Prisma 7 + PostgreSQL**. Arquivos e pastas de clientes integram-se ao Nextcloud via WebDAV.

> **Recuperação visual em homologação:** a branch `refactor/restore-original-ui` recupera o CRM original por uma camada temporária de compatibilidade dentro do monorepo. A API, Prisma, Nextcloud e pnpm continuam os mesmos. A conversão integral da UI para componentes React será uma etapa separada.

## Estrutura

~~~text
apps/
  web/                  Next.js App Router + TypeScript
    legacy-src/         Fontes originais do CRM, isolados do restante do monorepo
    public/legacy/      HTML estático gerado e páginas de login/admin originais
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

Node.js 22+, Corepack, pnpm 10.19.0 e Python 3.8+ (necessário para gerar a interface original). Docker Compose para PostgreSQL local. Seu proxy reverso externo pode ser utilizado sem qualquer Nginx no repositório.

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
| pnpm dev | Inicia API e web, gerando a interface original e o Prisma |
| pnpm typecheck | Verifica todos os workspaces |
| pnpm test | Executa regressões da API e do Nextcloud simulado |
| pnpm build | Compila Prisma, API e Next.js e gera o HTML original |
| pnpm db:generate | Gera o cliente Prisma |
| pnpm db:migrate | Aplica migrations existentes |
| pnpm db:backup | Cria backup validado do PostgreSQL |
| pnpm verify:local | Smoke test com Chrome da interface original |
| pnpm verify:storage | Smoke test real do Nextcloud |
| pnpm nextcloud:reconcile:dry | Simula reconciliação do Nextcloud |
| pnpm nextcloud:reconcile | Reconcilia objetos pendentes |
| pnpm nextcloud:verify | Inspeciona vínculos e integridade |
| pnpm pm2:reload | Reinicia serviços pelo PM2
| pnpm ui:generate | Regenera a interface original a partir dos fontes históricos |
| pnpm ui:verify | Testa rotas Next.js, autenticação e bloqueio do admin | |

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

## Recuperação da interface original

A branch de recuperação reintroduz os **fontes exatos do CRM anterior** em `apps/web/legacy-src`: `base.html`, `build.py` e os módulos `crm_*.js`. No início de `pnpm dev` ou `pnpm build`, o gerador cria `apps/web/public/legacy/index.html`, que não é versionado. O runtime de compatibilidade original continua conversando com a API NestJS/PostgreSQL/Nextcloud.

As URLs públicas seguem **iguais**: `/` (painel), `/login` e `/admin`. O proxy do Next.js valida a sessão para o painel e exige a função administrativa para `/admin`, inclusive quando uma página estática é requisitada diretamente em `/legacy/*`. O login permanece público.

Isso restaura a apresentação e a implementação de comportamentos existentes sem reescrever cada módulo. **Não significa que o HTML/JS antigo tenha sido convertido para React.** Essa substituição deve ser incremental, mantendo os fluxos e aparência aprovados, até remover a camada de compatibilidade com segurança.

**A estrutura pnpm e a separação de apps e packages são preservadas.** Não há configuração Nginx no repositório.

### Homologação no Windows

~~~powershell
git fetch origin
git switch -c teste-restauracao --track origin/refactor/restore-original-ui
corepack enable
py -3 --version
pnpm install --frozen-lockfile
pnpm architecture:check
pnpm typecheck
pnpm test
pnpm build
pnpm ui:verify
pnpm dev
~~~

Se o Windows não tiver `py`, instale Python 3 ou verifique `python --version`. O comando `pnpm ui:generate` procura `py -3`, `python` e `python3`.

Consulte [roteiro da restauração](docs/restauracao-interface-original.md) para a comparação visual, verificação das permissões e fluxos do Terzo.
