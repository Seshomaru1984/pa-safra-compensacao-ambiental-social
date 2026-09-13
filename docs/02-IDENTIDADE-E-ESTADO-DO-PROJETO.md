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
| Candidato atual | `ops/pa-v001-a24-admin-editor-expandido` |
| PR candidata | `#26` — draft, não mesclada |
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
| Administração | `/admin`, nove áreas editoriais; sem HTML/CSS/JS/JSON/Git expostos ao administrador comum |
| Áreas administrativas A24 | Página inicial; Sobre o Projeto; Destaques; Palestras e vídeos; Galeria; Links úteis; Memória e legado; Páginas extras; Aparência e rodapé |
| Editor de texto | negrito, itálico, sublinhado, listas, esquerda/centro/direita/justificado, tamanho, cor, links e limpeza de formatação |
| Notícias | retirado do escopo operacional; não aparece no painel nem como view pública ativa; `noticias.json` permanece inerte por compatibilidade |
| Backend administrativo | Cloudflare Pages Functions |
| Fonte editorial | GitHub, com escrita restrita a lista branca e branch editorial de Preview durante validação |
| Lista branca A24 | `site`, `videos`, `pages`, `highlights`, `gallery`, `links` |
| Banco | Cloudflare D1 apenas para estado técnico do rate limiter |
| D1 de Preview | `pa-safra-auth-preview` / `e99dd1d3-977e-40fd-a814-a00e269fc423` — VERIFICADO |
| Autenticação | usuário/senha nativos + sessão assinada; cookie `HttpOnly`, `Secure`, `SameSite=Strict` |
| Derivação de senha no Workers | PBKDF2-SHA256 / `100000` iterações |
| Usuário administrativo de Preview | `admin` |
| Token GitHub de escrita | CONFIGURADO somente no Preview; valor não registrado no repositório/chat |
| Destino de escrita | `content/pa-v001-admin-preview`; guard fail-closed bloqueia branch divergente |
| Build local formal | `tools/PA-SAFRA-BUILD-E-ARQUIVAR.ps1`, com ZIP e SHA-256 em `_PACOTES-LOCAL/` |
| Porta local | `127.0.0.1:4286`, strict port |
| Estratégia rejeitada | Pages CMS; painel nativo é a decisão vigente |

## 3. Checkpoint corrente

| Campo | Estado atual |
|---|---|
| Revisado em | 13/09/2026 |
| Último gate concluído | PA-V001-A24 — painel editorial expandido |
| A19 | PASS — login, sessão e logout reais no Cloudflare Preview |
| A20 | PASS — rate limiter D1 live ponta a ponta |
| A21 | PASS — escrita, confirmação GitHub, restauração e logout live |
| A22 | PASS — login, edição, pré-visualização, publicação site/vídeos e logout em Chrome headless |
| A23 | PASS — auditoria automática impede falso PASS dos cinco bloqueios editoriais restantes |
| A24 | PASS técnico no CI — nove áreas administrativas + editor de texto rico + Notícias fora do escopo operacional |
| Run A24 | `34764155874` — SUCCESS no HEAD `388ec6e8fa5ec2b0dd1f05b7d9e9eebce3eaac1b` antes da documentação final |
| Commit temporário A21 | `186857bc4435aaa6d6ee6cc4cb02b0af30d3c16e` |
| Commit restaurador A21 | `8434fc384256b46ce08a458d66314f9deae3a55e` |
| `GITHUB_CONTENT_TOKEN` | presente somente no Preview; escrita continua exigindo sessão válida |
| Produção/`main`/`develop`/domínio/DNS | preservados |
| `admin_nativo_validado` | `true` — gate técnico original concluído e regressões A23/A24 verdes |
| `revisao_visual_confirmada` | `false` — gate editorial/visual separado |
| Produção | ainda BLOQUEADA pelas demais pendências editoriais/jurídicas |

## 4. Evidências essenciais

- A18 provisionou e validou D1 e `admin_login_rate`.
- A19 R4 comprovou login, sessão e logout no runtime real após correção PBKDF2/Workers.
- A20 comprovou quatro 401, quinta tentativa 429 + `Retry-After`, lock, limpeza e retorno do login normal.
- A21 R3 comprovou escrita temporária exclusivamente em `content/pa-v001-admin-preview`, confirmação pelo GitHub, restauração integral e logout.
- A22 comprovou o fluxo da interface em Chrome headless; o run `34757801759` concluiu SUCCESS.
- A23 registrou os cinco bloqueios editoriais como verificações observáveis sem autoaprovação.
- A24 expandiu o painel para nove áreas e adicionou editor rico; o run `34764155874` passou contrato, segurança, build, smoke e Chrome headless.
- Evidência A21: `docs/evidencias/PA-V001-A21-R3-CONTENT-WRITE-PASS-20260913.md`.
- Evidência A22: `docs/evidencias/PA-V001-A22-ADMIN-UI-FLOW-PASS-20260913.md`.
- Evidência A23: `docs/evidencias/PA-V001-A23-AUDITORIA-BLOQUEIOS-EDITORIAIS-20260913.md`.
- Evidência A24: `docs/evidencias/PA-V001-A24-ADMIN-EDITOR-EXPANDIDO-PASS-20260913.md`.

## 5. Regra de continuidade

Não repetir A18, A19 R4, A20, A21 R3, A22, A23 ou A24 sem mudança que invalide as evidências. A expansão A24 é técnica e não aprova conteúdo jurídico, créditos/licenças, contato, afirmações históricas ou revisão visual. Produção continua bloqueada enquanto qualquer uma dessas pendências permanecer falsa.
