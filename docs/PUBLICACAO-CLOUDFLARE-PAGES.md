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

O Cloudflare Pages injeta variáveis de build como `CF_PAGES`, `CF_PAGES_BRANCH`, `CF_PAGES_COMMIT_SHA` e `CF_PAGES_URL`. A trava de publicação usa `CF_PAGES=1` e `CF_PAGES_BRANCH=main` para ativar o modo bloqueante.

## Trava de publicação

O arquivo `public/content/publicacao.json` registra as validações editoriais obrigatórias. Enquanto qualquer item estiver `false`, o status permanece pendente.

O comando `npm run build` executa primeiro `tools/prepublish.mjs`.

Comportamento:

- build local ou GitHub Actions fora do Cloudflare: modo **advisory**, permitindo desenvolvimento e preview;
- Cloudflare Pages em branch diferente de `main`: modo **advisory**;
- Cloudflare Pages em `main`: modo **bloqueante**;
- `npm run prepublish:check`: modo **bloqueante** em qualquer ambiente para conferência deliberada.

Em produção, o build somente é liberado quando todas as validações estiverem `true` e `status` estiver definido como `aprovado`.

## Readiness Cloudflare da V001-A9

A V001-A9 adiciona `npm run cloudflare:test`, executado também pelo GitHub Actions. O teste confirma:

- existência de `public/_headers`, `public/robots.txt` e `public/content/publicacao.json`;
- branch de produção registrada como `main`;
- presença dos cabeçalhos de segurança necessários;
- política de conteúdo compatível com os vídeos YouTube carregados pelo site;
- bloqueio de indexação enquanto a publicação estiver pendente;
- obrigação de remover o bloqueio de indexação quando a publicação for formalmente aprovada.

Enquanto `publicacao.json` estiver pendente, `robots.txt` permanece com `Disallow: /`. Isso impede que uma eventual URL temporária ou preview seja tratada como publicação definitiva pelos mecanismos de busca.

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

## Cabeçalhos, CSP e cache

`public/_headers` é copiado pelo Vite para `dist/_headers` e será interpretado pelo Cloudflare Pages.

A configuração inclui:

- `Content-Security-Policy` com origem padrão restrita ao próprio site;
- liberação explícita apenas de `www.youtube-nocookie.com` para iframes de palestras;
- bloqueio de objetos/plugins e enquadramento do site em frames de terceiros;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy` desabilitando câmera, microfone, geolocalização, pagamento e USB;
- revalidação imediata para `/content/*`;
- cache específico para `/assets/*`.

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
7. `robots.txt` estiver liberado para indexação;
8. `main` contiver a versão aprovada.

## Estado desta etapa

A V001-A9 prepara e testa o pacote para integração com Cloudflare Pages sem alterar conta Cloudflare, domínio ou produção. Nenhum deploy é feito por esta etapa.
