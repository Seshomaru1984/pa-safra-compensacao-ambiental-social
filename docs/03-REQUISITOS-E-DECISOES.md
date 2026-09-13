# 03 — Requisitos e decisões do projeto

Aplicação específica da BASE-PROJETOS-WEB-V2 ao PA Safra. Atualizado em 13/09/2026.

## 1. Visão e escopo

O projeto é um portal institucional e informativo do Projeto de Compensação Ambiental e Social — PA Safra, em Nova Xavantina/MT. O site público permanece simples e predominantemente estático. A manutenção editorial deve poder ser feita por pessoa leiga em painel próprio, sem expor infraestrutura, código ou Git.

A primeira entrega administrativa útil é: autenticação nativa, edição controlada de conteúdo autorizado, pré-visualização e publicação versionada pelo fluxo do projeto. A produção continua sujeita às confirmações editoriais/jurídicas e aos gates técnicos aplicáveis.

## 2. Requisitos confirmados

### REQ-001 — Portal público institucional
- **Esperado:** apresentar conteúdo institucional, palestras, notícias, galeria, links úteis e memória/legado conforme conteúdo aprovado.
- **Aceitação:** build válido, navegação e conteúdo corretos no ambiente correspondente; publicação somente após gates aplicáveis.
- **Situação:** CONFIRMADO; implementação pública existente, revisão final ainda pendente.

### REQ-002 — Administração nativa para usuário leigo
- **Esperado:** `/admin` com interface própria; o administrador comum não edita HTML, CSS, JavaScript, JSON, commits, branches ou configuração Cloudflare.
- **Aceitação:** fluxo `Editar → Pré-visualizar → Publicar` funcional nos campos autorizados.
- **Situação:** CONFIRMADO; backend funcional já comprovado; validação do fluxo de interface permanece no próximo gate.

### REQ-003 — Login nativo por usuário e senha
- **Esperado:** usuário/senha próprios do PA Safra, sem exigir GitHub, Cloudflare ou e-mail do administrador final; senha nunca em texto puro; sessão assinada e cookie seguro.
- **Aceitação:** login válido retorna sucesso e cria sessão; credencial inválida retorna 401; origem inválida é rejeitada; logout encerra a sessão; cookie é `HttpOnly`, `Secure`, `SameSite=Strict`.
- **Situação:** PASS funcional no Cloudflare Preview desde A19 R4.

### REQ-004 — Rate limiter de autenticação em D1
- **Esperado:** até 5 falhas em janela de 15 min; bloqueio de 15 min ao atingir limite; 429 com `Retry-After`; identificador derivado antes de persistência; fail-closed se proteção indisponível.
- **Aceitação:** quatro falhas iniciais com 401; quinta falha com 429 + `Retry-After`; credencial correta continua bloqueada durante o lock; estado de teste é removido de forma controlada; login correto volta a funcionar após a limpeza.
- **Situação:** PASS funcional live na A20.

### REQ-005 — Escrita editorial controlada
- **Esperado:** Pages Function escreve somente arquivos/campos em lista branca, usando token GitHub server-side de privilégio mínimo e branch editorial de Preview durante validação.
- **Aceitação:** sessão válida + token restrito + branch `content/pa-v001-admin-preview`; nenhuma escrita direta em `main` no teste inicial; mutação e restauração verificáveis.
- **Situação:** PASS funcional live na A21 R3 para `videos`; escrita temporária e restauração integral comprovadas exclusivamente na branch editorial.

### REQ-006 — Conteúdo continua nos JSONs versionados
- **Esperado:** `public/content/*.json` permanece fonte editorial; D1 não substitui conteúdo público.
- **Situação:** CONFIRMADO.

### REQ-007 — Trava editorial de produção
- **Esperado:** produção bloqueada enquanto houver pendências de redação jurídica, créditos/licenças de imagens, contato, afirmações históricas, revisão visual e admin nativo validado.
- **Situação:** CONFIRMADO; bloqueio vigente.

### REQ-008 — Isolamento de projeto e ambientes
- **Esperado:** somente `Seshomaru1984/pa-safra-compensacao-ambiental-social`; nenhuma leitura/escrita em repositórios de outros projetos; Preview não autoriza produção.
- **Situação:** CONFIRMADO.

### REQ-009 — PBKDF2 compatível com Cloudflare Workers
- **Esperado:** PBKDF2-SHA256 de 100000 iterações nesta arquitetura Workers; registros com contagem incompatível não podem causar exceção não tratada.
- **Situação:** PASS. A R4 renovou somente o hash de Preview e o login real passou no runtime.

## 3. Decisões duráveis

### DEC-001 — Arquitetura editorial
O site público permanece estático e o conteúdo fica em JSONs versionados no GitHub. D1 serve apenas a estado técnico de autenticação/rate limiter.

### DEC-002 — Painel nativo substitui Pages CMS
Pages CMS não é componente arquitetural nem gate de publicação. O painel próprio em `/admin` é a solução vigente.

### DEC-003 — Experiência de autenticação
Administrador final usa usuário e senha próprios do PA Safra; não depende de conta GitHub, Cloudflare ou e-mail.

### DEC-004 — Escrita isolada em branch editorial durante validação
Enquanto a administração estiver em validação, `PA_SAFRA_CONTENT_BRANCH` deve permanecer em `content/pa-v001-admin-preview`; `main` não é destino de teste editorial.

### DEC-005 — Produção protegida por gates reais
CI/build/smoke aprovados não substituem F1. `admin_nativo_validado` só pode ser `true` após login, sessão, logout, rate limiter, escrita editorial e fluxo de interface `Editar → Pré-visualizar → Publicar` terem evidência funcional suficiente.

### DEC-006 — Procedimento operacional após falhas recorrentes
Scripts que dependam da máquina do usuário devem existir primeiro no repositório, passar parser e CI e ser entregues como um único executor canônico. Após duas tentativas sem avanço, revisar a abordagem; não criar variações sucessivas por tentativa e erro.

### DEC-007 — Segurança não será relaxada para obter verde
Não desativar autorização, rate limiter, same-origin ou validações para fazer o teste passar.

### DEC-008 — PBKDF2 no Workers
Nesta fase, PBKDF2-SHA256 fica fixado em 100000 iterações por compatibilidade com o runtime Workers observado.

### DEC-009 — Evidência válida é reutilizada
Não repetir build, deploy, secrets ou gates já comprovados sem mudança que invalide a evidência existente. A21 R3 reutilizou com sucesso o deploy/token já comprovados na R2 e limitou-se ao trecho ainda não validado.

## 4. Mapeamento de controles atuais

| Requisito | Controle/evidência atual | Estado |
|---|---|---|
| REQ-003 login/sessão | `admin:auth-test`; A19 R4 no Preview real | PASS |
| REQ-004 rate limiter | D1 `admin_login_rate`; A20 live | PASS |
| REQ-005 escrita | guard de branch + A21 R3 live | PASS para backend/branch editorial |
| REQ-007 trava editorial | `prepublish:check` + `publicacao.json` | PASS para bloqueio enquanto pendente |
| REQ-008 isolamento | remote/repo exatos + PRs encadeadas | VERIFICADO |
| REQ-009 compatibilidade PBKDF2 | diagnóstico runtime + 100000 + R4 real | PASS |

## 5. Pendências que não devem ser inferidas como aprovadas

- `redacao_juridica_confirmada=false`.
- `creditos_imagens_confirmados=false`.
- `dados_contato_confirmados=false`.
- `afirmacoes_historicas_confirmadas=false`.
- `revisao_visual_confirmada=false`.
- `admin_nativo_validado=false`.
- Fluxo de interface `Editar → Pré-visualizar → Publicar` ainda não possui gate próprio de navegador/DOM.
- A primeira fase administrativa ainda cobre somente página inicial e palestras/vídeos; notícias, links úteis, galeria, créditos, contatos e demais recursos do ADR permanecem fases posteriores.
- Produção, domínio e DNS continuam fora do escopo atual.

## 6. Estado corrente

A19 R4: login/sessão/logout live PASS.

A20: rate limiter D1 live PASS, incluindo 401, 429, `Retry-After`, bloqueio de credencial correta durante lock, limpeza controlada e retorno do login normal.

A21 R3: escrita editorial live PASS no Preview. O teste criou o commit temporário `186857bc4435aaa6d6ee6cc4cb02b0af30d3c16e`, confirmou a alteração em `content/pa-v001-admin-preview`, restaurou o conteúdo no commit `8434fc384256b46ce08a458d66314f9deae3a55e` e comprovou igualdade final com o original. O `GITHUB_CONTENT_TOKEN` permanece somente no Preview e a escrita exige sessão válida.

Evidência A21: `docs/evidencias/PA-V001-A21-R3-CONTENT-WRITE-PASS-20260913.md`.

O próximo gate é A22: validar tecnicamente o fluxo da interface administrativa, sem liberar produção nem marcar `revisao_visual_confirmada`.
