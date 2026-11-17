# Recuperação da interface original do Terzo

A interface simplificada em React criada na primeira versão do monorepo não reproduzia o CRM original. Para restaurar fielmente aparência e funcionalidades existentes, esta branch recupera os fontes de antes da migração, **sem alterar a arquitetura de banco e API**.

## Fonte de verdade

Os arquivos em `apps/web/legacy-src/` são os originais recuperados do histórico do Git, antes do merge do monorepo:

- `base.html`: estrutura visual, CSS, telas, menu, cards, calendário e formulários do CRM original;
- `modulos/crm_*.js`: implementações dos módulos Comercial, Clientes, Planejamento, Produção, Chat, Academy, Equipe e demais extensões;
- `build.py`: combina as camadas originais preservando a ordem de execução histórica;
- `apps/web/public/terzo-runtime.js`: integração original com os endpoints NestJS de PostgreSQL, sessão, arquivos e SSE;
- `apps/web/public/legacy/login.html` e `admin.html`: identidade e operações anteriores.

O HTML gerado em `apps/web/public/legacy/index.html` **não é commitado**: é recriado automaticamente em `pnpm dev` e `pnpm build`.

## Arquitetura preservada

```text
apps/
  web/
    app/                 Next.js/React (páginas em migração)
    legacy-src/          Compatibilidade visual/funcional temporária
    public/legacy/       HTML gerado e telas históricas
    proxy.ts             Autenticação e roteamento, inclusive arquivos estáticos
  api/                   NestJS e autenticação, documentos, Nextcloud
packages/
  database/              Prisma, migrations e adaptador PostgreSQL
```

As rotas `/`, `/login` e `/admin` são encaminhadas pelo proxy Next.js aos documentos originais. **Os caminhos diretos `/legacy/index.html` e `/legacy/admin.html` também exigem autorização**; o login é público. A API NestJS continua sendo a fonte de autorização dos dados.

Não foi reintroduzido Nginx. Continue utilizando seu próprio proxy reverso, apontando para o Next.js.

## Requisitos e validação

Node.js 22+, pnpm 10.19.0 e Python 3.8+. No Windows, `py -3 --version` deve funcionar, ou `python --version`.

```powershell
git fetch origin
git switch -c teste-restauracao --track origin/refactor/restore-original-ui
corepack enable
pnpm install --frozen-lockfile
pnpm architecture:check
pnpm typecheck
pnpm test
pnpm build
pnpm ui:verify
pnpm dev
```

Use `.env` e PostgreSQL de teste. A porta padrão é 3000 para o Next.js e 3001 para a API. O `pnpm ui:verify` sobe um servidor Next.js real com API simulada, verifica as rotas e bloqueios de autenticação, e encerra os processos ao terminar.

## Roteiro manual de aceite

1. Entrar com conta administrativa, navegar no Painel e comparar tipografia, menu, sidebar, cartões e cores com a interface anterior.
2. Abrir **Meu Dia**, identificar tarefas, responsáveis e atrasos.
3. Navegar por **Clientes** e **Comercial**, visualizando carteira, relacionamento e formulários.
4. Conferir **Projetos**, **Produção**, **Planejamento**, **Criativos** e **Compromissos**, incluindo seus modais, listas e filtros.
5. Conferir **Equipe**, perfis e permissões de usuários comuns, líderes e administradores.
6. Testar **Chat** e **Academy**, incluindo estados existentes no PostgreSQL.
7. Verificar login, troca obrigatória de senha, encerramento de sessão e administração das contas.
8. Verificar upload, visualização e download de arquivos associados ao **Nextcloud**, usando uma instalação de teste.
9. Em janela anônima, abrir `/legacy/index.html` e `/legacy/admin.html`: ambas devem redirecionar para login.
10. Com usuário comum, abrir `/admin` e `/legacy/admin.html`: ambas devem bloquear a entrada.
11. Conferir responsividade em telas menores, sem alteração do menu original.

### Limitações e próxima etapa

**Esta recuperação usa temporariamente HTML e JavaScript originais**, porque a camada React do primeiro monorepo tinha perdido partes importantes da experiência. Ela restitui a implementação anterior, mas não reescreve logicamente todos os módulos.

O estado das coleções e a integração Nextcloud ainda precisam de homologação com banco e arquivos reais. Testes automáticos verificam estrutura e rotas; não demonstram sozinhos que cada fluxo de negócio original funciona.

A conversão para React deverá avançar página a página, com componentes e hooks testáveis, preservando o mesmo layout e contratos da API. A camada antiga somente deverá ser removida quando houver paridade funcional comprovada.

A `main` e os dados do usuário não são alterados até o merge explícito deste PR.
