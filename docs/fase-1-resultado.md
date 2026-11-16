# Fase 1 — Resultado da validação

Validação executada em 16/11/2026 sobre PostgreSQL, PM2 e Nextcloud configurados localmente.

## Automatizado

Os testes cobrem:

- isolamento de usuários sem vínculo;
- escrita em coleções sensíveis;
- atualização limitada do próprio integrante;
- bloqueio de contas e encerramento de eventos em tempo real;
- limite de entrada antes da verificação de senha;
- autorização de anexos pelo proprietário, administrador ou documento legível;
- bloqueio do compartilhamento indireto de assets privados;
- bloqueio administrativo das rotas de armazenamento;
- rejeição de associação de upload a cliente inexistente;
- fallback local e timeout WebDAV.

## Integração real

O comando `npm run verify:storage` confirmou através da API Nest em execução:

- download sem autenticação bloqueado;
- escrita `cross-site` bloqueada;
- SVG bloqueado;
- upload PNG autenticado e vinculado a cliente;
- persistência do estado `synced`, caminho e cliente no PostgreSQL;
- download byte a byte do mesmo arquivo;
- monitoramento administrativo em estado saudável;
- exclusão do asset no banco, cópia local e Nextcloud.

O comando `npm run verify:local` confirmou carregamento da aplicação, usuário autenticado, ausência de erros no navegador e sincronização em tempo real.

## Limite remanescente

As regras atuais oferecem isolamento básico por conta, documento pessoal e referência autorizada de arquivo. ACL detalhada por carteira, cliente e responsável para todos os módulos continua sendo evolução funcional futura, conforme registrado no checklist original.
