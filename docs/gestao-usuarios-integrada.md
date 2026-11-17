# Gestão de usuários integrada à Equipe

O login, e-mail, senha provisória, vínculo e manutenção de contas foram centralizados em **Equipe → Gerenciamento de usuários**, sem navegação obrigatória para a antiga página `/admin`.

## Criar integrante e acesso na mesma operação

Ao cadastrar uma pessoa em **Equipe → + Cadastrar integrante**, um administrador autorizado grava **dois registros em uma única transação do PostgreSQL**: o cadastro profissional `members` e a conta individual `users`. Se a operação falhar, não deve sobrar uma conta sem cadastro ou um cadastro sem login.

O sistema deriva os dados de acesso do nome completo, removendo acentos e normalizando espaços:

| Nome cadastrado | Usuário | E-mail corporativo |
| --- | --- | --- |
| Gabriella Firmino | `gabriella.firmino` | `gabriella.firmino@terceiroandar.com.br` |
| João da Conceição | `joao.da.conceicao` | `joao.da.conceicao@terceiroandar.com.br` |
| Gabriella Firmino (segundo cadastro) | `gabriella.firmino.2` | `gabriella.firmino.2@terceiroandar.com.br` |

Se um login já existir, ele **não é sobrescrito**. O novo login recebe um sufixo numérico, mantendo o endereço de e-mail consistente.

O usuário recebe uma **senha provisória aleatória e exclusiva**, que aparece **somente na confirmação da criação**. Não há envio automático por e-mail. A senha no banco é armazenada com hash scrypt e a pessoa **deve trocá-la no primeiro login**.

### Designer, líder e administrador

- Designers e líderes têm papel `member` na autenticação do servidor, com permissões profissionais controladas na Equipe.
- Apenas o proprietário pode criar um perfil de administração do servidor por meio da criação automática.
- Editar dados profissionais da pessoa (área, função etc.) não substitui nem redefine automaticamente o login existente.
- As regras de autorização efetivas continuam no servidor.

## Criar contas dos integrantes antigos

Na aba **Gerenciamento de usuários**, clique em **Criar acessos pendentes (N)**. Antes de criar os logins, o Terzo apresenta a relação de pessoas e os endereços previstos para confirmação.

A API recebe os IDs selecionados e consulta os registros atuais no PostgreSQL. Cada pessoa é processada em uma transação independente. Se uma conta já estiver vinculada ou o cadastro estiver desativado, ela será ignorada — não será substituída. O resultado mostra:

- Usuário, e-mail e senha provisória dos novos acessos, para cópia única.
- Cadastros pulados, com motivo.

É possível gerar o acesso de apenas uma pessoa pelo botão **Criar acesso** na linha dela. **Não é necessário criar ou vincular manualmente 11 contas na tela de administração.**

## Editar usuários existentes

Na mesma tabela, cada conta oferece:

- **Editar login:** alterar nome, usuário, e-mail corporativo e cadastro vinculado, sem excluir a conta, suas sessões históricas ou seus registros.
- **Nova senha:** revoga as sessões existentes e apresenta uma senha provisória exclusiva que deve ser trocada no primeiro acesso.
- **Revogar sessões:** encerra as sessões abertas.
- **Desativar/Reativar:** sincroniza o estado do login e do cadastro profissional.
- **Desvincular:** separa uma conta do cadastro profissional sem apagá-la.

O administrador não pode desativar ou desvincular a si próprio nessas ações.

A alteração do nome ou e-mail de uma conta vinculada é refletida também na ficha da Equipe.

## Banco de dados e integridade

Uma migration adiciona um índice único **parcial** sobre `users.member_id` quando o campo não está vazio. Assim, contas administrativas sem vínculo podem continuar existindo, mas um integrante não pode receber dois logins ativos associados ao mesmo `member_id`.

**Antes de aplicar em PostgreSQL existente, confira duplicidades antigas:**

```sql
SELECT member_id, COUNT(*) AS contas
FROM users
WHERE member_id <> ''
GROUP BY member_id
HAVING COUNT(*) > 1;
```

A consulta deve retornar zero linhas. Se houver duplicidade, investigue e corrija os vínculos antes da migration. **Não exclua contas antigas automaticamente.**

A migration é aditiva: não altera ou apaga as informações de clientes, calendário, criativos, sessões ou fotos de perfil. As imagens de perfil continuam na tabela binária do PostgreSQL, fora do Nextcloud.

## Homologação local

Esta entrega é um PR empilhado sobre o PR de fotos de perfil, que por sua vez depende do PR do calendário. Não integre diretamente à `main` antes de testar a sequência de mudanças.

```powershell
git fetch origin
git switch -c teste-gestao-usuarios --track origin/feat/gestao-usuarios-equipe-integrada
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm db:migrate
pnpm dev
```

Faça backup do PostgreSQL antes de executar `pnpm db:migrate`. Não reutilize contas ou dados de produção nas primeiras validações.

### Checklist

- [ ] Um novo integrante recebe login, e-mail `@terceiroandar.com.br` e senha na mesma criação.
- [ ] Nome com acentos gera um identificador válido.
- [ ] Dois nomes idênticos geram usuários diferentes, sem alterar o primeiro.
- [ ] Um usuário loga com a senha provisória e a troca antes de acessar os módulos.
- [ ] Criar acesso dos 11 integrantes antigos não altera os dois acessos existentes.
- [ ] Contas já vinculadas e cadastros desativados são ignorados no provisionamento.
- [ ] O resumo em lote mostra as credenciais somente uma vez e não as registra em logs.
- [ ] É possível editar login, nome e e-mail diretamente na aba Gerenciamento de usuários.
- [ ] A redefinição de senha invalida sessões antigas.
- [ ] Ações de desativação e reativação refletem o bloqueio no servidor.
- [ ] Um usuário comum não pode gerar acessos.
- [ ] A nova foto de perfil no PostgreSQL continua funcionando.
- [ ] A migration parcial é aplicada após a verificação de duplicidades.
