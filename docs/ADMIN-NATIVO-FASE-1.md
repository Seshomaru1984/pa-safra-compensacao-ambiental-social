# PA Safra — Admin nativo — Fase 1

Esta fase abre a vertente de administração nativa do PA Safra.

## Escopo

- painel próprio em `/admin`;
- autenticação nativa por usuário e senha;
- sessão assinada em cookie `HttpOnly`, `Secure` e `SameSite=Strict`;
- edição controlada da página inicial;
- edição de palestras/vídeos do YouTube;
- pré-visualização antes da publicação;
- API segura via Cloudflare Pages Functions;
- gravação controlada no GitHub somente após autenticação e validações.

## Credenciais

O usuário final não precisa de GitHub, Cloudflare, e-mail ou conta em serviço externo.

A senha não é armazenada em texto puro. O hash e o segredo de sessão são gerados localmente com:

`node tools/admin-credentials.mjs`

O utilitário pede a senha diretamente no terminal, não exibe a senha digitada e produz somente os valores necessários para os secrets do Cloudflare.

## Variáveis previstas

- `PA_SAFRA_ADMIN_ENABLED` — habilita explicitamente a administração;
- `PA_SAFRA_ADMIN_USER` — nome de usuário;
- `PA_SAFRA_ADMIN_PASSWORD_HASH` — hash PBKDF2-SHA256;
- `PA_SAFRA_SESSION_SECRET` — segredo HMAC da sessão;
- `GITHUB_CONTENT_TOKEN` — credencial de escrita restrita ao repositório PA Safra;
- `PA_SAFRA_CONTENT_BRANCH` — branch editorial usada durante testes ou operação.

A escrita deve permanecer bloqueada até que essas configurações sejam feitas de forma controlada no Cloudflare. Nenhum secret deve ser commitado no repositório.

## Estado desta fase

A interface e a autenticação podem ser testadas em preview. O gate `admin_nativo_validado` permanece `false` até a validação ponta a ponta de login, sessão, escrita controlada e atualização do preview.
