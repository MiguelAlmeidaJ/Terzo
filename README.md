# Terzo Self-host

Refatoração inicial do Terzo para uma arquitetura TypeScript separada, preservando as telas, as regras de negócio e o contrato da aplicação existente.

## Arquitetura

- `web/`: Next.js 16 + TypeScript, Tailwind CSS e React Icons.
- `api/`: NestJS + TypeScript, Prisma e PostgreSQL.
- `prisma.config.ts`: configuração central do Prisma CLI e da conexão usada nas migrations.
- `ecosystem.config.cjs`: execução do `web` e da `api` com PM2.
- `docker-compose.yml`: PostgreSQL, o único serviço mantido no Docker.
- `web/public/legacy/`: interface atual preservada durante a migração gradual para componentes React.
- `export/`: diretório local e ignorado pelo Git para importações privadas; nunca envie dados reais ao repositório.

O Next atua como a entrada única em `http://localhost:3000`, protege as páginas e encaminha `/api`, `/_blob` e `/healthz` para o Nest. PostgreSQL é a única fonte de dados da aplicação, acessada exclusivamente pela API NestJS através do Prisma; não existe fallback SQLite ou persistência de dados de negócio no navegador.

## Produção: PostgreSQL no Docker e aplicação no PM2

```bash
cp .env.example .env
# Edite POSTGRES_PASSWORD e DATABASE_URL com a mesma senha.
docker compose up -d postgres

npm ci
npm run prisma:deploy:local
npm run build

sudo npm install -g pm2
npm run pm2:start
pm2 save
pm2 startup
```

O comando `pm2 startup` imprime uma instrução com `sudo`; execute-a e rode `pm2 save` novamente. O web fica em `127.0.0.1:3000`, a API em `127.0.0.1:3001` e o PostgreSQL em `127.0.0.1:5432`.

Para acompanhar os processos:

```bash
pm2 status
npm run pm2:logs
docker compose logs -f postgres
```

Para gerar um backup validado do PostgreSQL e da cópia local de segurança dos anexos:

```bash
BACKUP_DIR=/var/backups/terzo npm run db:backup
```

O backup usa o formato customizado do `pg_dump`, valida o arquivo com `pg_restore --list` e mantém os 30 backups mais recentes.

Ao trocar `POSTGRES_PASSWORD`, mantenha a mesma senha — com URL encoding — em `DATABASE_URL` e sincronize o papel existente antes de migrar:

```bash
npm run db:sync-password
docker compose up -d --force-recreate postgres
npm run db:migrate
npm run pm2:reload
```

O Nginx deve encaminhar o domínio para `127.0.0.1:3000`; há um exemplo em `deploy/nginx.conf`.

### Arquivos no Nextcloud

O backend armazena imagens, vídeos, anexos e a logo no Nextcloud via WebDAV, sem expor credenciais no navegador. Crie uma senha de aplicativo no Nextcloud e configure no `.env`:

```env
NEXTCLOUD_ENABLED=true
NEXTCLOUD_URL=https://cloud.exemplo.com
NEXTCLOUD_USERNAME=usuario
NEXTCLOUD_USER_ID=usuario
NEXTCLOUD_APP_PASSWORD=senha_de_aplicativo
NEXTCLOUD_BASE_PATH="ARQUIVOS CLIENTES"
NEXTCLOUD_SYSTEM_FOLDER="TERCEIRO ANDAR"
```

Para copiar os arquivos existentes e a logo, mantendo a cópia local como fallback:

```bash
npm run nextcloud:migrate
npm run build
npm run pm2:reload
```

O migrador lê as pastas já existentes dentro de `ARQUIVOS CLIENTES`, cria vínculos persistentes no PostgreSQL e não cria novas pastas de clientes. Arquivos internos e a logo do sistema usam a pasta existente configurada em `NEXTCLOUD_SYSTEM_FOLDER`. Todo upload mantém uma cópia local atômica; quando o Nextcloud está indisponível, o arquivo fica pendente e é enviado pela reconciliação posterior.

Operação e diagnóstico:

```bash
npm run nextcloud:reconcile:dry  # relatório sem alterações
npm run nextcloud:reconcile      # verifica e corrige vínculos/arquivos
npm run nextcloud:verify         # probe WebDAV isolado
npm run verify:storage           # upload/download autenticado pela API
```

Timeouts, retentativas e intervalo da reconciliação são configuráveis pelas variáveis `NEXTCLOUD_*` documentadas em `.env.example`. Detalhes do modelo, estados e endpoints administrativos estão em `docs/fase-2-nextcloud.md`.

### Atualizações

```bash
bash deploy/update-pm2.sh
```

Esse script instala dependências, aplica migrations, regenera a interface legada, compila API/web e recarrega os processos sem recriar o PostgreSQL. Mudanças no frontend exigem ao menos `npm run build` e `npm run pm2:reload`; somente reiniciar um build antigo não atualiza os arquivos.

### Migração da instalação anterior em Docker

Antes de remover o container antigo da API, copie os uploads do volume para o diretório usado pelo PM2:

```bash
mkdir -p data
docker cp terzo-api:/data/. ./data/
docker compose down --remove-orphans
docker compose up -d postgres
bash deploy/update-pm2.sh
```

Não use `docker compose down -v`: o parâmetro `-v` apagaria o banco PostgreSQL. Depois de validar os uploads em `./data` e o novo ambiente, o volume antigo `asset_data` pode ser removido manualmente.

## Banco e Prisma

O projeto usa Prisma 7 com `prisma-client`, `@prisma/adapter-pg` e a URL de migrations em `prisma.config.ts`. O `schema.prisma` contém somente o provider PostgreSQL; o client é gerado em `api/src/generated/prisma/`, permanece fora do Git e é recriado automaticamente antes de iniciar, validar ou compilar a API.

Com os serviços no ar, a importação original pode ser executada de forma idempotente:

```bash
npm run cli --workspace api -- import ../export/terzo-dados.json
```

Criar um administrador local:

```bash
npm run cli --workspace api -- create-admin \
  --username admin \
  --name "Administrador local"
```

Sem `--password`, o comando gera uma senha provisória e exige a troca no primeiro acesso. Para desenvolvimento, é possível informar `--password` com pelo menos 10 caracteres.

## Desenvolvimento sem Docker

Requer Node.js 22+ e PostgreSQL disponível:

```bash
npm install
npm run prisma:generate
npm run dev --workspace api
npm run dev --workspace web
```

Variáveis principais estão em `.env.example`. O `ecosystem.config.cjs` lê `.env` diretamente e usa `API_PORT` e `WEB_PORT` para evitar conflito com a variável `PORT` da aplicação antiga.

## Validações

```bash
npm run typecheck
npm run build
curl http://localhost:3000/healthz
```

## Estratégia da refatoração

Esta etapa troca a infraestrutura sem redesenhar a aplicação. A interface original continua intacta dentro do Next para reduzir regressões. Nas próximas etapas, cada módulo pode ser convertido gradualmente para componentes React/TypeScript e classes Tailwind, usando React Icons, enquanto o contrato do Nest e os dados no PostgreSQL permanecem estáveis.
