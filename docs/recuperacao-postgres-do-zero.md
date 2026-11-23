# Recuperação do Terzo após reinstalação do Windows (PostgreSQL no Docker)

Este roteiro recria **somente a infraestrutura e o esquema** do PostgreSQL. Não recupera registros apagados do disco antigo. O histórico do Git possui `docker-compose.yml` (PostgreSQL 17) e `scripts/backup.mjs` na branch `monorepo`; foram restaurados à branch de homologação.

## 0. Antes de começar

- Se ainda deseja uma tentativa de recuperação física do SSD, pare de gravar no disco e procure um profissional. Inicializar um volume novo pode sobrescrever setores do banco antigo.
- Nunca execute `docker compose down -v`, `docker volume rm`, `prisma migrate reset`, `prisma db push --force-reset`.
- Verifique no Docker Desktop se restaram containers/volumes antigos: `docker ps -a`, `docker volume ls`. Não delete nada que não tenha certeza ser descartável.
- A restauração de clientes e integrantes depende de uma **fonte real**: `export/terzo-dados.json`, um dump `*.dump`, CSV ou outros registros. O GitHub guarda código e migrations, não os registros que estavam apenas no volume perdido.

## 1. Preparar ambiente e senha

No PowerShell, no diretório `C:\Projetos\terzo-selfhost`:

```powershell
git fetch origin
git pull --ff-only origin feat/interface-gestao-usuarios
docker version
docker compose version
Test-Path .env
Test-Path docker-compose.yml
```

Se `.env` **não existir**, copie o exemplo:

```powershell
Copy-Item .env.example .env
```

Abra `.env` em um editor. Substitua `POSTGRES_PASSWORD` por uma senha longa aleatória e coloque a **mesma senha** na `DATABASE_URL`. Para evitar problemas de caracteres escapados em URLs, uma senha hexadecimal gerada por PowerShell é adequada:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24)).ToLower()
```

Valores de referência (substitua a senha por sua própria):

```dotenv
POSTGRES_DB=terzo
POSTGRES_USER=terzo
POSTGRES_PASSWORD=SENHA_HEXADECIMAL_AQUI
POSTGRES_PORT=5432
DATABASE_URL=postgresql://terzo:SENHA_HEXADECIMAL_AQUI@127.0.0.1:5432/terzo?schema=public
```

Não compartilhe `.env` ou senhas no chat e não versionar o arquivo. Para ambiente local sem HTTPS, confira `COOKIE_SECURE=false` e `TRUST_PROXY=0`; se houver HTTPS em produção, use valores compatíveis com seu proxy.

## 2. Criar container e migrations (sem inventar dados)

```powershell
docker compose up -d postgres
docker compose ps
docker exec terzo-postgres pg_isready -U terzo -d terzo
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
```

`db:migrate` aplica as migrations já existentes: esquema de autenticação, documentos, assets, aprovações e fotos de perfil. Ele não cria os clientes perdidos.

Verifique as tabelas e a quantidade atual de registros:

```powershell
docker exec terzo-postgres psql -U terzo -d terzo -c "SELECT coll, count(*) AS quantidade FROM docs GROUP BY coll ORDER BY coll;"
```

Se ainda estiver vazio, é esperado: ainda não importamos registros antigos.

## 3. Criar administrador inicial

Se a tabela `users` estiver vazia, crie **uma conta de proprietário**, sem expor senha na linha de comando:

```powershell
pnpm --filter @terzo/api cli create-admin --username admin --name "Administrador Terzo"
```

O CLI imprime uma senha provisória, que deve ser guardada privadamente; a pessoa a altera no primeiro login. Se um administrador já existir, **não crie outro**. Verifique com:

```powershell
docker exec terzo-postgres psql -U terzo -d terzo -c "SELECT username,role,status FROM users;"
```

## 4. Restaurar a base inicial se houver exportação

O CLI original preservado no projeto oferece `import` e usa, por padrão, um arquivo `export/terzo-dados.json`, com a estrutura `{ "collections": { "clients": { "id": { ... } }, "members": { ... } }, "assets": [...] }`.

Localize uma exportação real em `C:\Projetos`, `Windows.old`, OneDrive, anexos de conversas ou backups externos. Exemplo de busca no Windows:

```powershell
Get-ChildItem C:\Projetos,C:\Windows.old -Recurse -File -Force -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match 'terzo|crm|dados|export|backup' -and $_.Extension -in '.json','.sql','.dump','.backup','.csv' } |
  Select-Object FullName,Length,LastWriteTime
```

**Se encontrar `terzo-dados.json`:** primeiro abra e verifique que é realmente do Terzo, com coleções como `clients` e `members`. Depois, em um banco recém-criado, importe:

```powershell
pnpm --filter @terzo/api cli import "C:\CAMINHO\terzo-dados.json"
```

O importador faz `upsert` por `coll/id` e pode sobrescrever registros de IDs iguais. **Importe antes de começar a recadastrar dados novos**, ou preserve um backup e faça um plano de mesclagem. A importação de registros `docs` não restaura automaticamente contas `users`/hashes de senha: crie os logins novamente pela aba da Equipe. Arquivos físicos apontados em `assets` só serão importados se ainda estiverem disponíveis nos caminhos indicados.

Se encontrar `*.dump`, faça **outro procedimento** com `pg_restore` em uma instância separada, nunca importe o dump através do CLI JSON.

## 5. Serviços e cópias de segurança

Após restaurar os dados disponíveis:

```powershell
pnpm build
pnpm pm2:reload
pm2 status
pnpm db:backup
```

O backup grava um `data/backups/terzo-<data>.dump` validado por `pg_restore --list`. Esta pasta está dentro de `data/` e ignorada pelo Git.

**Copie backups também para um local externo ao computador** (OneDrive, NAS, outro computador ou disco removível). Guardar backups apenas no mesmo SSD do Docker não protege contra uma nova formatação. Periodicamente, teste restauração em um banco de homologação.

## 6. Dados iniciais não são dados de produção

A interface Terzo contém definições estáticas de serviços, objetivos e fluxo. Esses padrões podem ser recarregados pelo aplicativo, mas **não substituem os clientes, a equipe, calendários, tarefas e histórico que estavam no PostgreSQL**. Não há uma exportação dos dados reais versionada na branch atual.
