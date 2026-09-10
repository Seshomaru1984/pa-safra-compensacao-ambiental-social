# PA Safra — Checklist de pré-publicação

Este checklist deve ser concluído antes de promover o site para `main` e antes de conectar o domínio definitivo.

## Gate técnico

- `npm ci` concluído sem erro;
- `npm run check` concluído;
- `node --check app.js` concluído;
- parser PowerShell do empacotador concluído;
- `npm run build` concluído em modo de desenvolvimento/preview;
- `npm run smoke` concluído;
- `dist/index.html` presente;
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
- `pages_cms_testado`.

Depois disso, alterar `status` para `aprovado` e executar deliberadamente:

`npm run prepublish:check`

Esse comando deve concluir com `PREPUBLICACAO: APROVADO` antes da promoção final.

## Cloudflare Pages

Configuração planejada:

- repositório: `Seshomaru1984/pa-safra-compensacao-ambiental-social`;
- branch de produção: `main`;
- comando de build: `npm run build`;
- diretório de saída: `dist`;
- diretório raiz: raiz do repositório;
- previews de branches/PRs habilitados antes da promoção para produção.

No Cloudflare Pages, `npm run build` detecta `CF_PAGES=1` e `CF_PAGES_BRANCH=main`. Nessa situação, a trava editorial passa automaticamente para modo bloqueante.

O arquivo `public/_headers` é copiado pelo Vite para `dist/_headers` e contém as regras de cabeçalhos e cache previstas para o Cloudflare Pages.

## Pages CMS

Antes de uso editorial real:

- conectar a conta GitHub no Pages CMS;
- confirmar que o repositório PA Safra aparece no painel;
- abrir a branch de trabalho correta;
- confirmar leitura da configuração `.pages.yml`;
- testar edição de um campo não crítico;
- confirmar que a edição gera commit apenas na branch escolhida;
- executar **Validar alterações**;
- confirmar que o workflow `validate` conclui com sucesso;
- revisar o preview antes de qualquer promoção;
- só então marcar `pages_cms_testado` como verdadeiro.

## Pendências editoriais obrigatórias

Antes da publicação definitiva, confirmar:

- créditos e licenças das duas imagens fornecidas pelo solicitante;
- dados de contato institucionais que serão publicados;
- redação jurídica definitiva referente ao TAC;
- afirmações históricas e biográficas que ainda dependem de documentação específica;
- qualquer identificação nominal que ainda não tenha sido formalmente aprovada;
- revisão visual em desktop e celular.

## Regra de promoção

Nenhuma alteração editorial ou técnica deve chegar diretamente a `main` sem passar por branch, validação e revisão. O merge para produção permanece uma ação deliberada e separada.
