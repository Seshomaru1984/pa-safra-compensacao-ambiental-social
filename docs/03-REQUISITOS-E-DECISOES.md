# 03 - Requisitos e decisões do projeto

Aplicação específica da BASE-PROJETOS-WEB-V2 ao PA Safra. Atualizado em 14/09/2026.

## 1. Visão e escopo

O projeto é um portal institucional e informativo do Projeto de Compensação Ambiental e Social - PA Safra, em Nova Xavantina/MT. O site público permanece simples e predominantemente estático. A manutenção editorial deve poder ser feita por pessoa leiga em painel próprio, sem expor infraestrutura, código ou Git.

No contexto territorial do projeto, PA Safra refere-se ao Projeto de Assentamento Banco Safra. O público prioritário permanece formado pelas comunidades de Alvorada, Córrego do Jatobá, Vila do Banco Safra e demais munícipes de Nova Xavantina. Nova Xavantina é o contexto municipal e regional, não deve substituir o foco comunitário.

A entrega administrativa útil é: autenticação nativa, edição controlada de conteúdo autorizado, ferramentas básicas de formatação, upload simples de imagens, pré-visualização/publicação pelo fluxo do projeto e manutenção dos módulos estáveis do portal. A produção continua sujeita às confirmações editoriais/jurídicas e aos gates técnicos aplicáveis.

## 2. Requisitos confirmados

### REQ-001 - Portal público institucional
- Esperado: apresentar conteúdo institucional, palestras, galeria, links úteis, páginas complementares e memória/legado conforme conteúdo aprovado.
- Notícias não integra o escopo operacional.
- Aceitação: build válido, navegação e conteúdo corretos no ambiente correspondente; publicação somente após gates aplicáveis.
- Situação: CONFIRMADO; implementação integrada em `develop`, produção ainda não autorizada.

### REQ-002 - Administração nativa para usuário leigo
- Esperado: `/admin` com interface própria; o administrador comum não edita HTML, CSS, JavaScript, JSON, commits, branches ou configuração Cloudflare.
- Áreas: Página inicial, Sobre o Projeto, Destaques, Palestras e vídeos, Galeria, Links úteis, Memória e legado, Páginas extras e Aparência/rodapé.
- Ferramentas de texto: negrito, itálico, sublinhado, listas, alinhamento esquerdo/centro/direito/justificado, tamanho, cor, links e limpeza de formatação.
- Upload: imagens JPG, PNG ou WebP, com validação server-side e integração direta aos campos existentes de Home, Legado e Galeria.
- Ações finais: cada área deve exibir exatamente um `Salvar` e um `Pré-visualizar`.
- Situação: PASS técnico e integrado em `develop`.

### REQ-003 - Login nativo por usuário e senha
- Esperado: usuário/senha próprios do PA Safra, sem exigir GitHub, Cloudflare ou e-mail do administrador final; senha nunca em texto puro; sessão assinada e cookie seguro.
- Situação: PASS funcional no Cloudflare Preview desde A19 R4 e regressão técnica verde no estado integrado.

### REQ-004 - Rate limiter de autenticação em D1
- Esperado: até 5 falhas em janela de 15 min; bloqueio de 15 min ao atingir limite; 429 com `Retry-After`; identificador derivado antes de persistência; fail-closed se proteção indisponível.
- Situação: PASS funcional live na A20 e regressão técnica verde no estado integrado.

### REQ-005 - Escrita editorial controlada
- Esperado: Pages Function escreve somente arquivos/campos em lista branca, usando token GitHub server-side de privilégio mínimo e branch editorial de Preview durante validação.
- Lista branca: `site`, `videos`, `pages`, `highlights`, `gallery` e `links`. Notícias não é recurso gravável.
- Escritas complementares de `title-styles`, `video-styles` e `layout` permanecem em endpoints próprios e são serializadas com as gravações de conteúdo.
- Situação: PASS para backend/branch editorial; fila de escrita e repetição de 502 transitório validadas e integradas em `develop`.

### REQ-006 - Conteúdo continua nos JSONs versionados
- Esperado: `public/content/*.json` permanece fonte editorial; D1 não substitui conteúdo público.
- Situação: CONFIRMADO.

### REQ-007 - Trava editorial de produção
- Esperado: produção bloqueada enquanto houver qualquer validação obrigatória pendente.
- Situação: CONFIRMADO. `admin_nativo_validado=true` e `dados_contato_confirmados=true`; redação jurídica, direitos de uso das imagens de terceiros, afirmações históricas e revisão visual continuam pendentes.

### REQ-008 - Isolamento de projeto e ambientes
- Esperado: somente `Seshomaru1984/pa-safra-compensacao-ambiental-social`; nenhuma leitura/escrita em repositórios de outros projetos; Preview não autoriza produção.
- Situação: CONFIRMADO.

### REQ-009 - PBKDF2 compatível com Cloudflare Workers
- Esperado: PBKDF2-SHA256 de 100000 iterações nesta arquitetura Workers; registros incompatíveis não podem causar exceção não tratada.
- Situação: PASS.

### REQ-010 - Acesso e localização
- Esperado: disponibilizar informações úteis de acesso às comunidades e às principais rodovias relacionadas à região, sem inventar rotas vicinais ou relações rodoviárias não documentadas.
- Conteúdo sustentado pelas fontes incorporadas: registros municipais situam o P.A. Safra em Nova Xavantina; há referência municipal ao entroncamento BR-158/MT-251 em Nova Xavantina; documento público municipal de Campinápolis indica MT-110 e MT-251 como principais rodovias daquele município.
- Regra editorial: informar que os acessos finais rurais podem depender de vias vicinais, pontes e trechos não pavimentados e que a rota local deve ser confirmada antes do deslocamento.
- Limite factual: sem fonte adicional, não afirmar como fato que a BR-158 é o principal eixo de acesso nem que a MT-251 constitui diretamente uma ligação Nova Xavantina/Campinápolis.
- Implementação: página extra `acesso-localizacao`, publicada e editável no Admin.
- Situação: PASS e integrada em `develop`.

### REQ-011 - Contato, manifestações e correções
- Esperado: disponibilizar canal de contato para manifestações, esclarecimentos, imprecisões e possíveis correções, sem repetição visual desnecessária do endereço.
- Contato confirmado: `gustavomzfranco@hotmail.com`.
- Implementação: página extra `contato`, publicada e editável no Admin; o endereço aparece uma única vez no texto visível e o restante da redação referencia apenas `este canal de contato`.
- Situação: PASS e integrada em `develop`. `dados_contato_confirmados=true`.

### REQ-012 - Informações opcionais de imagem
- Esperado: legenda, crédito e licença podem permanecer vazios no Admin. Campo vazio não deve ser preenchido com aviso artificial de pendência para o público.
- Regra pública: quando não houver nenhuma informação preenchida, o bloco de informações da imagem deve ficar oculto. Quando houver apenas parte dos dados, exibir somente o que foi efetivamente informado.
- Acessibilidade: `image_alt` permanece independente e continua sendo usado mesmo quando a área visual de informações estiver oculta.
- Legado: `image_credit` vazio oculta a legenda da imagem original e da cópia inserida no corpo.
- Galeria: não usar `Registro do projeto` como legenda padrão quando o usuário não informou legenda; não exibir `Crédito/licença a confirmar`, `Crédito editorial a confirmar`, `Créditos em conferência` ou equivalentes como conteúdo público.
- Resiliência: se `/content/site.json` falhar, atribuição estática válida existente no fallback não deve ser apagada.
- Preservação: ao remover um sufixo editorial pendente, eventual texto válido de legenda deve ser mantido.
- Situação: PASS e integrada em `develop` pelo PR #40, com regressões identificadas no review corrigidas e revalidadas pelo PR #41.

## 3. Decisões duráveis

### DEC-001 - Arquitetura editorial
O site público permanece estático e o conteúdo fica em JSONs versionados no GitHub. D1 serve apenas a estado técnico de autenticação/rate limiter.

### DEC-002 - Painel nativo substitui Pages CMS
Pages CMS não é componente arquitetural nem gate de publicação. O painel próprio em `/admin` é a solução vigente.

### DEC-003 - Experiência de autenticação
Administrador final usa usuário e senha próprios do PA Safra; não depende de conta GitHub, Cloudflare ou e-mail.

### DEC-004 - Escrita isolada em branch editorial durante validação
Enquanto a administração estiver em validação, `PA_SAFRA_CONTENT_BRANCH` deve permanecer em `content/pa-v001-admin-preview`; `main` não é destino de teste editorial.

### DEC-005 - Produção protegida por gates reais
CI/build/smoke aprovados não substituem os gates editoriais. `admin_nativo_validado=true` não autoriza publicação em produção.

### DEC-006 - Segurança não será relaxada para obter verde
Não desativar autorização, rate limiter, same-origin ou validações para fazer teste passar.

### DEC-007 - Evidência válida é reutilizada
Não repetir gates funcionais já comprovados sem mudança que invalide a evidência existente.

### DEC-008 - Notícias fora do escopo operacional
Notícias não será mantido como módulo público/administrativo na fase atual. O arquivo `public/content/noticias.json` pode permanecer inerte por compatibilidade, mas não deve ser carregado pelo painel, escrito pela API ou tratado como view pública ativa.

### DEC-009 - Formatação visual controlada
O painel pode oferecer formatação básica de texto sem se transformar em construtor de páginas ou editor de código.

### DEC-010 - Reconstrução limpa foi a base válida da integração
A reconstrução técnica ocorreu em `rebuild/pa-v001-clean` e foi integrada em `develop` pelo PR #39. A branch experimental arquivada serve apenas como referência histórica e não deve ser reintegrada integralmente.

### DEC-011 - Conteúdo editorial atual é sincronizado, não reinventado
A branch `content/pa-v001-admin-preview` e a integração devem manter o mesmo conteúdo editorial corrente quando uma demanda editorial for incorporada fora do Admin, enquanto essa branch continuar sendo o destino administrativo de Preview.

### DEC-012 - Upload de imagem é integrado
Não criar galeria de mídia ou editor paralelo nesta fase. O upload deve complementar os campos de imagem já existentes.

### DEC-013 - Salvamento composto por página
Título, disposição de Home e tamanho de títulos de vídeo integram o salvamento da própria página. Não criar botões internos de salvar/pré-visualizar para esses controles.

### DEC-014 - Escritas editoriais são serializadas
`content`, `title-styles`, `video-styles` e `layout` não devem gravar concorrentemente. Repetição automática é permitida apenas para conflito transitório HTTP 502 dentro da política implementada.

### DEC-015 - Páginas extras recebem novas demandas textuais complementares
Conteúdos complementares como Acesso e Contato devem usar o mecanismo existente de páginas extras quando não exigirem estrutura própria. Isso mantém edição pelo Admin e evita duplicação arquitetural.

### DEC-016 - Integração exige autorização e validação do candidato exato
A reconstrução foi integrada pelo PR #39 mediante autorização explícita. Correções posteriores foram isoladas em PRs próprios para `develop`, com precondição no HEAD validado. Nenhuma dessas integrações autoriza promoção para `main`, alteração de domínio ou publicação em produção.

### DEC-017 - Metadados vazios não viram conteúdo público
A ausência de legenda, crédito ou licença não deve produzir texto de placeholder no site. O bloco de informações da imagem existe somente quando há informação real a exibir. A descrição acessível é independente dessa apresentação.

Essa decisão de interface não equivale a declaração jurídica de autorização/licença de material de terceiros. O gate de direitos de uso permanece independente até existir confirmação correspondente.

### DEC-018 - Feedback técnico de review deve ser tratado antes da liberação manual
Quando um review de PR apontar regressão concreta que afete comportamento esperado, a correção deve ser isolada, validada e integrada antes de declarar o ambiente pronto para testes manuais.

Aplicação em 14/09/2026: o review do PR #40 apontou três regressões. Elas foram corrigidas em branch limpa, protegidas por teste automático, validadas nos runs 1088 e 1092, integradas pelo PR #41 e novamente validadas pós-merge no run 1093.

## 4. Mapeamento de controles atuais

| Requisito | Controle/evidência atual | Estado |
|---|---|---|
| REQ-002 interface | `admin:ui-test`, testes da reconstrução limpa | PASS |
| REQ-003 login/sessão | `admin:auth-test`, A19 R4 | PASS |
| REQ-004 rate limiter | D1 `admin_login_rate`, A20 | PASS |
| REQ-005 escrita | guard de branch, fila de escrita, A21 R3 | PASS |
| REQ-007 trava editorial | `prepublish:check` + `publicacao.json` | PASS para bloqueio enquanto pendente |
| REQ-008 isolamento | repo/branches exatos | VERIFICADO |
| REQ-009 PBKDF2 | diagnóstico runtime + 100000 + R4 | PASS |
| REQ-010 acesso/localização | `tools/editorial-demand-test.mjs` + runs 1071/1072 | PASS |
| REQ-011 contato/correções | `tools/editorial-demand-test.mjs` + `publicacao.json` + runs 1071/1072 | PASS |
| REQ-012 informações de imagem | `tools/editorial-demand-test.mjs` + runs 1088/1092/1093 + headless | PASS e integrado |
| Notícias fora do escopo | `admin-contract`, `check.mjs`, browser tests | PASS |

## 5. Gates editoriais atuais

- `redacao_juridica_confirmada=false`.
- `creditos_imagens_confirmados=false`.
- `dados_contato_confirmados=true`.
- `afirmacoes_historicas_confirmadas=false`.
- `revisao_visual_confirmada=false`.
- `admin_nativo_validado=true`.

A política de ocultar campos vazios não altera sozinha `creditos_imagens_confirmados`. Esse gate representa confirmação de direitos de uso, não a existência visual de um campo de crédito.

Os gates editoriais pendentes bloqueiam `main`/produção, mas não impedem a execução dos testes manuais em Preview/develop. Revisão técnica/headless não equivale a revisão visual humana.

## 6. Estado corrente e continuidade

A reconstrução limpa foi integrada pelo PR #39. A política de informações opcionais de imagem foi integrada pelo PR #40, merge `d9b33595940af2680b3921787d499c1644d5f366`, e o pós-merge passou no run 1084.

O review automático do PR #40 identificou três problemas relevantes antes da entrega manual: perda de texto válido da legenda ao remover crédito pendente, permanência do banner de créditos pendentes na Galeria e perda da atribuição estática de fallback do Legado em falha de `site.json`.

As três regressões foram corrigidas no HEAD `53aa20381845028f6adc8f3b4372721c691a3e31`. Esse candidato passou no run 1088 e no CI do PR #41, run 1092. O PR #41 foi mesclado em `develop`, resultando no commit `04cedf23fdc8c8127d5ed8606c9fff0f9a762e72`. O estado pós-merge passou integralmente no run 1093, incluindo build, smoke e navegador headless.

Não houve nova pendência de review no PR #41 antes do fechamento técnico.

O estado de `develop` está tecnicamente pronto para testes manuais no ambiente de Preview/develop. A próxima etapa é revisão humana do Admin e do site, incluindo desktop e celular, salvamentos consecutivos, upload de imagens e os cenários de informações de imagem vazias, parciais e preenchidas.

Evidências relevantes:
- `docs/evidencias/PA-V001-A21-R3-CONTENT-WRITE-PASS-20260913.md`
- `docs/evidencias/PA-V001-A22-ADMIN-UI-FLOW-PASS-20260913.md`
- `docs/evidencias/PA-V001-A23-AUDITORIA-BLOQUEIOS-EDITORIAIS-20260913.md`
- `docs/evidencias/PA-V001-A24-ADMIN-EDITOR-EXPANDIDO-PASS-20260913.md`
- `docs/evidencias/PA-V001-IMAGE-INFO-OPTIONAL-PASS-20260914.md`

## 7. Próxima ação

Realizar os testes manuais em Preview/develop e registrar divergências observadas. A revisão deve abranger Admin, conteúdo público, comportamento de imagens, vídeos, links, pré-visualização e responsividade.

Não promover automaticamente para `main`. Qualquer promoção para produção exige nova autorização específica e atendimento dos gates aplicáveis.
