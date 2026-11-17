# Calendário editorial e Validação do Cliente

## 1. Dias semanais de postagem

Em **Clientes → Ficha → Editar cliente**, selecione os dias habituais de publicação usando os botões **SEG, TER, QUA, QUI, SEX, SÁB, DOM**. Os dias ficam gravados como `postingDays` no documento do cliente e não mudam automaticamente calendários que já existem.

Nenhum dia é presumido: clientes antigos continuam sem frequência até a configuração. Na criação de calendário de um único cliente ou em **Gerar calendários do mês**, o sistema cria **uma postagem por ocorrência de cada dia marcado**, considerando o mês e os anos bissextos. Clientes sem dias configurados aparecem com orientação para completar o cadastro e não entram na geração em lote.

Cada postagem tem data, tipo (**recorrente** ou **especial**), tema, formato, copy/legenda e observações. No detalhe do calendário, clique em **Editar / realocar** para mover uma arte dentro do mesmo mês (incluindo datas comemorativas) ou em **+ Postagem especial** para acrescentar uma publicação. As alterações não mudam os dias habituais do cliente. Calendários antigos podem adotar o plano por meio de **Gerar pelos dias cadastrados**.

Uma mudança no calendário depois de uma validação interna final invalida o registro de aprovação interna (`approvedAt`), exigindo nova validação da liderança. Uma mudança no documento também torna antigos links externos inválidos.

## 2. Validação externa do cliente

A validação **do cliente** é independente da esteira **interna** de Aprovações da equipe.

1. Abra o calendário ou a ficha de uma arte avulsa e clique em **Validação do cliente**.
2. Confirme o material. Calendários mostram postagens datadas e arquivos previamente aprovados na etapa final; artes avulsas mostram a peça enviada ou seu link HTTPS.
3. Clique em **Gerar link de aprovação** e copie o endereço na mesma hora. Envie-o pelo canal que já utiliza com o cliente, como WhatsApp ou e-mail.
4. Sem login no Terzo, o cliente acessa a página, vê **somente o material daquele link** e escolhe **Aprovar material** ou **Solicitar ajustes**. Para registrar a resposta, informa nome; o motivo dos ajustes é obrigatório quando aplicável.
5. O retorno fica na fila **Validação do Cliente** e no histórico da própria peça ou calendário (botão **Validação do cliente**). O status pode ser `Aguardando cliente`, `Aprovado pelo cliente`, `Cliente pediu ajustes`, `Revogado` ou `Expirado`.
6. Depois dos ajustes, atualize o documento e gere **um novo link**, que representará a versão revisada.

### Restrições intencionais

- Cada link é válido por **14 dias**; é possível revogá-lo a qualquer momento.
- Ao gerar novo link, as solicitações ainda pendentes daquele mesmo material são revogadas.
- Uma resposta é **única** e registrada com nome, data e comentários.
- O token tem 256 bits de aleatoriedade e só seu hash SHA-256 é armazenado no banco.
- O material é um **snapshot**: não é alterado silenciosamente após o envio. Se o calendário ou a arte mudar, o link antigo não aceita novas decisões nem downloads.
- As prévias de arquivos são liberadas **somente** para os assets do mesmo cliente expressamente incluídos no snapshot e são servidas por endpoints com o token.
- Links externos de arquivos devem usar HTTPS.
- A área pública é `/aprovacao/<token>` e não oferece qualquer navegação pelo CRM, Nextcloud ou contas da agência.
- A aprovação externa não publica automaticamente no Instagram, não marca uma tarefa como entregue e não substitui a aprovação da liderança.

## 3. Banco e implantação em homologação

Esta entrega contém uma **migration aditiva**: `client_approvals`. Preserva as coleções JSON existentes, o histórico de clientes, calendários, creativos e as migrations anteriores.

Antes de testar:

```powershell
git fetch origin
git switch -c teste-calendario --track origin/feat/calendario-postagens-aprovacao-cliente

corepack enable
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate
pnpm typecheck
pnpm test
pnpm build
pnpm ui:check-generated
pnpm dev
```

**Faça backup do PostgreSQL antes de aplicar migrations**, especialmente em cópias de dados reais. Não use banco ou Nextcloud de produção durante os testes iniciais.

## 4. Checklist manual

- [ ] Cadastro de cliente salva SEG–DOM selecionados e mostra chips na ficha.
- [ ] Geração em lote avisa quando o cliente não possui dias configurados.
- [ ] Para uma semana de SEG/QUA/SEX, aparecem todas as ocorrências no mês (inclusive anos bissextos).
- [ ] Calendário individual segue os mesmos dias e não duplica calendários existentes.
- [ ] Alterar dia de uma postagem mantém as outras no lugar.
- [ ] Criar uma publicação especial não modifica a frequência do cliente.
- [ ] Histórico registra a movimentação e temas/copies persistem após atualizar a página.
- [ ] Link de calendário apresenta postagens e os anexos permitidos.
- [ ] Link de arte avulsa mostra apenas aquela arte, sem dados internos do CRM.
- [ ] Cliente aprova uma vez e a página confirma a resposta.
- [ ] Cliente pede ajustes com motivo e isso aparece na fila.
- [ ] Cliente anônimo não pode visualizar outros anexos.
- [ ] Revogar link impede visualização e decisões.
- [ ] Alterar o material após criar um link invalida o link anterior.
- [ ] Aprovação do cliente não avança automaticamente os status internos.

A CI inclui testes de geração de datas, permissões, tokens, versão do conteúdo, revogação, respostas únicas, build e rotas Next.js. A integração com PostgreSQL/Nextcloud reais precisa ser homologada localmente.
