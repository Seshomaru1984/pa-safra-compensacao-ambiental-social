# 03 — Requisitos e decisões do projeto

Aplicação específica da BASE-PROJETOS-WEB-V2 ao PA Safra. Atualizado em 12/09/2026.

## 1. Visão e escopo

O projeto é um portal institucional e informativo do Projeto de Compensação Ambiental e Social — PA Safra, em Nova Xavantina/MT. O site público permanece simples e predominantemente estático. A manutenção editorial deve poder ser feita por pessoa leiga em painel próprio, sem expor infraestrutura, código ou Git.

A primeira entrega administrativa útil é: autenticação nativa, edição controlada de conteúdo autorizado, pré-visualização e publicação versionada pelo fluxo do projeto. A produção continua sujeita às confirmações editoriais/jurídicas e aos gates técnicos aplicáveis.

## 2. Requisitos confirmados

### REQ-001 — Portal público institucional
- **Origem:** escopo do projeto e README.
- **Esperado:** apresentar conteúdo institucional, palestras, notícias, galeria, links úteis e memória/legado conforme conteúdo aprovado.
- **Aceitação:** build válido, navegação e conteúdo corretos no ambiente correspondente; publicação somente após gates aplicáveis.
- **Situação:** CONFIRMADO; implementação pública existente, revisão final ainda pendente.

### REQ-002 — Administração nativa para usuário leigo
- **Origem:** decisão consolidada em `ADR-0002-ADMIN-NATIVO.md`.
- **Esperado:** `/admin` com interface própria; o administrador comum não edita HTML, CSS, JavaScript, JSON, commits, branches ou configuração Cloudflare.
- **Aceitação:** fluxo `Editar → Pré-visualizar → Publicar` funcional nos campos autorizados.
- **Situação:** CONFIRMADO; implementação parcial; validação funcional ainda não concluída.

### REQ-003 — Login nativo por usuário e senha
- **Origem:** ADR-0002.
- **Esperado:** usuário/senha próprios do PA Safra, sem exigir GitHub, Cloudflare ou e-mail do administrador final; senha nunca em texto puro; sessão assinada e cookie seguro.
- **Aceitação:** login válido retorna sucesso e cria sessão; credencial inválida retorna 401; origem inválida é rejeitada; logout encerra a sessão; cookie é `HttpOnly`, `Secure`, `SameSite=Strict`.
- **Situação:** CONFIRMADO; login real, sessão e logout passaram no Cloudflare Preview após a correção PBKDF2 R4. O cenário live de credencial inválida/lockout pertence ao REQ-004 e ainda será testado em gate próprio.

### REQ-004 — Rate limiter de autenticação em D1
- **Origem:** ADR-0002 e A18.
- **Esperado:** até 5 falhas em janela de 15 min; bloqueio de 15 min ao atingir limite; 429 com `Retry-After`; identificador derivado antes de persistência; fail-closed se proteção indisponível.
- **Aceitação:** quatro falhas iniciais com 401; quinta falha com 429 + `Retry-After`; credencial correta continua bloqueada durante o lock; estado de teste é removido de forma controlada; login correto volta a funcionar após a limpeza.
- **Situação:** CONFIRMADO; D1/schema e testes unitários PASS; comportamento live completo ainda PENDENTE.

### REQ-005 — Escrita editorial controlada
- **Origem:** ADR-0002.
- **Esperado:** Pages Function escreve somente arquivos/campos em lista branca, usando token GitHub server-side de privilégio mínimo e branch editorial de Preview durante validação.
- **Aceitação:** sessão válida + token restrito + branch `content/pa-v001-admin-preview`; nenhuma escrita direta em `main` no teste inicial.
- **Situação:** CONFIRMADO; escrita deliberadamente BLOQUEADA porque `GITHUB_CONTENT_TOKEN` ainda não está configurado.

### REQ-006 — Conteúdo continua nos JSONs versionados
- **Origem:** ADR-0002.
- **Esperado:** `public/content/*.json` permanece fonte editorial; D1 não substitui conteúdo público.
- **Situação:** CONFIRMADO.

### REQ-007 — Trava editorial de produção
- **Origem:** `public/content/publicacao.json` e checklist de pré-publicação.
- **Esperado:** produção bloqueada enquanto houver pendências de redação jurídica, créditos/licenças de imagens, contato, afirmações históricas, revisão visual e admin nativo validado.
- **Situação:** CONFIRMADO; bloqueio vigente.

### REQ-008 — Isolamento de projeto e ambientes
- **Origem:** instrução do usuário e governança do projeto.
- **Esperado:** somente `Seshomaru1984/pa-safra-compensacao-ambiental-social`; nenhuma leitura/escrita em repositórios de outros projetos; Preview não autoriza produção.
- **Situação:** CONFIRMADO.

### REQ-009 — PBKDF2 compatível com Cloudflare Workers
- **Origem:** F1 A19 + diagnóstico runtime `a19-runtime-diagnostic` + limitação do workerd/Workers observada no incidente.
- **Esperado:** PBKDF2-SHA256 de 100000 iterações nesta arquitetura Workers; registros com contagem incompatível não podem causar exceção não tratada.
- **Aceitação:** hash 100000 autentica no Preview real; hash incompatível falha fechado em JSON controlado; nenhuma exceção `Worker threw exception`.
- **Situação:** PASS. A R4 renovou somente o hash de Preview e o login real passou no runtime.

## 3. Decisões duráveis

### DEC-001 — Arquitetura editorial
O site público permanece estático e o conteúdo fica em JSONs versionados no GitHub. D1 serve apenas a estado técnico de autenticação/rate limiter.

### DEC-002 — Painel nativo substitui Pages CMS
Pages CMS não é componente arquitetural nem gate de publicação. O painel próprio em `/admin` é a solução vigente.

### DEC-003 — Experiência de autenticação
Administrador final usa usuário e senha próprios do PA Safra; não depende de conta GitHub, Cloudflare ou e-mail.

### DEC-004 — Escrita inicialmente isolada em branch editorial
Durante validação, qualquer escrita futura deve apontar para `content/pa-v001-admin-preview`; `main` não é destino de teste de edição.

### DEC-005 — Produção protegida por gates reais
CI/build/smoke aprovados não substituem F1. `admin_nativo_validado` só pode ser `true` após login, sessão, logout, rate limiter e fluxo de edição/publicação terem evidência funcional suficiente.

### DEC-006 — Procedimento operacional após falhas recorrentes
Scripts que dependam da máquina do usuário devem existir primeiro no repositório, passar parser e CI e ser entregues como um único executor canônico. Após duas tentativas sem avanço, revisar a abordagem; não criar variações sucessivas por tentativa e erro.

### DEC-007 — Segurança não será relaxada para obter verde
Não desativar autorização, rate limiter, same-origin ou validações para fazer o teste passar. Mudança de estratégia criptográfica exige justificativa compatível com o ambiente e novo T1/F1.

### DEC-008 — PBKDF2 no Workers
Nesta fase, PBKDF2-SHA256 fica fixado em 100000 iterações por compatibilidade com o runtime Workers observado. O valor anterior de 310000 é inválido para este ambiente. Não usar PBKDF2 intensivo em JavaScript como contorno. Endurecimento futuro pode avaliar arquitetura/KDF diferente sem reintroduzir incompatibilidade de runtime.

### DEC-009 — R4 encerrada como correção funcional
`tools/PA-SAFRA-A19-R4-CORRIGIR-PBKDF2-PREVIEW.ps1` cumpriu o gate de correção do login. R2/R3/R4 permanecem como histórico operacional e não devem ser reexecutadas sem motivo técnico novo.

## 4. Mapeamento de controles atuais

| Requisito | Controle/evidência atual | Estado |
|---|---|---|
| REQ-003 login/sessão | `admin:auth-test`; R4 no Preview real | PASS funcional para login/sessão/logout |
| REQ-004 rate limiter | D1 `admin_login_rate`; testes locais | Infra/schema/unitário PASS; live completo PENDENTE |
| REQ-005 escrita | `GITHUB_CONTENT_TOKEN` ausente + status remoto `write_enabled=false` | PASS para bloqueio de escrita |
| REQ-007 trava editorial | `prepublish:check` + `publicacao.json` | PASS para bloqueio enquanto pendente |
| REQ-008 isolamento | remote/repo exatos + PR draft A19 | VERIFICADO |
| REQ-009 compatibilidade PBKDF2 | diagnóstico runtime + 100000 + R4 real | PASS |

## 5. Pendências que não devem ser inferidas como aprovadas

- `redacao_juridica_confirmada=false`.
- `creditos_imagens_confirmados=false`.
- `dados_contato_confirmados=false`.
- `afirmacoes_historicas_confirmadas=false`.
- `revisao_visual_confirmada=false`.
- `admin_nativo_validado=false`.
- Rate limiter live ainda não comprovado ponta a ponta no Preview.
- Token GitHub de escrita administrativa ainda não configurado.
- Fluxo real de edição/pré-visualização/publicação ainda não validado.
- Produção, domínio e DNS continuam fora do escopo atual.

## 6. Mudança corrente

O defeito HTTP 500 do login foi corrigido e a R4 comprovou no Cloudflare Preview: build formal PASS, hash PBKDF2-SHA256/100000 renovado, deploy concluído, login real PASS, sessão PASS, escrita GitHub ainda bloqueada e logout PASS. Evidências: `docs/evidencias/PA-V001-A19-PBKDF2-CLOUDFLARE-20260912.md` e `docs/evidencias/PA-V001-A19-R4-PREVIEW-AUTH-PASS-20260912.md`.

O próximo gate é exclusivamente o rate limiter live em D1. Ele não deve habilitar escrita editorial nem tocar produção, `main`, `develop`, domínio ou DNS.
