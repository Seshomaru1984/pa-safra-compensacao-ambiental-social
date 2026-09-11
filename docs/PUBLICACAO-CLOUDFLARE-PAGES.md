# Cloudflare Pages — preparação de publicação do PA Safra

## Arquitetura definida

- código e conteúdo: GitHub;
- edição: Pages CMS;
- build: Vite;
- hospedagem: Cloudflare Pages;
- domínio: domínio próprio já disponível segundo confirmação do usuário, porém ainda não solicitado/configurado no projeto.

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

## Readiness Cloudflare

A V001-A9 adicionou `npm run cloudflare:test` e `npm run cloudflare:env-test`, executados também pelo GitHub Actions. A V001-A11 adicionou o smoke remoto para validar uma URL real `*.pages.dev` depois da conexão externa.

Os testes confirmam:

- existência de `public/_headers`, `public/robots.txt` e `public/content/publicacao.json`;
- branch de produção registrada como `main`;
- presença dos cabeçalhos de segurança necessários;
- política de conteúdo compatível com os vídeos YouTube carregados pelo site;
- bloqueio de indexação enquanto a publicação estiver pendente;
- obrigação de remover o bloqueio de indexação quando a publicação for formalmente aprovada;
- contrato das variáveis de ambiente Cloudflare;
- capacidade de validar remotamente HTTPS, identidade, UTF-8, cabeçalhos, estado editorial e imagens.

Enquanto `publicacao.json` estiver pendente, `robots.txt` permanece com `Disallow: /`. Isso impede que uma eventual URL temporária ou preview seja tratada como publicação definitiva pelos mecanismos de busca.

## Validações obrigatórias atuais

- redação jurídica confirmada;
- créditos das imagens confirmados;
- dados de contato confirmados;
- afirmações históricas confirmadas;
- revisão visual confirmada;
- Pages CMS testado.

Esses campos permanecem pendentes de forma deliberada. Nenhum deles deve ser alterado apenas para permitir um deploy.

## Política de publicação

`main` deve continuar sendo a única branch de produção.

Branches de desenvolvimento e Pull Requests servem para validação e preview. A promoção para produção ocorre somente depois de revisão e merge controlado em `main`.

Não configurar a branch `develop` ou branches `feat/...` como produção.

## Preview

Com a integração Git do Cloudflare Pages, branches e Pull Requests podem receber deployments de preview separados da produção. A branch preparada para a próxima F1 remota é:

`feat/pa-v001-a12-preparar-preview-cloudflare`

Assim que o Cloudflare gerar a URL `*.pages.dev` dessa branch, executar o workflow `remote-preview.yml` ou `npm run smoke:remote` contra essa URL. O preview não exige domínio próprio.

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

O usuário informou que o domínio já está disponível para uso. Isso elimina a necessidade de aquisição quando chegar a etapa de publicação, mas **não antecipa sua configuração**.

O nome do domínio, registrador e dados de DNS serão solicitados somente quando:

1. o preview `*.pages.dev` estiver funcional e visualmente aprovado;
2. o smoke remoto estiver PASS;
3. o fluxo Pages CMS estiver validado operacionalmente;
4. os créditos/licenças pendentes estiverem resolvidos;
5. os dados institucionais estiverem confirmados;
6. as afirmações históricas e a redação jurídica estiverem confirmadas;
7. `public/content/publicacao.json` estiver com todas as validações verdadeiras e `status: aprovado`;
8. `robots.txt` estiver deliberadamente liberado para indexação;
9. `main` contiver exatamente a versão aprovada.

Não solicitar senha, token ou cookie do registrador/Cloudflare pelo chat. Preferir configuração guiada na interface oficial ou delegação via integração autorizada quando disponível.

## Estado desta etapa

A V001-A12 prepara a branch de preview e registra o domínio como disponível, sem alterar a conta Cloudflare, DNS ou produção. A conexão externa com o Cloudflare Pages continua sendo o próximo passo para gerar uma URL de preview real.
