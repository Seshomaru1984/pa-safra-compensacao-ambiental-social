# 02 — Identidade e estado do projeto

Aplicação específica da BASE-PROJETOS-WEB-V2 ao projeto PA Safra. Atualizado em 12/09/2026.

## 1. Identidade e fronteiras

| Campo | Estado atual |
|---|---|
| Nome do projeto | Projeto de Compensação Ambiental e Social — PA Safra |
| Identificador curto | `pa-safra-compensacao-ambiental-social` |
| Objetivo e público | Portal institucional e informativo do PA Safra, em Nova Xavantina/MT, com área pública e painel administrativo simples para responsável leigo pelo conteúdo |
| Escopo autorizado atual | Evolução do portal, painel administrativo nativo e validação segura em Preview antes de produção |
| Pasta local canônica | `%USERPROFILE%\PA SAFRA` — VERIFICADO por execuções do usuário |
| Repositório autorizado | `Seshomaru1984/pa-safra-compensacao-ambiental-social` — VERIFICADO |
| Remote autorizado | `https://github.com/Seshomaru1984/pa-safra-compensacao-ambiental-social.git` — VERIFICADO |
| Branch de integração | `develop` — preservada; não é alvo desta correção |
| Branch de produção | `main` — preservada; produção bloqueada enquanto gates estiverem pendentes |
| Candidato atual | `ops/pa-v001-a19-preview-auth-e2e` |
| Base do candidato | `ops/pa-v001-a18-cloudflare-preview-admin` @ `7327e87188c9aae228a33daaed24fa6c494a6c03` |
| Projeto Cloudflare Pages | `pa-safra-compensacao-ambiental-social` — VERIFICADO |
| Preview funcional atual | alias `ops-pa-v001-a19-preview-auth.pa-safra-compensacao-ambiental-social.pages.dev` |
| Produção/domínio/DNS | Fora do escopo da A19; não alterar antes dos gates aplicáveis |
| Outro repositório fora do escopo | Qualquer outro repositório, inclusive SIGUEG, não pertence a este projeto |

## 2. Configuração e escolhas

| Campo | Estado atual |
|---|---|
| Tipo de entrega | Site predominantemente estático com painel administrativo nativo |
| Front-end/build | Vite 7; Node 22 no CI; `npm ci`, `npm run check`, `npm run build`, `npm run smoke` |
| Conteúdo editorial | JSONs em `public/content/` |
| Administração | `/admin`, formulários específicos; sem HTML/CSS/JS/JSON/Git expostos ao administrador comum |
| Backend administrativo | Cloudflare Pages Functions |
| Fonte editorial | GitHub, com escrita futura restrita à lista branca e branch editorial de Preview |
| Banco | Cloudflare D1 apenas para estado técnico do rate limiter; não é fonte editorial |
| D1 de Preview | `pa-safra-auth-preview` / `e99dd1d3-977e-40fd-a814-a00e269fc423` — VERIFICADO |
| Autenticação | usuário/senha nativos + sessão assinada; cookie `HttpOnly`, `Secure`, `SameSite=Strict` |
| Derivação de senha no Workers | PBKDF2-SHA256 / `100000` iterações; contagem incompatível falha fechado com 503 |
| Usuário administrativo de Preview | `admin` |
| Branch editorial de Preview | `content/pa-v001-admin-preview` |
| Token GitHub de escrita | NÃO CONFIGURADO na A19; escrita editorial permanece bloqueada |
| Build local formal | `tools/PA-SAFRA-BUILD-E-ARQUIVAR.ps1`, com ZIP e SHA-256 arquivados em `_PACOTES-LOCAL/` |
| Porta local | `127.0.0.1:4286`, strict port |
| Estratégia rejeitada | Pages CMS não integra mais a arquitetura; painel nativo é a decisão vigente |

## 3. Checkpoint corrente

| Campo | Estado atual |
|---|---|
| Revisado em | 12/09/2026 |
| Item de trabalho | PA-V001-A19 — autenticação real do painel no Preview |
| Fase atual | F1 concluída para login/sessão/logout; próximo gate será o rate limiter live controlado |
| HEAD executado na R4 | `801c91ba65a50bb573b3209d222c5226e4bb9cf0` |
| Build formal R4 | PASS; check/build/smoke/ZIP/SHA-256 concluídos |
| Correção PBKDF2 | hash de Preview renovado para PBKDF2-SHA256/100000 |
| Alteração de secrets na R4 | somente `PA_SAFRA_ADMIN_PASSWORD_HASH`; demais secrets preservados |
| Deploy R4 | `e318fd01.pa-safra-compensacao-ambiental-social.pages.dev`; alias A19 preservado |
| Login real | PASS no Cloudflare Preview |
| Sessão/cookie | PASS no Cloudflare Preview |
| Logout/invalidação | PASS no Cloudflare Preview |
| GitHub write | continua BLOQUEADO; `GITHUB_CONTENT_TOKEN` ausente |
| Rate limiter live | PENDENTE: 401/429/Retry-After/bloqueio/limpeza controlada |
| Publicação/produção | NÃO EXECUTADO para A19; `main`, `develop`, domínio e DNS preservados |
| `admin_nativo_validado` | `false` — ainda faltam rate limiter live e fluxo editorial real |

## 4. Evidências essenciais

- A18 provisionou e validou o D1 remoto e `admin_login_rate`.
- O diagnóstico runtime da A19 isolou a incompatibilidade PBKDF2/Workers e levou à correção R4.
- A R4 sincronizou a branch até `801c91ba65a50bb573b3209d222c5226e4bb9cf0`, executou o build normativo e renovou somente o hash de senha do Preview.
- O runtime real comprovou login, sessão e logout sem habilitar escrita GitHub.
- Evidência do diagnóstico: `docs/evidencias/PA-V001-A19-PBKDF2-CLOUDFLARE-20260912.md`.
- Evidência do PASS funcional: `docs/evidencias/PA-V001-A19-R4-PREVIEW-AUTH-PASS-20260912.md`.
- A correção não autorizou produção e não alterou `main`, `develop`, domínio ou DNS.

## 5. Regra de continuidade

Não repetir A18, R2, R3 ou R4 sem uma mudança que invalide a evidência já obtida. O próximo gate deve testar o rate limiter D1 no Preview de forma controlada: quatro falhas devem retornar 401; a quinta deve retornar 429 com `Retry-After`; tentativa correta durante o lock deve continuar bloqueada; o estado de teste deve ser removido com segurança no D1 de Preview; depois a credencial correta deve voltar a autenticar. Escrita editorial continua fora desse gate.
