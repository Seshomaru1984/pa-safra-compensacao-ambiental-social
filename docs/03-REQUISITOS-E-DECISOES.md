# 03 — Requisitos e decisões do projeto

Aplicação específica da BASE-PROJETOS-WEB-V2 ao PA Safra. Atualizado em 13/09/2026.

## 1. Visão e escopo

O projeto é um portal institucional e informativo do Projeto de Compensação Ambiental e Social — PA Safra, em Nova Xavantina/MT. O site público permanece simples e predominantemente estático. A manutenção editorial deve poder ser feita por pessoa leiga em painel próprio, sem expor infraestrutura, código ou Git.

A entrega administrativa útil é: autenticação nativa, edição controlada de conteúdo autorizado, ferramentas básicas de formatação, pré-visualização/publicação pelo fluxo do projeto e manutenção dos módulos estáveis do portal. A produção continua sujeita às confirmações editoriais/jurídicas e aos gates técnicos aplicáveis.

## 2. Requisitos confirmados

### REQ-001 — Portal público institucional
- **Esperado:** apresentar conteúdo institucional, palestras, galeria, links úteis, páginas complementares e memória/legado conforme conteúdo aprovado.
- **Decisão A24:** Notícias não integra mais o escopo operacional, pois exigiria atualização contínua e poderia transmitir aparência de abandono se ficasse desatualizado.
- **Aceitação:** build válido, navegação e conteúdo corretos no ambiente correspondente; publicação somente após gates aplicáveis.
- **Situação:** CONFIRMADO; implementação pública existente, revisão final ainda pendente.

### REQ-002 — Administração nativa para usuário leigo
- **Esperado:** `/admin` com interface própria; o administrador comum não edita HTML, CSS, JavaScript, JSON, commits, branches ou configuração Cloudflare.
- **A24:** nove áreas administrativas: Página inicial, Sobre o Projeto, Destaques, Palestras e vídeos, Galeria, Links úteis, Memória e legado, Páginas extras e Aparência/rodapé.
- **Ferramentas de texto A24:** negrito, itálico, sublinhado, listas, alinhamento esquerdo/centro/direito/justificado, tamanho, cor, links e limpeza de formatação.
- **Aceitação:** edição/publicação funcional nos campos autorizados, com validação do payload e teste de navegador.
- **Situação:** PASS técnico A24 no CI; run `34764155874` validou as nove áreas e o editor ampliado em Chrome headless.

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
- **A24:** lista branca aceita apenas `site`, `videos`, `pages`, `highlights`, `gallery` e `links`. Notícias não é recurso gravável.
- **Aceitação:** sessão válida + token restrito + branch `content/pa-v001-admin-preview`; nenhuma escrita direta em `main` no teste inicial; validação de formato/tamanho e conteúdo rico.
- **Situação:** backend/branch editorial previamente PASS live na A21 R3; regressão e expansão de contrato PASS no CI A24.

### REQ-006 — Conteúdo continua nos JSONs versionados
- **Esperado:** `public/content/*.json` permanece fonte editorial; D1 não substitui conteúdo público.
- **A24:** `links.json` passa a representar os links úteis existentes; `site.json` passa a representar também Memória e legado sem reescrita do conteúdo histórico.
- **Situação:** CONFIRMADO.

### REQ-007 — Trava editorial de produção
- **Esperado:** produção bloqueada enquanto houver qualquer validação obrigatória pendente.
- **Situação:** CONFIRMADO; `admin_nativo_validado=true`, mas redação jurídica, créditos/licenças de imagens, contato, afirmações históricas e revisão visual continuam pendentes.

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
CI/build/smoke aprovados não substituem F1. `admin_nativo_validado` só pode ser `true` após login, sessão, logout, rate limiter, escrita editorial e fluxo de interface terem evidência funcional suficiente. Esse conjunto foi concluído por A19+A20+A21+A22 e continua protegido por regressões A23/A24.

### DEC-006 — Procedimento operacional após falhas recorrentes
Scripts que dependam da máquina do usuário devem existir primeiro no repositório, passar parser e CI e ser entregues como um único executor canônico. Após duas tentativas sem avanço, revisar a abordagem; não criar variações sucessivas por tentativa e erro.

### DEC-007 — Segurança não será relaxada para obter verde
Não desativar autorização, rate limiter, same-origin ou validações para fazer o teste passar.

### DEC-008 — PBKDF2 no Workers
Nesta fase, PBKDF2-SHA256 fica fixado em 100000 iterações por compatibilidade com o runtime Workers observado.

### DEC-009 — Evidência válida é reutilizada
Não repetir build, deploy, secrets ou gates já comprovados sem mudança que invalide a evidência existente.

### DEC-010 — Notícias fora do escopo operacional
Notícias não será mantido como módulo público/administrativo na fase atual. A justificativa é editorial e operacional: conteúdo noticioso cria expectativa de atualização constante. O arquivo `public/content/noticias.json` pode permanecer inerte por compatibilidade, mas não deve ser carregado pelo painel, escrito pela API ou tratado como view pública ativa.

### DEC-011 — Formatação visual controlada
O painel pode oferecer formatação básica de texto sem se transformar em construtor de páginas ou editor de código. O backend rejeita scripts, handlers, protocolos e estilos arbitrários; somente formatação editorial básica é aceita.

## 4. Mapeamento de controles atuais

| Requisito | Controle/evidência atual | Estado |
|---|---|---|
| REQ-002 interface | `admin:ui-test`; A24 Chrome headless | PASS técnico |
| REQ-003 login/sessão | `admin:auth-test`; A19 R4 no Preview real | PASS |
| REQ-004 rate limiter | D1 `admin_login_rate`; A20 live | PASS |
| REQ-005 escrita | guard de branch + A21 R3 live + contrato A24 | PASS para backend/branch editorial |
| REQ-007 trava editorial | `prepublish:check` + `publicacao.json` | PASS para bloqueio enquanto pendente |
| REQ-008 isolamento | remote/repo exatos + PRs encadeadas | VERIFICADO |
| REQ-009 compatibilidade PBKDF2 | diagnóstico runtime + 100000 + R4 real | PASS |
| Notícias fora do escopo | `admin-contract`, `check.mjs`, A24 browser test | PASS |

## 5. Pendências que não devem ser inferidas como aprovadas

- `redacao_juridica_confirmada=false`.
- `creditos_imagens_confirmados=false`.
- `dados_contato_confirmados=false`.
- `afirmacoes_historicas_confirmadas=false`.
- `revisao_visual_confirmada=false`.
- `admin_nativo_validado=true` conclui o gate técnico do painel; não equivale a revisão visual/editorial.
- A24 amplia a capacidade editorial, mas não autoriza reescrita automática de conteúdo jurídico, biográfico ou histórico.
- Produção, domínio e DNS continuam fora do escopo atual.

## 6. Estado corrente

A19 R4: login/sessão/logout live PASS.

A20: rate limiter D1 live PASS.

A21 R3: escrita editorial live PASS no Preview, com mutação temporária, confirmação GitHub, restauração integral e logout.

A22: fluxo técnico da interface PASS em Chrome headless para a primeira fase.

A23: auditoria de bloqueios editoriais PASS, sem promover qualquer gate editorial.

A24: painel expandido para nove áreas, Notícias fora do escopo operacional e editor de texto rico controlado. GitHub Actions `validate`, run `34764155874`, HEAD `388ec6e8fa5ec2b0dd1f05b7d9e9eebce3eaac1b`: SUCCESS antes da documentação final.

Evidências:
- `docs/evidencias/PA-V001-A21-R3-CONTENT-WRITE-PASS-20260913.md`
- `docs/evidencias/PA-V001-A22-ADMIN-UI-FLOW-PASS-20260913.md`
- `docs/evidencias/PA-V001-A23-AUDITORIA-BLOQUEIOS-EDITORIAIS-20260913.md`
- `docs/evidencias/PA-V001-A24-ADMIN-EDITOR-EXPANDIDO-PASS-20260913.md`

O próximo passo técnico, se necessário, é validar a A24 no Preview real antes de qualquer promoção. As pendências editoriais/jurídicas continuam independentes e produção permanece bloqueada.
