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
| Fase atual | F1 — validação funcional, com defeito aberto |
| Última fase satisfeita | T1 do candidato anterior à falha runtime: CI/build/smoke/parser e contrato local aprovados; isso não comprova login real |
| HEAD remoto observado antes desta consolidação | `ca262a0f5af42ff18a5fd19ea43145b2fa579a02` |
| Deploy Preview observado | deployment `c0c272d4...` concluído; alias A19 ativo |
| Status remoto | `/api/admin/status` confirmou admin habilitado, credenciais configuradas, D1 ativo, branch editorial esperada e escrita GitHub bloqueada |
| Implementação | IMPLEMENTADA no candidato A19 |
| Validação técnica | PASS no alcance do CI/build/smoke; runtime de login não coberto por essa evidência |
| Validação funcional | FAIL: login real retorna HTTP 500; sessão/logout não exercitados |
| Publicação/produção | NAO_EXECUTADO para A19; `main`, `develop`, domínio e DNS preservados |
| Bloqueio atual | causa do HTTP 500 ainda não confirmada; tentativas de `wrangler pages deployment tail` falharam no procedimento antes de observar o Worker |
| Hipótese técnica principal | limite de CPU do Workers Free durante PBKDF2 de 310.000 iterações; hipótese sustentada por documentação oficial e pelo ponto do fluxo, ainda não tratada como causa confirmada |
| Próxima ação | abandonar repetição de `tail` por tentativa; produzir diagnóstico/controlador mínimo no próprio candidato, validado no GitHub/CI, que diferencie D1/origem/crypto sem depender do testador que já falhou |

## 4. Evidências essenciais

- A18 provisionou e validou o D1 remoto e `admin_login_rate`.
- A19 concluiu build formal, deploy Preview e status remoto com escrita GitHub bloqueada.
- Login real retornou HTTP 500 em tentativa controlada; senha incorreta não foi inferida, pois o contrato implementado reserva 401 para credenciais inválidas.
- Três tentativas de observabilidade via `wrangler pages deployment tail` falharam como PROCEDIMENTO/TESTADOR antes de capturar a exceção do produto.
- O CI do HEAD `ca262a0f5af42ff18a5fd19ea43145b2fa579a02` concluiu com sucesso, sem substituir F1.

## 5. Regra de continuidade

Não repetir build, secrets, D1 ou deploy já comprovados sem uma mudança que invalide essas evidências. Toda nova tentativa deve explicar o aprendizado e a diferença técnica. Após as falhas do `tail`, o próximo diagnóstico deve usar outro mecanismo, conforme a BASE V2 e o protocolo de correções.