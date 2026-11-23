# Logins individuais e fotos de perfil no PostgreSQL

## 1. Designers, líderes e integrantes

A autenticação de usuário/senha do Terzo já está implementada em NestJS, com hash **scrypt**, sessões HTTP-only, expiração por inatividade, proteção contra tentativas repetidas e senha provisória com troca obrigatória.

O fluxo agora é acessível diretamente a partir da Equipe:

1. Em **Equipe → Pessoas**, cadastre a pessoa (nome, função e área).
2. Clique em **Criar login** na ficha da pessoa ou em **Equipe → Gerenciamento de usuários → Criar login / gerenciar senhas**.
3. Na página **Logins do Terzo**, a pessoa pode vir pré-selecionada. Informe usuário e e-mail.
4. Para **Designer** ou **Líder**, deixe o papel do servidor como **Integrante**. O papel profissional é definido em **Gerenciamento de usuários** no módulo Equipe.
5. Gere a senha provisória. Ela será exibida uma única vez: compartilhe-a por um canal privado, nunca em captura ou log.
6. A pessoa entra em `/login`, troca obrigatoriamente a senha e passa a ter o acesso configurado.

O administrador pode **redefinir a senha** e **revogar sessões**, além de desativar o usuário. O próprio integrante pode usar a opção **Alterar Minha Senha** no menu da conta.

A API impede associar o mesmo cadastro a duas contas, vincular cadastros desativados ou vincular cadastros inexistentes.

## 2. Foto de perfil: sem Nextcloud

Cada conta Terzo tem uma foto opcional, guardada diretamente em **PostgreSQL** na tabela `user_profile_photos`, campo binário `BYTEA`.

| Regra | Implementação |
| --- | --- |
| Armazenamento | PostgreSQL, nunca WebDAV/Nextcloud |
| Quantidade | 1 linha por usuário (`user_id` como chave primária) |
| Atualização | `upsert` sobrescreve os bytes existentes, sem acumular versões |
| Exclusão | DELETE remove a única linha e seu conteúdo binário |
| Remoção da conta | `ON DELETE CASCADE` remove a foto |
| Formato | JPEG (o navegador aceita JPG, PNG ou WEBP e converte para JPEG) |
| Dimensões | 360×360 após corte quadrado no navegador |
| Tamanho | 512 KB no máximo, verificado pelo servidor e pelo banco |
| Alteração | Somente o titular da conta autenticada |
| Visualização | Pessoas autenticadas com acesso à Equipe |
| Caching | `Cache-Control: private, no-store` |

### Como adicionar

Entre no Terzo, clique na própria imagem/nome e abra **Meu Perfil → Trocar / adicionar foto**. Selecione JPG, PNG ou WEBP. A aplicação centraliza, corta, otimiza e grava a foto. Ela passa a aparecer no perfil, cabeçalho, equipe e onde os avatares de integrantes são utilizados.

Ao enviar outra foto, o PostgreSQL atualiza **a mesma linha**, substituindo a anterior em vez de criar um segundo arquivo. O usuário também pode clicar **Remover foto**; volta a aparecer o avatar com iniciais.

O envio utiliza exclusivamente `POST /api/profile-photo` e a leitura autenticada `GET /api/profile-photo/member/:memberId` (ou `GET /api/profile-photo/me`). Nenhuma dessas operações chama o serviço de arquivos do Nextcloud.

## 3. Atenção a fotos legadas

Antes dessa implementação, algumas fotos eram referenciadas por `members.photoId` e armazenadas junto aos anexos via Nextcloud ou blobs locais. **Esta migration não exclui automaticamente os arquivos históricos** porque poderiam estar referenciados em outros documentos e a exclusão sem auditoria poderia causar perda de dados. Os novos avatares deixam de apontar para esses IDs; cada usuário deverá cadastrar sua nova foto no banco.

Se necessário, faça inventário e limpeza controlada desses ativos históricos após backup, verificando referências antes de remover algo do Nextcloud. Os **novos envios e futuras substituições** não acumulam cópias.

## 4. Homologação no Windows

Esta branch foi criada **sobre o PR #9 de calendário**, e portanto contém suas mudanças ainda não integradas à `main`. Não faça merge antes de testar a sequência dos PRs.

```powershell
git fetch origin
git switch -c teste-acessos --track origin/feat/usuarios-login-foto-postgres
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm db:migrate
pnpm dev
```

**Faça backup do PostgreSQL antes de executar `pnpm db:migrate`.** Teste primeiro com dados de homologação.

### Checklist

- [ ] Administrador cria um login vinculado a designer com senha provisória.
- [ ] Integrante entra com usuário/senha e é obrigado a trocar a senha na primeira sessão.
- [ ] Designer vê os módulos permitidos; Líder vê as funcionalidades autorizadas; administrador continua administrando a Equipe.
- [ ] Não é possível vincular dois logins à mesma pessoa.
- [ ] Senha redefinida invalida sessões antigas.
- [ ] Foto JPEG/PNG/WEBP é transformada, salva e exibida no perfil e no cabeçalho.
- [ ] Uma segunda foto substitui a primeira; a tabela continua com uma única linha para o usuário.
- [ ] Foto de usuário A não pode ser atualizada ou apagada pelo usuário B.
- [ ] Excluir foto a remove do PostgreSQL e mostra as iniciais.
- [ ] Perfil e login continuam funcionando com `NEXTCLOUD_ENABLED=false`.
- [ ] Nenhuma foto de perfil nova é enviada para a pasta de arquivos do Nextcloud.
- [ ] A foto permanece após atualização da página e novo login.

A CI executa testes automatizados de tipo, autorização, substituição dos bytes e cadastro de acesso. Isso não substitui a homologação com PostgreSQL e navegadores reais.
