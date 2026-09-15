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
| Branch de correção atual | `fix/pa-v001-image-info-optional` |
| Branch editorial de Preview | `content/pa-v001-admin-preview` |
| Branch de reconstrução histórica | `rebuild/pa-v001-clean`, já integrada pelo PR #39 |
| Branch problemática arquivada | `archive/pa-v001-experimental-20260914` |
| Produção | `main`, protegida pelos gates editoriais vigentes |
| Administração | `/admin`, com login próprio e nove áreas editoriais |
| Escopo atual | Correção pós-integração para tratamento opcional de informações de imagem; `main` permanece fora do escopo autorizado |

## 2. Estado integrado anterior

A reconstrução limpa foi integrada em `develop` pelo PR #39 em 14/09/2026.

- HEAD do candidato integrado: `a7e5c5d11241ac8fa46dd29fea7cab3c438e81c7`.
- Commit de merge em `develop`: `5b5c60983875341b3d9f6b5bfe6c684a68d08d5e`.
- CI final do PR: run 1071, SUCCESS.
- CI pós-merge: run 1072, SUCCESS.
- Checkpoint documental pós-integração em `develop`: `d656ef76c2bdb65e5e49d8ec71e8259e11fc3041`.
- `main` não foi promovida e permanece fora da autorização.

## 3. Regra corrigida para informações de imagem

O usuário reafirmou em 14/09/2026 a regra já definida para informações de imagem:

- legenda, crédito e licença podem permanecer vazios no Admin;
- não preencher campo vazio com mensagens artificiais como `Crédito/licença a confirmar`, `Crédito editorial a confirmar` ou `Créditos em conferência`;
- quando o bloco não possuir nenhuma informação preenchida, ele deve ficar oculto na página pública;
- quando houver apenas parte das informações, exibir somente o que foi efetivamente informado;
- a descrição acessível da imagem (`alt`) permanece independente e não deve ser removida por essa regra;
- no Legado, `image_credit` vazio deve ocultar a legenda tanto na imagem de origem quanto na imagem reproduzida no corpo do texto.

A regra de apresentação não deve ser confundida com declaração de autorização ou licença de material de terceiros. A ocultação de metadados vazios não confirma direitos de uso.

## 4. Implementação da correção

Branch: `fix/pa-v001-image-info-optional`.

Alterações implementadas:

- `public/image-fallback.js`: remove legenda padrão artificial da galeria, elimina informação pública pendente e remove o bloco quando ele fica vazio;
- `public/internal-header-body-media.js`: usa o `image_credit` configurado e oculta a legenda do Legado quando o campo está vazio;
- `public/content/galeria.json`: remove placeholders de crédito/licença e preserva somente dados reais;
- `content/pa-v001-admin-preview`: galeria sincronizada com a mesma regra editorial;
- `tools/editorial-demand-test.mjs`: protege a regra contra regressão;
- evidência: `docs/evidencias/PA-V001-IMAGE-INFO-OPTIONAL-PASS-20260914.md`.

O Admin já aceitava `caption`, `credit` e `image_credit` vazios; portanto, não foi necessário criar campo paralelo nem mudar o contrato de gravação.

## 5. Validação

| Campo | Estado |
|---|---|
| Base da correção | `develop` em `d656ef76c2bdb65e5e49d8ec71e8259e11fc3041` |
| HEAD funcional validado antes desta documentação | `cf934bbfa138bc8ec6badc492e2cc7127b7d0399` |
| Workflow | `validate` |
| Run | `34904795806` / run number `1078` |
| Resultado | SUCCESS |
| Check editorial | PASS |
| Auditoria editorial | PASS |
| Autenticação e guard | PASS |
| Cloudflare | PASS |
| JavaScript e PowerShell | PASS |
| Build | PASS |
| Smoke | PASS |
| Navegador headless | PASS |
| Conteúdo da galeria no Preview | SINCRONIZADO, commit `36370df1fa5c5d8e2141e00f2b01b005f205f153` |

Esta atualização documental altera o HEAD da branch de correção. O candidato final deve ser revalidado antes de qualquer integração.

## 6. Gates editoriais atuais

| Gate | Estado |
|---|---|
| `redacao_juridica_confirmada` | `false` |
| `creditos_imagens_confirmados` | `false` |
| `dados_contato_confirmados` | `true` |
| `afirmacoes_historicas_confirmadas` | `false` |
| `revisao_visual_confirmada` | `false` |
| `admin_nativo_validado` | `true` |

`creditos_imagens_confirmados=false` continua significando que a confirmação de direitos de uso das imagens de terceiros ainda não foi registrada. Isso é independente da regra visual de ocultar informações vazias.

Produção permanece bloqueada enquanto houver gates obrigatórios pendentes. Validação headless não substitui aprovação visual humana.

## 7. Próxima ação

Executar `validate` no HEAD final desta branch após a documentação. Se o CI permanecer verde, confirmar que a branch está 0 commits atrás de `develop` e abrir um PR específico de `fix/pa-v001-image-info-optional` para `develop`.

Não promover automaticamente para `main`. A autorização dada anteriormente foi específica para o PR #39 e já foi consumida.
