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
| Derivação de senha no Workers | PBKDF2-SHA256 / `100000` iterações; contagem diferente falha fechado com 503 |
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
| Fase atual | T1/F1 da correção PBKDF2 |
| Última fase satisfeita | Diagnóstico runtime isolou o defeito e a correção foi implementada no candidato; F1 ainda não foi refeito com o hash compatível |
| Checkpoint técnico anterior a este documento | `825440f023417dabefcc5bef96b9407ef443c687` |
| Status remoto anterior à correção | `/api/admin/status` confirmou admin habilitado, credenciais configuradas, D1 ativo, branch editorial esperada e escrita GitHub bloqueada |
| Diagnóstico runtime | run `34719004809`, artefato `10305203739`, SHA-256 `c15d3807727c93d73fa766e40e05a364f70bbff165c2d174c2bc61ec51e4bd24` |
| Resultado do diagnóstico | senha aleatória incorreta também produziu HTTP 500 / `Worker threw exception`, antes do 401 controlado |
| Causa confirmada | PBKDF2-SHA256 com 310000 iterações excedia o teto de 100000 do runtime Cloudflare Workers/workerd |
| Implementação corretiva | verifier fixado em 100000; hash incompatível → 503 JSON; geradores alinhados; executor R4 criado |
| Executor canônico atual | `tools/PA-SAFRA-A19-R4-CORRIGIR-PBKDF2-PREVIEW.ps1` |
| R2/R3 | HISTÓRICO; não reexecutar neste gate |
| Validação técnica | CI do HEAD corretivo deve concluir antes de executar R4 |
| Validação funcional | PENDENTE: R4 deve renovar somente o hash de Preview, fazer deploy da correção e comprovar login/sessão/logout |
| Publicação/produção | NAO_EXECUTADO para A19; `main`, `develop`, domínio e DNS preservados |
| GitHub write | continua BLOQUEADO; `GITHUB_CONTENT_TOKEN` ausente |
| `admin_nativo_validado` | `false` |

## 4. Evidências essenciais

- A18 provisionou e validou o D1 remoto e `admin_login_rate`.
- A19 concluiu build formal, deploy Preview e status remoto com escrita GitHub bloqueada.
- O diagnóstico GitHub Actions não utilizou a senha real e comprovou que uma senha aleatória também atingia `Worker threw exception`.
- O fluxo de login só chegaria a `registerFailure`/401 após `verifyPassword`; o erro 500 anterior ao 401, combinado com o teto PBKDF2 do Workers, confirmou a incompatibilidade de 310000 iterações.
- Evidência detalhada: `docs/evidencias/PA-V001-A19-PBKDF2-CLOUDFLARE-20260912.md`.
- A correção não habilita escrita editorial nem altera produção.

## 5. Regra de continuidade

Não repetir A18, provisionamento D1 ou as tentativas R2/R3. A próxima execução local, somente depois de CI verde, é a R4 canônica. Ela deve pedir apenas a senha administrativa duas vezes, renovar apenas `PA_SAFRA_ADMIN_PASSWORD_HASH` no Preview, publicar o código corrigido e testar login/sessão/logout. Qualquer falha deve ser tratada pelo protocolo de correções antes de nova tentativa.
