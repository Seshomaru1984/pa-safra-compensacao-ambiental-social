# 02 — Identidade e estado do projeto

Aplicação específica da BASE-PROJETOS-WEB-V2 ao projeto PA Safra. Atualizado em 13/09/2026.

## 1. Identidade e fronteiras

| Campo | Estado atual |
|---|---|
| Nome do projeto | Projeto de Compensação Ambiental e Social — PA Safra |
| Identificador curto | `pa-safra-compensacao-ambiental-social` |
| Objetivo e público | Portal institucional e informativo do PA Safra, em Nova Xavantina/MT, com área pública e painel administrativo simples para responsável leigo pelo conteúdo |
| Escopo autorizado atual | Evolução do portal, painel administrativo nativo e validação segura em Preview antes de produção |
| Pasta local canônica | `%USERPROFILE%\PA SAFRA` — VERIFICADO |
| Repositório autorizado | `Seshomaru1984/pa-safra-compensacao-ambiental-social` — VERIFICADO |
| Remote autorizado | `https://github.com/Seshomaru1984/pa-safra-compensacao-ambiental-social.git` — VERIFICADO |
| Branch de integração | `develop` — preservada |
| Branch de produção | `main` — preservada; produção bloqueada enquanto gates/editorial estiverem pendentes |
| Candidato atual | `ops/pa-v001-a22-admin-ui-flow` |
| Branch editorial de Preview | `content/pa-v001-admin-preview` |
| Projeto Cloudflare Pages | `pa-safra-compensacao-ambiental-social` — VERIFICADO |
| Preview administrativo | `content-pa-v001-admin-previe.pa-safra-compensacao-ambiental-social.pages.dev`; deployment A21 `ada896a1...pages.dev` |
| Produção/domínio/DNS | Fora do escopo até conclusão dos gates aplicáveis |
| Outro repositório fora do escopo | Qualquer outro repositório, inclusive SIGUEG, não pertence a este projeto |

## 2. Configuração e escolhas

| Campo | Estado atual |
|---|---|
| Tipo de entrega | Site predominantemente estático com painel administrativo nativo |
| Front-end/build | Vite 7; Node 22 no CI; `npm ci`, `npm run check`, `npm run build`, `npm run smoke` |
| Conteúdo editorial | JSONs em `public/content/` |
| Administração | `/admin`, formulários específicos; sem HTML/CSS/JS/JSON/Git expostos ao administrador comum |
| Backend administrativo | Cloudflare Pages Functions |
| Fonte editorial | GitHub, com escrita restrita a lista branca e branch editorial de Preview durante validação |
| Banco | Cloudflare D1 apenas para estado técnico do rate limiter |
| D1 de Preview | `pa-safra-auth-preview` / `e99dd1d3-977e-40fd-a814-a00e269fc423` — VERIFICADO |
| Autenticação | usuário/senha nativos + sessão assinada; cookie `HttpOnly`, `Secure`, `SameSite=Strict` |
| Derivação de senha no Workers | PBKDF2-SHA256 / `100000` iterações |
| Usuário administrativo de Preview | `admin` |
| Token GitHub de escrita | CONFIGURADO somente no Preview desde A21 R2; valor não registrado no repositório/chat |
| Destino de escrita | `content/pa-v001-admin-preview`; guard fail-closed bloqueia branch divergente |
| Build local formal | `tools/PA-SAFRA-BUILD-E-ARQUIVAR.ps1`, com ZIP e SHA-256 em `_PACOTES-LOCAL/` |
| Porta local | `127.0.0.1:4286`, strict port |
| Estratégia rejeitada | Pages CMS; painel nativo é a decisão vigente |

## 3. Checkpoint corrente

| Campo | Estado atual |
|---|---|
| Revisado em | 13/09/2026 |
| Último gate concluído | PA-V001-A22 — fluxo técnico da interface administrativa |
| A19 | PASS — login, sessão e logout reais no Cloudflare Preview |
| A20 | PASS — rate limiter D1 live ponta a ponta |
| A21 | PASS — escrita, confirmação GitHub, restauração e logout live |
| A22 | PASS — login, edição, pré-visualização, publicação site/vídeos e logout em Chrome headless |
| Correção A22 | coleção vazia de palestras agora é estado explícito; não cria cartão vazio silencioso |
| Commit temporário A21 | `186857bc4435aaa6d6ee6cc4cb02b0af30d3c16e` |
| Commit restaurador A21 | `8434fc384256b46ce08a458d66314f9deae3a55e` |
| `GITHUB_CONTENT_TOKEN` | presente somente no Preview; escrita continua exigindo sessão válida |
| Produção/`main`/`develop`/domínio/DNS | preservados |
| `admin_nativo_validado` | `true` — evidências combinadas A19+A20+A21+A22 suficientes para o gate técnico |
| `revisao_visual_confirmada` | `false` — gate editorial/visual separado |
| Produção | ainda BLOQUEADA pelas demais pendências editoriais/jurídicas |

## 4. Evidências essenciais

- A18 provisionou e validou D1 e `admin_login_rate`.
- A19 R4 comprovou login, sessão e logout no runtime real após correção PBKDF2/Workers.
- A20 comprovou quatro 401, quinta tentativa 429 + `Retry-After`, lock, limpeza e retorno do login normal.
- A21 R3 comprovou escrita temporária exclusivamente em `content/pa-v001-admin-preview`, confirmação pelo GitHub, restauração integral e logout.
- A22 comprovou o fluxo da interface em Chrome headless; o primeiro teste detectou uma falha real no estado vazio de palestras, corrigida sem relaxar o teste; o run `34757801759` concluiu SUCCESS.
- Evidência A21: `docs/evidencias/PA-V001-A21-R3-CONTENT-WRITE-PASS-20260913.md`.
- Evidência A22: `docs/evidencias/PA-V001-A22-ADMIN-UI-FLOW-PASS-20260913.md`.

## 5. Regra de continuidade

Não repetir A18, A19 R4, A20, A21 R3 ou A22 sem mudança que invalide as evidências. O painel administrativo técnico está validado para a primeira fase (página inicial e palestras/vídeos). As pendências seguintes são independentes: redação jurídica, créditos/licenças das imagens, dados de contato, afirmações históricas e revisão visual. Produção continua bloqueada enquanto qualquer uma permanecer pendente.
