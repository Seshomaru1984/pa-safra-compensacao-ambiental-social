# PA Safra — Compensação Ambiental e Social

Portal institucional e informativo do Projeto de Compensação Ambiental e Social — PA Safra, em Nova Xavantina/MT.

## Desenvolvimento

- `main`: estado consolidado e aprovado;
- `develop`: integração de desenvolvimento;
- branches `feat/...` e `fix/...`: alterações isoladas por etapa;
- validação automática: `npm ci`, `npm run check`, `node --check app.js`, parser PowerShell, `npm run build` e `npm run smoke`.

## Conteúdo editável

A estrutura V001-A3 separa o conteúdo editorial do layout e prepara o projeto para edição via Pages CMS. Os dados editáveis ficam em `public/content/`, e as imagens públicas ficam em `public/assets/`.

A configuração do painel está em `.pages.yml`.

## Execução local

```powershell
npm ci
npm run dev
```

O servidor de desenvolvimento usa a porta local exclusiva `4286` com `--strictPort`.

## Build local e pacotes

Para gerar um build validado no Windows e arquivar automaticamente o ZIP dentro do projeto:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\tools\PA-SAFRA-BUILD-E-ARQUIVAR.ps1"
```

O script cria uma pasta em `_PACOTES-LOCAL/`, gera o ZIP inicialmente em `Downloads`, confere o SHA-256 e o move para essa pasta do projeto. `_PACOTES-LOCAL/` é ignorado pelo Git.

Detalhes: [`docs/BUILD-LOCAL-E-PACOTES.md`](docs/BUILD-LOCAL-E-PACOTES.md).

## Trava de publicação

A V001-A7 adiciona uma barreira explícita contra publicação prematura. O estado de aprovação fica em `public/content/publicacao.json`.

- `npm run build` executa a verificação de pré-publicação em modo advisory durante desenvolvimento, CI e previews;
- quando o build roda no Cloudflare Pages com `CF_PAGES=1` e `CF_PAGES_BRANCH=main`, a verificação passa automaticamente para modo bloqueante;
- `npm run prepublish:check` executa a mesma validação em modo bloqueante deliberado;
- produção só é liberada quando todas as validações obrigatórias estão `true` e `status` está definido como `aprovado`.

Nenhum item de aprovação deve ser marcado como concluído sem confirmação efetiva. A configuração de publicação não é exposta no Pages CMS nesta etapa.

## Publicação planejada

A arquitetura definida para produção é GitHub + Pages CMS + Cloudflare Pages + domínio próprio. A publicação em produção ainda não foi executada.

Parâmetros planejados do Cloudflare Pages:

- branch de produção: `main`;
- build: `npm run build`;
- saída: `dist`;
- raiz: raiz do repositório.

## Validação editorial

Antes da publicação definitiva, devem ser confirmados créditos/licenças das imagens fornecidas pelo solicitante, dados de contato, redação jurídica, afirmações históricas/biográficas, revisão visual e teste operacional do Pages CMS.

Checklist: [`docs/PRE-PUBLICACAO-CHECKLIST.md`](docs/PRE-PUBLICACAO-CHECKLIST.md).
