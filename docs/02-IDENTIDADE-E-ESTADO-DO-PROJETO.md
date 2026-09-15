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
| Branch editorial de Preview | `content/pa-v001-admin-preview` |
| Branch de reconstrução histórica | `rebuild/pa-v001-clean`, já integrada pelo PR #39 |
| Branch problemática arquivada | `archive/pa-v001-experimental-20260914` |
| Produção | `main`, protegida pelos gates editoriais vigentes |
| Administração | `/admin`, com login próprio e nove áreas editoriais |
| Escopo atual | Estado técnico integrado e pronto para testes manuais em Preview/develop; `main` permanece fora do escopo autorizado |

## 2. Integrações concluídas

### Reconstrução limpa

- PR #39 integrado em `develop`.
- HEAD validado do candidato: `a7e5c5d11241ac8fa46dd29fea7cab3c438e81c7`.
- Commit de merge: `5b5c60983875341b3d9f6b5bfe6c684a68d08d5e`.
- CI final do PR: run 1071, SUCCESS.
- CI pós-merge: run 1072, SUCCESS.
- Checkpoint documental posterior: `d656ef76c2bdb65e5e49d8ec71e8259e11fc3041`.

### Informações opcionais de imagem

- PR #40 integrado em `develop`.
- HEAD validado: `bdb819233b213b71701bce1043bf7b330b065483`.
- Commit de merge: `d9b33595940af2680b3921787d499c1644d5f366`.
- CI do PR: run 1083, SUCCESS.
- CI pós-merge: run 1084, SUCCESS.

O PR #40 implementou a regra editorial de que legenda, crédito e licença podem permanecer vazios, sem gerar textos artificiais como `a confirmar` ou `em conferência` no site público.

### Correções do review do PR #40

O review automático do PR #40 identificou três regressões reais após o merge. Elas foram tratadas antes da liberação para testes manuais:

1. preservar texto válido da legenda estática ao remover apenas o sufixo editorial pendente;
2. remover do DOM público o banner `Créditos em conferência` da Galeria;
3. preservar a atribuição estática de fallback do Legado caso `/content/site.json` falhe ou esteja indisponível.

As correções foram validadas no PR #41:

- branch limpa: `fix/pa-v001-image-info-review-clean`;
- HEAD validado: `53aa20381845028f6adc8f3b4372721c691a3e31`;
- CI da branch: run 1088, SUCCESS;
- CI do PR: run 1092, SUCCESS;
- commit de merge em `develop`: `04cedf23fdc8c8127d5ed8606c9fff0f9a762e72`;
- CI pós-merge em `develop`: run 1093, SUCCESS;
- nenhum comentário ou review pendente foi identificado no PR #41 antes do fechamento técnico.

## 3. Regra vigente para informações de imagem

- Legenda, crédito e licença podem ficar vazios no Admin.
- Campo vazio não deve gerar placeholder público.
- Se nenhuma informação estiver preenchida, o bloco de informações da imagem deve ficar oculto.
- Se apenas parte das informações estiver preenchida, exibir somente os dados reais existentes.
- A descrição acessível (`alt`) permanece independente e deve continuar disponível para acessibilidade.
- No Legado, `image_credit` vazio oculta a legenda da imagem configurada e da cópia inserida no corpo.
- Se o conteúdo editorial do Legado não puder ser carregado, uma atribuição estática válida existente no HTML de fallback deve ser preservada.
- Legenda válida nunca deve ser descartada apenas porque um sufixo de crédito pendente foi removido.

A regra de apresentação não equivale, por si só, à confirmação jurídica de direitos de uso de imagens de terceiros.

## 4. Conteúdo e recursos já incorporados

- Página `Acesso`, com referências territoriais e rodoviárias sustentadas pelas fontes incorporadas.
- Página `Contato`, com `gustavomzfranco@hotmail.com` aparecendo uma única vez no texto visível.
- Upload simples de imagens no Admin.
- Foto de Wolnei e conteúdo de Memória e legado.
- Um único `Salvar` e um único `Pré-visualizar` por área administrativa.
- Salvamento integrado de conteúdo, títulos, layout da Home e tamanho de títulos de vídeos.
- Fila de escrita com repetição controlada para HTTP 502 transitório.
- Primeiro, segundo e terceiro salvamentos consecutivos da Home validados.
- Testes headless em desktop e mobile.

## 5. Estado técnico para testes manuais

| Item | Estado |
|---|---|
| HEAD técnico integrado antes deste checkpoint documental | `04cedf23fdc8c8127d5ed8606c9fff0f9a762e72` |
| PR #40 | MESCLADO em `develop` |
| PR #41 | MESCLADO em `develop` |
| CI pós-merge do PR #41 | run 1093, SUCCESS |
| Build | PASS |
| Smoke | PASS |
| Autenticação | PASS |
| Guard de branch editorial | PASS |
| Cloudflare readiness/env | PASS |
| JavaScript | PASS |
| PowerShell | PASS |
| Admin em navegador headless | PASS |
| Site público em navegador headless | PASS |
| Estado para testes manuais | PRONTO |
| Promoção para `main` | NÃO AUTORIZADA |
| Produção | NÃO EXECUTADA |

O próximo gate prático é a revisão humana do ambiente de Preview/develop. Esse teste manual deve validar comportamento e apresentação reais antes de qualquer avaliação de produção.

## 6. Roteiro mínimo dos testes manuais

- Login e logout do Admin.
- Navegação pelas nove áreas administrativas.
- Edição e salvamento de texto.
- Primeiro, segundo e terceiro salvamentos consecutivos sem recarregar a página.
- Upload, substituição e remoção de imagem nos campos disponíveis.
- Pré-visualização de cada área.
- Home, Sobre, Palestras, Galeria, Acesso, Contato, Links úteis e Memória e legado.
- Imagem sem legenda/crédito/licença: área de informações ausente.
- Imagem com apenas parte dos dados: mostrar somente os dados preenchidos.
- Imagem com legenda válida e crédito ausente: preservar a legenda.
- Galeria sem banner `Créditos em conferência`.
- Legado com crédito vazio e comportamento de fallback.
- Links e vídeos.
- Revisão visual em desktop e celular, incluindo ausência de overflow horizontal.

## 7. Gates editoriais atuais

| Gate | Estado |
|---|---|
| `redacao_juridica_confirmada` | `false` |
| `creditos_imagens_confirmados` | `false` |
| `dados_contato_confirmados` | `true` |
| `afirmacoes_historicas_confirmadas` | `false` |
| `revisao_visual_confirmada` | `false` |
| `admin_nativo_validado` | `true` |

Esses gates não impedem os testes manuais em Preview/develop. Eles continuam impedindo a promoção definitiva para `main` e a publicação em produção enquanto aplicáveis.

Validação headless não substitui revisão visual humana. O gate `revisao_visual_confirmada` só pode ser alterado após a revisão efetiva do ambiente.

## 8. Evidências técnicas preservadas

- `docs/evidencias/PA-V001-A21-R3-CONTENT-WRITE-PASS-20260913.md`.
- `docs/evidencias/PA-V001-A22-ADMIN-UI-FLOW-PASS-20260913.md`.
- `docs/evidencias/PA-V001-A23-AUDITORIA-BLOQUEIOS-EDITORIAIS-20260913.md`.
- `docs/evidencias/PA-V001-A24-ADMIN-EDITOR-EXPANDIDO-PASS-20260913.md`.
- `docs/evidencias/PA-V001-IMAGE-INFO-OPTIONAL-PASS-20260914.md`.
- Runs 1071, 1072, 1083, 1084, 1088, 1092 e 1093.

## 9. Próxima ação

Realizar testes manuais no ambiente de Preview/develop com o roteiro acima. Registrar qualquer divergência observada antes de nova integração ou promoção.

Não promover automaticamente para `main`, não alterar domínio e não declarar produção concluída sem autorização específica e sem os gates correspondentes.
