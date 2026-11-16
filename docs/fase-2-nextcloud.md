# Fase 2 — Nextcloud

## Modelo persistente

- `client_storage_bindings` mantém a associação estável entre o ID interno do cliente e a pasta existente no Nextcloud.
- A associação não muda quando o nome do cliente muda.
- Pastas de clientes nunca são criadas automaticamente. Correspondências não encontradas ficam no relatório para vinculação administrativa.
- Cada asset registra cliente, caminho remoto, ETag, estado, último erro e última verificação.

Estados de asset: `local`, `pending`, `synced`, `missing` e `error`.

## Resiliência

Todo upload é gravado primeiro de forma atômica em `data/blobs`. Se o Nextcloud estiver indisponível, a API aceita o upload como `pending`; a reconciliação posterior envia a cópia local. Downloads tentam o Nextcloud e usam a cópia local quando necessário.

Timeouts e retentativas são configurados pelas variáveis `NEXTCLOUD_*_TIMEOUT_MS`, `NEXTCLOUD_RETRIES` e `NEXTCLOUD_RECONCILE_INTERVAL_MINUTES`.

## Operação

```bash
# Somente relatório; não altera banco nem arquivos
npm run nextcloud:reconcile:dry

# Persiste vínculos, verifica e corrige assets
npm run nextcloud:reconcile

# Upload + download + exclusão de um probe isolado
npm run nextcloud:verify

# Teste completo através da API autenticada
npm run verify:storage
```

A API administrativa oferece:

- `GET /api/admin/storage/status`
- `GET /api/admin/storage/bindings`
- `PUT /api/admin/storage/bindings/:clientId`
- `DELETE /api/admin/storage/bindings/:clientId`
- `POST /api/admin/storage/reconcile`
- `POST /api/admin/storage/probe`

Todas essas rotas exigem perfil administrativo e a proteção CSRF normal da API.

## Monitoramento

O status administrativo reúne contadores de requisições, erros, timeouts, retentativas, bytes e estados dos assets/vínculos. `/healthz` publica somente `enabled` e o estado resumido, sem caminhos ou credenciais. Cada reconciliação efetiva gera auditoria no PostgreSQL e log estruturado.

## Resultado da migração inicial

- 20 vínculos persistidos e verificados.
- 17 assets remotos verificados, sem ausências ou erros.
- `Nível3`, `Licita` e `Otimize` continuam sem vínculo porque não existe correspondência segura entre seus nomes e as pastas atuais.
