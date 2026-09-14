# 02 - Identidade e estado do projeto

Atualizado em 14/09/2026. Este arquivo registra o checkpoint técnico corrente do projeto PA Safra.

## 1. Identidade e fronteiras

| Campo | Estado atual |
|---|---|
| Nome do projeto | Projeto de Compensação Ambiental e Social - PA Safra |
| Identificador curto | `pa-safra-compensacao-ambiental-social` |
| Contexto territorial | PA Safra refere-se ao Projeto de Assentamento Banco Safra, no município de Nova Xavantina/MT; não indica vínculo com instituição bancária comercial |
| Público prioritário | Comunidades de Alvorada, Córrego do Jatobá, Vila do Banco Safra e demais munícipes de Nova Xavantina |
| Repositório | `Seshomaru1984/pa-safra-compensacao-ambiental-social` |
| Branch de integração | `develop` |
| Branch de reconstrução | `rebuild/pa-v001-clean`, preservada como histórico do candidato já integrado |
| Branch editorial de Preview | `content/pa-v001-admin-preview` |
| Branch problemática arquivada | `archive/pa-v001-experimental-20260914` |
| Produção | `main`, protegida pelos gates editoriais vigentes |
| Administração | `/admin`, com login próprio e nove áreas editoriais |
| Escopo atual | P1 concluída em `develop`; produção continua fora do escopo autorizado enquanto houver gates editoriais pendentes |

A versão problemática permanece somente como referência histórica. Ela não deve ser reintegrada integralmente nem usada como nova base de desenvolvimento.

## 2. Decisões operacionais vigentes

- O candidato reconstruído em `rebuild/pa-v001-clean` foi integrado em `develop` pelo PR #39 em 14/09/2026.
- Preservar e sincronizar o conteúdo editorial atual com `content/pa-v001-admin-preview` enquanto esse continuar sendo o destino administrativo de Preview.
- Notícias permanece fora da interface pública e da lista branca de escrita.
- Upload de imagens do Admin deve ser simples e integrado aos campos existentes, sem editor paralelo.
- Cada área administrativa deve expor um único `Salvar` e um único `Pré-visualizar` como ações finais.
- Controles de título, disposição da Home e tamanho dos títulos de vídeo participam do salvamento da própria página, sem fluxos concorrentes independentes.
- Gravações editoriais em `content`, `title-styles`, `video-styles` e `layout` são serializadas e repetem somente conflitos transitórios HTTP 502 dentro da política vigente.
- As páginas extras são o mecanismo vigente para conteúdo complementar editável, inclusive `Acesso` e `Contato`.
- A integração da reconstrução ocorreu por um único PR, `#39`, de `rebuild/pa-v001-clean` para `develop`.
- A autorização explícita dada em 14/09/2026 foi consumida somente para o merge em `develop`. Ela não se estende a `main`, domínio ou publicação em produção.

## 3. Demandas editoriais incorporadas em 14/09/2026

### Acesso e localização

Foi adicionada a página `Acesso`, editável pelo Admin, contendo somente formulações sustentadas pelas referências públicas incorporadas:

- referência territorial ao PA Safra no município de Nova Xavantina/MT;
- referência municipal ao entroncamento BR-158/MT-251 em Nova Xavantina;
- MT-110 e MT-251 indicadas como principais rodovias de Campinápolis em documento público municipal;
- alerta de que o acesso final às comunidades pode depender de estradas vicinais, pontes e trechos não pavimentados, devendo a rota local ser confirmada antes do deslocamento;
- referências públicas no próprio conteúdo.

Não afirmar como fato, sem fonte adicional, que a BR-158 é o principal eixo rodoviário de acesso nem que a MT-251 constitui diretamente uma ligação Nova Xavantina/Campinápolis.

### Contato, manifestações e correções

Foi adicionada a página `Contato`, editável pelo Admin, com o endereço confirmado `gustavomzfranco@hotmail.com` e o texto aprovado para manifestações, esclarecimentos, imprecisões e possíveis correções. O endereço aparece uma única vez no texto visível.

O gate `dados_contato_confirmados` passou para `true`. Isso não autoriza produção, pois os demais gates obrigatórios continuam independentes.

## 4. Checkpoint corrente

| Campo | Estado |
|---|---|
| Revisado em | 14/09/2026 |
| Fase atual | P1 concluída em `develop`; produção não iniciada |
| PR de integração | `#39` - fechado e mesclado |
| HEAD do candidato integrado | `a7e5c5d11241ac8fa46dd29fea7cab3c438e81c7` |
| Commit de integração em `develop` | `5b5c60983875341b3d9f6b5bfe6c684a68d08d5e` |
| Base anterior de `develop` | `e485f9270ef81680609d5fa2f1b9430ceaa4dbc0` |
| CI final do PR | workflow `validate`, run `34901601723`, run number `1071`, SUCCESS |
| CI pós-merge em `develop` | workflow `validate`, run `34901699296`, run number `1072`, SUCCESS |
| Conteúdo editorial atual sincronizado | VERIFICADO no candidato integrado |
| Upload simples de imagens | IMPLEMENTADO e VALIDADO TECNICAMENTE |
| Foto de Wolnei e Memória e legado | IMPLEMENTADO e VALIDADO NO BUILD/HEADLESS |
| Um Salvar + um Pré-visualizar por área | IMPLEMENTADO e VALIDADO NO HEADLESS |
| Títulos, texto e vídeos | REVISADOS e VALIDADOS TECNICAMENTE |
| 1º, 2º e 3º salvamentos consecutivos | PASS em teste de fila e cenário headless da Home |
| Revisão técnica visual Admin/site | PASS em 1440 px e 390 px no cenário headless |
| Acesso e localização | INCORPORADO, REVISADO CONTRA FONTES e protegido por teste automático |
| Contato e aviso de correções | INCORPORADO e protegido por teste automático |
| Integração em `develop` | VERIFICADA pelo PR #39 e commit de merge |
| Publicação em `main` | NÃO AUTORIZADA |
| Publicação em produção | NÃO EXECUTADA |

A integração em `develop` não equivale a publicação em produção. Não houve promoção para `main`, alteração de domínio ou declaração de versão pública.

## 5. Evidências técnicas preservadas

- A21: `docs/evidencias/PA-V001-A21-R3-CONTENT-WRITE-PASS-20260913.md`.
- A22: `docs/evidencias/PA-V001-A22-ADMIN-UI-FLOW-PASS-20260913.md`.
- A23: `docs/evidencias/PA-V001-A23-AUDITORIA-BLOQUEIOS-EDITORIAIS-20260913.md`.
- A24: `docs/evidencias/PA-V001-A24-ADMIN-EDITOR-EXPANDIDO-PASS-20260913.md`.
- Reconstrução limpa: upload simples, sincronização editorial, foto de Wolnei, ações unificadas, controles integrados, fila de escrita e teste headless responsivo.
- `tools/editorial-demand-test.mjs`: exige as páginas `Acesso` e `Contato`, referências rodoviárias previstas, e-mail visível uma única vez e estado correto dos gates.
- Run 1071: validação completa do HEAD final do PR antes do merge.
- Run 1072: validação completa do commit de integração já presente em `develop`.

## 6. Gates editoriais atuais

| Gate | Estado |
|---|---|
| `redacao_juridica_confirmada` | `false` |
| `creditos_imagens_confirmados` | `false` |
| `dados_contato_confirmados` | `true` |
| `afirmacoes_historicas_confirmadas` | `false` |
| `revisao_visual_confirmada` | `false` |
| `admin_nativo_validado` | `true` |

Produção deve permanecer bloqueada enquanto qualquer gate obrigatório restante estiver pendente. Validação headless não substitui aprovação visual humana.

## 7. Recuperação e próxima ação

O commit de integração `5b5c60983875341b3d9f6b5bfe6c684a68d08d5e` possui como pais a base anterior de `develop` e o HEAD validado da reconstrução, permitindo identificar precisamente a integração caso seja necessário avaliar uma reversão. Nenhuma reversão é necessária no estado atual.

Próxima ação: tratar os gates editoriais restantes de forma independente - redação jurídica, créditos/licenças das imagens, afirmações históricas e revisão visual humana. Somente depois dessas confirmações, e mediante autorização específica para a próxima promoção, avaliar integração/publicação em `main`. Não promover automaticamente.