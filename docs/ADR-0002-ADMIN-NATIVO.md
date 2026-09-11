# ADR-0002 — Administração nativa do PA Safra

Status: aprovado para implementação inicial
Data: 2026-09-11

## Contexto

O requisito correto do PA Safra não é usar um CMS externo para construir ou manter tecnicamente o projeto. O site público permanece simples e predominantemente estático. A necessidade é permitir que uma pessoa leiga, responsável pelo conteúdo, faça pequenas atualizações periódicas com uma interface própria do site.

Exemplos de operações esperadas:

- alterar título, subtítulo e textos institucionais previamente autorizados;
- publicar, editar, ocultar e reordenar palestras/vídeos do YouTube;
- publicar notícias curtas;
- manter links úteis;
- manter galeria e créditos;
- atualizar contatos e opções visuais básicas controladas.

O administrador não deve editar HTML, JavaScript, CSS, JSON, commits, branches ou configurações de infraestrutura.

## Decisão

O Pages CMS deixa de ser componente arquitetural e deixa de ser gate de publicação.

Será criado um painel nativo em `/admin`, com formulários específicos por tipo de conteúdo. O painel editará somente uma lista branca de campos e recursos.

A primeira fase cobre:

1. autenticação nativa por usuário e senha;
2. edição da página inicial;
3. edição de palestras/vídeos do YouTube;
4. pré-visualização simples antes da gravação;
5. backend em Cloudflare Pages Functions;
6. gravação controlada nos JSONs do próprio repositório GitHub.

## Persistência

Os JSONs já existentes continuam sendo a fonte de conteúdo:

- `public/content/site.json`
- `public/content/videos.json`
- `public/content/noticias.json`
- `public/content/galeria.json`
- `public/content/paginas.json`
- `public/content/destaques.json`

Não será introduzido banco de dados nesta fase.

## Autenticação

A experiência normal do usuário administrativo será própria do PA Safra:

`/admin → usuário + senha → sessão administrativa`

Não será exigida conta GitHub, conta Cloudflare, e-mail ou outro provedor externo para o usuário final.

A senha nunca será armazenada em texto puro. A configuração usa:

- `PA_SAFRA_ADMIN_USER`: nome de usuário administrativo;
- `PA_SAFRA_ADMIN_PASSWORD_HASH`: hash PBKDF2-SHA256 com salt aleatório;
- `PA_SAFRA_SESSION_SECRET`: segredo aleatório para assinatura HMAC das sessões;
- cookie de sessão `HttpOnly`, `Secure` e `SameSite=Strict`, com validade limitada.

A geração inicial do hash e do segredo de sessão deve ocorrer localmente pelo utilitário `tools/admin-credentials.mjs`, sem transmitir a senha pelo chat ou gravá-la no repositório.

## Segurança de escrita

O painel não terá escrita habilitada apenas por existir no deploy.

A API administrativa deverá exigir:

- `PA_SAFRA_ADMIN_ENABLED=true` no ambiente Cloudflare;
- credenciais nativas configuradas;
- sessão administrativa válida e assinada;
- token GitHub armazenado como secret do Cloudflare, nunca no navegador;
- token GitHub com acesso restrito ao repositório do PA Safra e permissão mínima de `Contents: write`;
- lista branca de arquivos editáveis e validação de formato/tamanho;
- requisições de escrita somente same-origin;
- verificação adicional de `Sec-Fetch-Site` quando o cabeçalho estiver disponível.

Até essas condições serem configuradas, o painel pode ser visualizado, mas a API deve permanecer bloqueada para escrita.

## Publicação

A edição administrativa deve ser apresentada ao usuário como:

`Editar → Pré-visualizar → Publicar`

A publicação gera uma alteração versionada no GitHub, acionando o fluxo normal de validação/deploy do PA Safra. Termos técnicos como commit, branch ou deploy não devem aparecer na interface comum do administrador.

## Escopo negativo

O painel não será um construtor de sites e não permitirá:

- editar layout livremente;
- injetar HTML/JavaScript arbitrário;
- alterar workflows, funções, scripts ou configuração Cloudflare;
- alterar arquivos fora da lista branca editorial;
- liberar automaticamente gates jurídicos/editoriais.

## Dependências mantidas

- GitHub: versionamento e fonte de conteúdo;
- Cloudflare Pages: publicação;
- Cloudflare Pages Functions: API administrativa.

Cloudflare Access não é requisito para a experiência normal do administrador. Pode ser adotado futuramente como camada adicional opcional, sem substituir o login nativo.

Não há dependência operacional do Pages CMS.
