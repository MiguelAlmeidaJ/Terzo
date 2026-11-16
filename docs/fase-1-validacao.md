# Terzo — Fase 1: validação de segurança e confiabilidade

Esta etapa protege a API e os anexos sem alterar o esquema do banco. Execute a validação
em uma **instalação de teste** com cópia do PostgreSQL e, quando possível, um Nextcloud de teste.
Não utilize dados reais em commits, logs ou prints públicos.

## 1. Preparação

```bash
git fetch origin
git switch security/fase-1-hardening
npm ci
npm run typecheck
npm run test --workspace api
npm run build
```

Configure o `.env` local como descrito no README. A implantação da aplicação
pode ser feita com os processos PM2 existentes, após backup e validação dos builds.
Não é necessário criar novas migrations nesta fase.

## 2. Testes de autenticação e contas

- [ ] Proprietário e administrador entram, abrem a página de usuários e gerenciam contas.
- [ ] Integrante com vínculo válido entra e navega nos módulos autorizados.
- [ ] Integrante sem vínculo vê a solicitação de liberação, sem ler dados de clientes.
- [ ] Conta vinculada a cadastro desativado é bloqueada para APIs e anexos de negócio.
- [ ] Desativar um integrante encerra seu canal de atualizações em tempo real.
- [ ] Troca obrigatória de senha bloqueia acesso aos demais endpoints até a conclusão.
- [ ] Logout, expiração por inatividade e revogação de sessões funcionam.
- [ ] Login com entradas excessivas recebe falha controlada.

## 3. Testes de permissão por documento e arquivo

- [ ] Usuário sem permissão não modifica cadastro de outro integrante.
- [ ] Um integrante pode atualizar o próprio `lastSeen`, sem alterar nome, papel ou `admin`.
- [ ] Registros de acessos administrativos não podem ser alterados por usuários comuns.
- [ ] Documentos pessoais de outras contas não são retornados a integrantes.
- [ ] Arquivo recém-enviado pode ser aberto pelo autor.
- [ ] Arquivo vinculado a documento legível é aberto por integrante autorizado.
- [ ] Arquivo privado sem vínculo legível retorna HTTP 403 para outra conta.
- [ ] Colar o ID de arquivo privado em um novo documento não permite conceder acesso.
- [ ] Alterar um documento existente preserva referências legítimas já existentes.
- [ ] Upload de SVG recebe HTTP 415; PNG, JPEG, PDF e arquivos permitidos continuam funcionando.
- [ ] Operações de escrita com origem externa são rejeitadas; o uso normal pelo domínio do Terzo funciona.

## 4. Nextcloud

- [ ] Upload com `NEXTCLOUD_ENABLED=true` chega à pasta configurada.
- [ ] Download, prévia de PDF e reprodução de vídeo continuam funcionando.
- [ ] Falha ou ausência remota utiliza apenas uma cópia local já existente.
- [ ] Falhas WebDAV terminam com erro controlado, sem manter requisições indefinidamente.
- [ ] Credenciais de aplicativo não aparecem em respostas HTTP ou código do navegador.
- [ ] Registros de arquivos no PostgreSQL permanecem coerentes após testes de falha.

## 5. Limites desta etapa

A validação automática usa mocks de banco e WebDAV. Ela não substitui testes com
PostgreSQL, PM2, Nginx, Nextcloud e usuários reais no ambiente de homologação.

A etapa seguinte deve criar uma ACL de negócio detalhada para todos os módulos
(por exemplo: carteira de clientes, produção e aprovações), com regras de papel,
cliente e responsável implementadas no servidor. Hoje, a Fase 1 endurece os
recursos sensíveis e o isolamento básico sem reescrever todo o CRM legado.
