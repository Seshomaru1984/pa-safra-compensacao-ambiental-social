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
| Branch de reconstrução | `rebuild/pa-v001-clean` |
| Branch editorial de Preview | `content/pa-v001-admin-preview` |
| Branch problemática arquivada | `archive/pa-v001-experimental-20260914` |
| Produção | `main`, protegida pelos gates editoriais vigentes |
| Administração | `/admin`, com login próprio e nove áreas editoriais |
| Escopo atual | Reconstrução limpa do fluxo editorial/Admin antes de um único PR para `develop` |

A versão problemática permanece somente como referência histórica. Ela não deve ser reintegrada integralmente nem usada como base de desenvolvimento.

## 2. Decisões operacionais vigentes

- Reconstruir somente sobre `rebuild/pa-v001-clean`.
- Preservar e sincronizar o conteúdo editorial atual com `content/pa-v001-admin-preview`.
- Notícias permanece fora da interface pública e da lista branca de escrita.
- Upload de imagens do Admin deve ser simples e integrado aos campos existentes, sem editor paralelo.
- Cada área administrativa deve expor um único `Salvar` e um único `Pré-visualizar` como ações finais.
- Controles de título, disposição da Home e tamanho dos títulos de vídeo participam do salvamento da própria página, sem fluxos concorrentes independentes.
- Gravações editoriais em `content`, `title-styles`, `video-styles` e `layout` são serializadas e repetem somente conflitos transitórios HTTP 502 dentro da política vigente.
- As páginas extras são o mecanismo vigente para conteúdo complementar editável, inclusive `Acesso` e `Contato`.
- Somente depois da validação completa da reconstrução deve existir um único PR, com base `develop`.

## 3. Demandas editoriais incorporadas em 14/09/2026

### Acesso e localização

Foi adicionada a página `Acesso`, editável pelo Admin, contendo:

- referência territorial às comunidades atendidas em Nova Xavantina/MT;
- BR-158 como eixo principal de acesso ao município;
- MT-251 como ligação regional entre Nova Xavantina e Campinápolis;
- MT-110 e MT-251 como principais rodovias de Campinápolis conforme fonte pública municipal;
- alerta de que o acesso final às comunidades pode depender de estradas vicinais, pontes e trechos não pavimentados, devendo a rota local ser confirmada antes do deslocamento;
- referências públicas no próprio conteúdo.

### Contato, manifestações e correções

Foi adicionada a página `Contato`, editável pelo Admin, com o endereço confirmado `gustavomzfranco@hotmail.com` e o texto aprovado para manifestações, esclarecimentos, imprecisões e possíveis correções. O endereço aparece uma única vez no texto visível.

O gate `dados_contato_confirmados` passou para `true`. Isso não autoriza produção, pois os demais gates obrigatórios continuam independentes.

## 4. Checkpoint corrente

| Campo | Estado |
|---|---|
| Revisado em | 14/09/2026 |
| Fase atual | P1 - preparação da integração via PR |
| Base protegida | `rebuild/pa-v001-clean` |
| Último candidato técnico verde anterior às demandas editoriais | `7be1b752c224c3c5affe7672b7b8f2125bfd0781` |
| Run verde anterior | workflow `validate`, run `34898987712`, run number `1052` |
| Último commit funcional antes desta documentação | `c9dcd3195503a68ca1affcdce558db1b294d6c07` |
| Conteúdo editorial atual sincronizado | VERIFICADO |
| Upload simples de imagens | IMPLEMENTADO e VALIDADO TECNICAMENTE |
| Foto de Wolnei e Memória e legado | IMPLEMENTADO e VALIDADO NO BUILD/HEADLESS |
| Um Salvar + um Pré-visualizar por área | IMPLEMENTADO e VALIDADO NO HEADLESS |
| Títulos, texto e vídeos | REVISADOS e VALIDADOS TECNICAMENTE |
| 1º, 2º e 3º salvamentos consecutivos | PASS em teste de fila e cenário headless da Home |
| Revisão técnica visual Admin/site | PASS em 1440 px e 390 px no cenário headless anterior |
| Acesso e localização | INCORPORADO e incluído no gate automático de `check` |
| Contato e aviso de correções | INCORPORADO e incluído no gate automático de `check` |
| PR aberto da reconstrução | NÃO neste checkpoint |
| Publicação em produção | NÃO AUTORIZADA |

## 5. Evidências técnicas preservadas

- A21: `docs/evidencias/PA-V001-A21-R3-CONTENT-WRITE-PASS-20260913.md`.
- A22: `docs/evidencias/PA-V001-A22-ADMIN-UI-FLOW-PASS-20260913.md`.
- A23: `docs/evidencias/PA-V001-A23-AUDITORIA-BLOQUEIOS-EDITORIAIS-20260913.md`.
- A24: `docs/evidencias/PA-V001-A24-ADMIN-EDITOR-EXPANDIDO-PASS-20260913.md`.
- Reconstrução limpa: upload simples, sincronização editorial, foto de Wolnei, ações unificadas, controles integrados, fila de escrita e teste headless responsivo.
- `tools/editorial-demand-test.mjs`: exige as páginas `Acesso` e `Contato`, principais rodovias previstas, e-mail visível uma única vez e estado correto dos gates.

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

## 7. Próxima ação

Executar o workflow `validate` no HEAD documental desta reconstrução. Se o workflow ficar verde, confirmar que a branch está 0 commits atrás de `develop`, confirmar ausência de PR aberto concorrente e então criar um único PR de `rebuild/pa-v001-clean` para `develop`. Não mesclar automaticamente e não promover para `main`.
