# PA Safra — Checklist de pré-publicação

Este checklist deve ser concluído antes de promover o site para `main` e antes de conectar o domínio definitivo.

## Gate técnico

- `npm ci` concluído sem erro;
- `npm run check` concluído;
- `node --check app.js` concluído;
- parser PowerShell do empacotador concluído;
- `npm run build` concluído;
- `npm run smoke` concluído;
- `dist/index.html` presente;
- `dist/_headers` presente;
- arquivos JSON de conteúdo válidos;
- imagens institucionais presentes no build;
- build armazenado como artefato do GitHub Actions.

## Cloudflare Pages

Configuração planejada:

- repositório: `Seshomaru1984/pa-safra-compensacao-ambiental-social`;
- branch de produção: `main`;
- comando de build: `npm run build`;
- diretório de saída: `dist`;
- diretório raiz: raiz do repositório;
- previews de branches/PRs habilitados antes da promoção para produção.

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
- revisar o preview antes de qualquer promoção.

## Pendências editoriais obrigatórias

Antes da publicação definitiva, confirmar:

- créditos e licenças das duas imagens fornecidas pelo solicitante;
- dados de contato institucionais que serão publicados;
- redação jurídica definitiva referente ao TAC;
- afirmações históricas e biográficas que ainda dependem de documentação específica;
- qualquer identificação nominal que ainda não tenha sido formalmente aprovada.

## Regra de promoção

Nenhuma alteração editorial ou técnica deve chegar diretamente a `main` sem passar por branch, validação e revisão. O merge para produção permanece uma ação deliberada e separada.
