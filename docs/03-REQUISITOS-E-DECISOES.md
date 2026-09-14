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
- Situação: PASS funcional no Cloudflare Preview desde A19 R4 e regressão técnica verde no candidato integrado.

### REQ-004 - Rate limiter de autenticação em D1
- Esperado: até 5 falhas em janela de 15 min; bloqueio de 15 min ao atingir limite; 429 com `Retry-After`; identificador derivado antes de persistência; fail-closed se proteção indisponível.
- Situação: PASS funcional live na A20 e regressão técnica verde no candidato integrado.

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
- Situação: PASS no candidato final e integrada em `develop`.

### REQ-011 - Contato, manifestações e correções
- Esperado: disponibilizar canal de contato para manifestações, esclarecimentos, imprecisões e possíveis correções, sem repetição visual desnecessária do endereço.
- Contato confirmado: `gustavomzfranco@hotmail.com`.
- Implementação: página extra `contato`, publicada e editável no Admin; o endereço aparece uma única vez no texto visível e o restante da redação referencia apenas `este canal de contato`.
- Situação: PASS no candidato final e integrada em `develop`. `dados_contato_confirmados=true`.

### REQ-012 - Informações opcionais de imagem
- Esperado: legenda, crédito e licença podem permanecer vazios no Admin. Campo vazio não deve ser preenchido com aviso artificial de pendência para o público.
- Regra pública: quando não houver nenhuma informação preenchida, o bloco de informações da imagem deve ficar oculto. Quando houver apenas parte dos dados, exibir somente o que foi efetivamente informado.
- Acessibilidade: `image_alt` permanece independente e continua sendo usado mesmo quando a área visual de informações estiver oculta.
- Legado: `image_credit` vazio oculta a legenda da imagem original e da cópia inserida no corpo.
- Galeria: não usar `Registro do projeto` como legenda padrão quando o usuário não informou legenda; não exibir `Crédito/licença a confirmar`, `Crédito editorial a confirmar` ou equivalentes como conteúdo.
- Situação: CORREÇÃO IMPLEMENTADA em `fix/pa-v001-image-info-optional`; validação funcional run 1078 PASS antes do fechamento documental.

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

### DEC-016 - Integração por um único PR e autorização explícita
A reconstrução foi integrada por um único PR de `rebuild/pa-v001-clean` para `develop`, o PR #39. Em 14/09/2026 o usuário autorizou explicitamente esse merge, exigindo observância das regras anexas. O merge foi executado com precondição no HEAD validado e resultou no commit `5b5c60983875341b3d9f6b5bfe6c684a68d08d5e`. Essa autorização foi consumida nessa integração e não autoriza promoção para `main`, domínio ou publicação em produção.

### DEC-017 - Metadados vazios não viram conteúdo público
A ausência de legenda, crédito ou licença não deve produzir texto de placeholder no site. O bloco de informações da imagem existe somente quando há informação real a exibir. A descrição acessível é independente dessa apresentação.

Essa decisão de interface não equivale a declaração jurídica de autorização/licença de material de terceiros. O gate de direitos de uso permanece independente até existir confirmação correspondente.

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
| REQ-012 informações de imagem | `tools/editorial-demand-test.mjs` + run 1078 + headless | PASS no HEAD funcional anterior à documentação |
| Notícias fora do escopo | `admin-contract`, `check.mjs`, browser tests | PASS |

## 5. Gates editoriais atuais

- `redacao_juridica_confirmada=false`.
- `creditos_imagens_confirmados=false`.
- `dados_contato_confirmados=true`.
- `afirmacoes_historicas_confirmadas=false`.
- `revisao_visual_confirmada=false`.
- `admin_nativo_validado=true`.

A política de ocultar campos vazios não altera sozinha `creditos_imagens_confirmados`. Esse gate representa confirmação de direitos de uso, não a existência visual de um campo de crédito.

O contato confirmado não libera produção. Revisão técnica/headless não equivale a revisão visual humana.

## 6. Estado corrente e continuidade

A reconstrução limpa foi integrada em `develop` pelo PR #39 e validada novamente após o merge. Em seguida, foi aberta a branch `fix/pa-v001-image-info-optional` a partir do checkpoint `d656ef76c2bdb65e5e49d8ec71e8259e11fc3041` para corrigir a apresentação de informações de imagem.

A correção remove placeholders públicos de crédito/licença, oculta blocos vazios, preserva `alt` e sincroniza a galeria da branch editorial de Preview. O HEAD funcional `cf934bbfa138bc8ec6badc492e2cc7127b7d0399` passou no workflow `validate`, run 1078, incluindo build, smoke e navegador headless. A documentação posterior altera o HEAD e exige nova validação.

Evidências relevantes:
- `docs/evidencias/PA-V001-A21-R3-CONTENT-WRITE-PASS-20260913.md`
- `docs/evidencias/PA-V001-A22-ADMIN-UI-FLOW-PASS-20260913.md`
- `docs/evidencias/PA-V001-A23-AUDITORIA-BLOQUEIOS-EDITORIAIS-20260913.md`
- `docs/evidencias/PA-V001-A24-ADMIN-EDITOR-EXPANDIDO-PASS-20260913.md`
- `docs/evidencias/PA-V001-IMAGE-INFO-OPTIONAL-PASS-20260914.md`

Próxima ação: validar o HEAD documental final da branch `fix/pa-v001-image-info-optional`; se permanecer verde e 0 commits atrás de `develop`, abrir PR específico para `develop`. Não mesclar automaticamente e não promover para `main` sem nova autorização específica.
