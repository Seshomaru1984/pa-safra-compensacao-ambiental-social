# Cloudflare Pages — preparação de publicação do PA Safra

## Arquitetura definida

- código e conteúdo: GitHub;
- edição: Pages CMS;
- build: Vite;
- hospedagem: Cloudflare Pages;
- domínio: domínio próprio a registrar/configurar posteriormente.

## Configuração recomendada no Cloudflare Pages

Conectar por **Git integration** ao repositório:

`Seshomaru1984/pa-safra-compensacao-ambiental-social`

Usar:

- Production branch: `main`;
- Build command: `npm run build`;
- Build output directory: `dist`;
- Root directory: raiz do repositório.

O Cloudflare Pages injeta automaticamente variáveis de build como `CF_PAGES`, `CF_PAGES_BRANCH`, `CF_PAGES_COMMIT_SHA` e `CF_PAGES_URL`. A V001-A7 usa `CF_PAGES=1` e `CF_PAGES_BRANCH=main` para ativar a trava bloqueante de publicação.

## Trava de publicação da V001-A7

O arquivo `public/content/publicacao.json` registra as validações editoriais obrigatórias. Enquanto qualquer item estiver `false`, o status permanece pendente.

O comando `npm run build` executa primeiro `tools/prepublish.mjs`.

Comportamento:

- build local ou GitHub Actions fora do Cloudflare: modo **advisory**, permitindo desenvolvimento e preview;
- Cloudflare Pages em branch diferente de `main`: modo **advisory**;
- Cloudflare Pages em `main`: modo **bloqueante**;
- `npm run prepublish:check`: modo **bloqueante** em qualquer ambiente para conferência deliberada.

Em produção, o build somente é liberado quando todas as validações estiverem `true` e `status` estiver definido como `aprovado`.

## Validações obrigatórias atuais

- redação jurídica confirmada;
- créditos das imagens confirmados;
- dados de contato confirmados;
- afirmações históricas confirmadas;
- revisão visual confirmada;
- Pages CMS testado.

Esses campos iniciam como pendentes de forma deliberada.

## Política de publicação

`main` deve continuar sendo a única branch de produção.

Branches de desenvolvimento e Pull Requests servem para validação e preview. A promoção para produção ocorre somente depois de revisão e merge controlado em `main`.

Não configurar a branch `develop` ou branches `feat/...` como produção.

## Preview

Com a integração Git do Cloudflare Pages, branches e Pull Requests podem receber deployments de preview separados da produção. Isso será usado para validar visualmente alterações do site antes da promoção para `main`.

## Cabeçalhos e cache

`public/_headers` é copiado pelo Vite para `dist/_headers` e será interpretado pelo Cloudflare Pages. A configuração atual aplica cabeçalhos básicos de segurança, revalidação imediata para `/content/*` e cache específico para `/assets/*`.

## Pages CMS

O Pages CMS altera arquivos no GitHub. Mudanças editoriais devem seguir a política de branch definida para não transformar uma edição de conteúdo em publicação não revisada.

O botão **Validar alterações** executa somente o gate técnico; não faz deploy nem merge.

## Domínio

O domínio próprio será conectado somente depois que:

1. o preview estiver visualmente aprovado;
2. o fluxo Pages CMS estiver validado;
3. os créditos/licenças pendentes estiverem resolvidos;
4. os dados institucionais estiverem confirmados;
5. as afirmações históricas e a redação jurídica estiverem confirmadas;
6. `public/content/publicacao.json` estiver com todas as validações verdadeiras e `status: aprovado`;
7. `main` contiver a versão aprovada.

## Estado desta etapa

A V001-A7 prepara uma barreira técnica adicional contra publicação prematura. Nenhuma conta Cloudflare, domínio ou produção é alterada automaticamente por esta etapa.
