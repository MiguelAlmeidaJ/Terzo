# Terzo — arquitetura do monorepo

## Estrutura

```text
apps/
  api/                 # NestJS: sessão, documentos, permissões e Nextcloud
  web/                 # Next.js App Router + React/TypeScript
packages/
  database/            # Prisma 7, migrações, adaptador PostgreSQL e tipos
    prisma/
      schema.prisma
      migrations/
scripts/               # Backup, verificações e migração Nextcloud
docker-compose.yml     # Apenas PostgreSQL
ecosystem.config.cjs    # PM2, independente do proxy reverso externo
pnpm-workspace.yaml
pnpm-lock.yaml
```

## Desenvolvimento (Node 22+)

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

A interface usa a porta 3000 e a API a 3001. O Next.js encaminha `/api`, `/_blob`, `/brand` e `/healthz` ao `API_INTERNAL_URL`. Não há configuração de Nginx no repositório: ajuste seu próprio proxy reverso para o frontend.

## Comandos

| Comando | Função |
| --- | --- |
| `pnpm dev` | Banco gerado/compilado, web e API em watch |
| `pnpm typecheck` | Tipagem dos três workspaces |
| `pnpm test` | Testes de API e armazenamento |
| `pnpm build` | Build do pacote Prisma, API e web |
| `pnpm db:generate` | Gera client Prisma |
| `pnpm db:migrate` | Aplica migrations existentes |
| `pnpm db:backup` | Backup do PostgreSQL |
| `pnpm verify:storage` | Smoke test de integração do Nextcloud |
| `pnpm pm2:reload` | Reinicia PM2 sem depender de Nginx |

## Migração do checkout antigo

1. Salve o `.env` e faça backup completo de `data/` e PostgreSQL.
2. Encerre processos Node/Next em execução; no Windows, arquivos SWC podem ficar travados.
3. `git switch monorepo`, `corepack enable`, `pnpm install --frozen-lockfile`.
4. `pnpm db:generate`, `pnpm db:migrate`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
5. Configure o proxy externo e verifique autenticação, permissões, rotas e Nextcloud.
6. Não execute `npm ci` nem recrie o banco: as migrations históricas foram preservadas.

O monorepo também substitui a UI legada por uma interface React inicial, não equivalente a todos os fluxos do CRM HTML anterior. Não promover para produção sem homologação completa.
