# Cloudflare Pages — preparação de publicação do PA Safra

## Arquitetura definida

- código e conteúdo: GitHub;
- edição cotidiana: painel administrativo nativo em `/admin`;
- API administrativa: Cloudflare Pages Functions;
- autenticação administrativa: login próprio do PA Safra por usuário e senha;
- build: Vite;
- hospedagem: Cloudflare Pages;
- domínio: domínio próprio já disponível segundo confirmação do usuário, porém ainda não solicitado/configurado no projeto.

O Pages CMS não faz parte da arquitetura operacional do PA Safra.

## Configuração do Cloudflare Pages

Repositório conectado por Git integration:

`Seshomaru1984/pa-safra-compensacao-ambiental-social`

Configuração:

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
- painel administrativo nativo validado.

Esses campos permanecem pendentes de forma deliberada. Nenhum deles deve ser alterado apenas para permitir um deploy.

## Política de publicação

`main` deve continuar sendo a única branch de produção.

Branches de desenvolvimento e Pull Requests servem para validação e preview. A promoção para produção ocorre somente depois de revisão e merge controlado em `main`.

Não configurar a branch `develop` ou branches `feat/...` como produção.

## Painel administrativo nativo

A área `/admin` é uma interface própria do PA Safra destinada a atualizações simples por usuário leigo. Ela não é construtor de sites e não permite edição livre de código.

Na primeira fase, o painel permite preparar alterações de:

- complemento do cabeçalho;
- título e texto de apoio da página inicial;
- palestras/vídeos do YouTube.

A interface carrega os JSONs públicos do próprio site. A escrita é feita exclusivamente pela rota de Pages Functions `/api/admin/content`.

A autenticação é nativa: usuário e senha do próprio PA Safra. O navegador recebe apenas um cookie de sessão assinado, `HttpOnly`, `Secure` e `SameSite=Strict`. A senha não é gravada em texto puro nem enviada ao GitHub.

A API administrativa permanece bloqueada até que todos os requisitos abaixo sejam configurados no Cloudflare:

- `PA_SAFRA_ADMIN_ENABLED=true`;
- `PA_SAFRA_ADMIN_USER` com o nome de usuário administrativo;
- `PA_SAFRA_ADMIN_PASSWORD_HASH` armazenado como secret;
- `PA_SAFRA_SESSION_SECRET` armazenado como secret;
- `GITHUB_CONTENT_TOKEN` armazenado como secret, nunca exposto no navegador;
- `PA_SAFRA_CONTENT_BRANCH` para definir a branch editorial alvo quando necessário.

O hash da senha e o segredo de sessão são gerados localmente com `node tools/admin-credentials.mjs`. Nenhuma senha deve ser enviada pelo chat ou commitada no repositório.

A credencial GitHub deve ser restrita exclusivamente ao repositório PA Safra e utilizar permissão mínima de conteúdo necessária para atualizar os JSONs editoriais.

Cloudflare Access não é requisito para o login normal. Pode ser adicionado futuramente como camada adicional opcional.

## Cabeçalhos, CSP e cache

`public/_headers` é copiado pelo Vite para `dist/_headers` e será interpretado pelo Cloudflare Pages.

A configuração inclui:

- `Content-Security-Policy` com origem padrão restrita ao próprio site;
- liberação explícita apenas de `www.youtube-nocookie.com` para iframes de palestras;
- bloqueio de objetos/plugins e enquadramento do site em frames de terceiros;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy` desabilitando câmera, microfone, geolocalização, pagamento e USB;
- `no-store` para `/admin/*`;
- revalidação imediata para `/content/*`;
- cache específico para `/assets/*`.

## Domínio

O usuário informou que o domínio já está disponível para uso. Isso elimina a necessidade de aquisição quando chegar a etapa de publicação, mas **não antecipa sua configuração**.

O nome do domínio, registrador e dados de DNS serão solicitados somente quando:

1. o preview `*.pages.dev` estiver funcional e visualmente aprovado;
2. o smoke remoto estiver PASS;
3. o painel administrativo estiver autenticado e validado operacionalmente;
4. os créditos/licenças pendentes estiverem resolvidos;
5. os dados institucionais estiverem confirmados;
6. as afirmações históricas e a redação jurídica estiverem confirmadas;
7. `public/content/publicacao.json` estiver com todas as validações verdadeiras e `status: aprovado`;
8. `robots.txt` estiver deliberadamente liberado para indexação;
9. `main` contiver exatamente a versão aprovada.

Não solicitar senha, token ou cookie do registrador/Cloudflare pelo chat. Preferir configuração guiada na interface oficial ou delegação via integração autorizada quando disponível.

## Estado desta etapa

A V001-A16 substitui a autenticação por e-mail/Cloudflare Access pela autenticação nativa do próprio PA Safra. O login, a sessão assinada e os endpoints administrativos são implementados com escrita ainda desativada por padrão. A próxima etapa operacional será configurar as variáveis e secrets em ambiente de preview e executar um teste ponta a ponta sem liberar produção.
