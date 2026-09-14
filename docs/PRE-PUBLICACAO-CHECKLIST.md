# PA Safra — Checklist de pré-publicação

Este checklist deve ser concluído antes de promover o site para `main` e antes de conectar o domínio definitivo.

## Gate técnico

- `npm ci` concluído sem erro;
- `npm run check` concluído;
- `npm run admin:test` concluído;
- `npm run admin:auth-test` concluído;
- `node --check app.js` concluído;
- validação de sintaxe do painel, login e Pages Functions concluída;
- parser PowerShell do empacotador, gerador de credenciais e auditor Cloudflare concluído;
- `npm run build` concluído em modo de desenvolvimento/preview;
- `npm run smoke` concluído;
- `dist/index.html` presente;
- `dist/admin/index.html` presente;
- `dist/_headers` presente;
- `dist/content/publicacao.json` presente;
- arquivos JSON de conteúdo válidos;
- imagens institucionais presentes no build;
- build armazenado como artefato do GitHub Actions.

## Trava editorial de produção

O arquivo `public/content/publicacao.json` deve permanecer com `status: pendente` enquanto houver qualquer validação não concluída.

Antes da publicação definitiva, todos os campos abaixo devem estar `true`:

- `redacao_juridica_confirmada`;
- `creditos_imagens_confirmados`;
- `dados_contato_confirmados`;
- `afirmacoes_historicas_confirmadas`;
- `revisao_visual_confirmada`;
- `admin_nativo_validado`.

Depois disso, alterar `status` para `aprovado` e executar deliberadamente:

`npm run prepublish:check`

Esse comando deve concluir com `PREPUBLICACAO: APROVADO` antes da promoção final.

## Cloudflare Pages

Configuração:

- repositório: `Seshomaru1984/pa-safra-compensacao-ambiental-social`;
- branch de produção: `main`;
- comando de build: `npm run build`;
- diretório de saída: `dist`;
- diretório raiz: raiz do repositório;
- previews de branches/PRs habilitados antes da promoção para produção.

No Cloudflare Pages, `npm run build` detecta `CF_PAGES=1` e `CF_PAGES_BRANCH=main`. Nessa situação, a trava editorial passa automaticamente para modo bloqueante.

O arquivo `public/_headers` é copiado pelo Vite para `dist/_headers` e contém as regras de cabeçalhos e cache previstas para o Cloudflare Pages.

## Painel administrativo nativo

Antes de habilitar escrita administrativa real:

- validar a interface `/admin` em desktop e celular;
- definir um usuário administrativo próprio do PA Safra;
- gerar localmente `PA_SAFRA_ADMIN_PASSWORD_HASH` e `PA_SAFRA_SESSION_SECRET` com `node tools/admin-credentials.mjs` ou `tools/PA-SAFRA-GERAR-CREDENCIAIS-ADMIN.ps1`;
- armazenar o hash e o segredo somente como secrets/variáveis do Cloudflare, nunca no GitHub;
- criar um banco Cloudflare D1 dedicado ao rate limiter do ambiente de preview;
- aplicar `migrations/0001_admin_login_rate.sql` nesse banco;
- vincular o banco ao Pages Functions pelo binding `PA_SAFRA_AUTH_DB` somente no ambiente de preview durante a validação;
- confirmar bloqueio temporário após 5 falhas dentro de 15 minutos e resposta HTTP 429 com `Retry-After`;
- criar credencial GitHub de escopo mínimo e restrita exclusivamente ao repositório PA Safra;
- armazenar a credencial exclusivamente como secret no Cloudflare;
- usar `PA_SAFRA_CONTENT_BRANCH=content/pa-v001-admin-preview` durante o teste de escrita, nunca `main`;
- manter `PA_SAFRA_ADMIN_ENABLED` desativado até D1, migration, credenciais, branch editorial e token estarem configurados;
- redeployar o preview depois da inclusão dos bindings/secrets necessários;
- validar login correto e rejeição de senha incorreta;
- validar o rate limiter em ambiente real;
- validar expiração/encerramento de sessão;
- validar edição de página inicial e palestras em ambiente controlado;
- confirmar que apenas arquivos editoriais permitidos podem ser alterados;
- confirmar que as alterações ficam versionadas no GitHub somente na branch editorial controlada;
- revisar o preview após a alteração;
- confirmar que o custo de CPU do verificador PBKDF2 é aceito no plano Cloudflare efetivamente utilizado;
- só então marcar `admin_nativo_validado` como verdadeiro.

O painel não substitui os gates jurídicos/editoriais e não pode alterá-los automaticamente.

## Pendências editoriais obrigatórias

Antes da publicação definitiva, confirmar:

- créditos e licenças das duas imagens fornecidas pelo solicitante;
- dados de contato institucionais que serão publicados;
- redação jurídica definitiva referente ao TAC;
- afirmações históricas e biográficas que ainda dependam de documentação específica;
- qualquer identificação nominal que ainda não tenha sido formalmente aprovada;
- revisão visual em desktop e celular.

## Regra de promoção

Nenhuma alteração editorial ou técnica deve chegar diretamente a `main` sem passar por branch, validação e revisão. O merge para produção permanece uma ação deliberada e separada.
