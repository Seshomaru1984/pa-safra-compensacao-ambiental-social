# PA Safra — V001-A30 — auditoria de erros, falhas e bugs

Data: 2026-09-13
Branch auditada: `ops/pa-v001-a30-preparacao-versao-final`

## Escopo

Auditoria técnica do site público, painel administrativo, fluxo editorial Preview, first paint, layout assistido, formatação assistida de títulos, validações e preparação para produção.

A auditoria não promove produção e não altera os gates editoriais.

## Resultado geral

Os gates automatizados atuais estão passando, mas foram encontrados pontos funcionais que não são cobertos integralmente pelos testes existentes. O projeto não deve ser considerado pronto para produção até o fechamento dos itens críticos e altos abaixo.

## Encontrados

### 1. Corte de imagens nos cabeçalhos internos — CORRIGIDO

Severidade: média/visual.

Causa: `public/internal-header-uniform.css` utilizava dimensões fixas com `object-fit: cover`, provocando recorte quando a imagem original tinha proporção retrato ou paisagem diferente da moldura.

Correção A30: manter a área máxima padronizada e trocar a renderização para `object-fit: contain`, preservando a proporção original e impedindo corte/estiramento.

Commit funcional: `81e87961f4b6ad56e076555830dcb32a92499200`.

Validação após a correção: GitHub Actions `validate` SUCCESS e Cloudflare Pages SUCCESS.

### 2. Formulários principais do admin podem deixar de responder após uma falha de publicação — CONFIRMADO

Severidade: alta.

Em `public/admin/admin.js`, os formulários Página inicial, Sobre, Memória/legado e Aparência registram o evento `submit` com `{ once: true }`.

Isso remove o listener após a primeira tentativa, independentemente de a gravação ter sido bem-sucedida. Se a API falhar por rede, sessão, validação ou indisponibilidade, o formulário permanece na tela, mas uma segunda tentativa pode não executar o handler esperado.

Correção recomendada: listeners persistentes; impedir apenas submissões simultâneas pelo estado do botão.

### 3. Remover todos os Destaques ou todos os Links pode não refletir no site — CONFIRMADO

Severidade: alta.

Em `app.js`, `renderHighlights()` e `renderLinks()` somente substituem o HTML estático quando existem itens publicados. Se o admin salvar uma lista vazia, o conteúdo estático inicial pode permanecer visível.

Efeito: a operação administrativa “remover tudo” pode ser gravada corretamente no JSON e mesmo assim o usuário continuar vendo os cartões/links anteriores embutidos no HTML.

Correção recomendada: quando o recurso editorial foi carregado validamente, o DOM deve sempre ser reconciliado com o conteúdo editorial, inclusive quando a lista for vazia.

### 4. Status do admin pode informar “Painel pronto para publicar” com branch de escrita não autorizada — CONFIRMADO

Severidade: média/alta.

`functions/api/admin/status.js` calcula `write_enabled` a partir de admin habilitado, credenciais, D1, sessão e token, mas não verifica se `PA_SAFRA_CONTENT_BRANCH` é exatamente `content/pa-v001-admin-preview`.

O middleware de escrita faz essa verificação e rejeita PUT fora da branch permitida. Portanto é possível o status habilitar os botões enquanto a gravação real será rejeitada.

Correção recomendada: incluir a branch autorizada no cálculo de `write_enabled` e na mensagem do status.

### 5. Pré-visualização de layout pode contaminar uma gravação posterior — CONFIRMADO

Severidade: média.

Em `public/admin/layout-assist.js`, clicar em `Pré-visualizar` altera diretamente `layoutState.blocks[key]` antes de salvar.

Cenário: o usuário pré-visualiza uma disposição em um bloco, não salva, depois salva outro bloco. O segundo save envia uma cópia de `layoutState` inteira e pode persistir também a alteração que deveria ter sido somente uma prévia.

Correção recomendada: a prévia deve construir uma URL com override temporário sem alterar `layoutState`; somente `Salvar disposição` deve mutar o estado persistido.

### 6. Falta um mecanismo explícito de promoção do conteúdo editorial para produção — CRÍTICO PARA RELEASE

Severidade: crítica de processo/arquitetura de publicação.

O admin grava em `content/pa-v001-admin-preview`. O Preview lê essa branch pelas APIs editoriais. Em produção, as APIs remotas retornam 404 quando `PA_SAFRA_CONTENT_BRANCH` não é a branch editorial e o site cai para os JSONs estáticos do build.

Portanto, apenas mesclar a branch técnica em `main` não garante que o conteúdo editorial aprovado da branch Preview esteja incorporado à versão final.

Além disso, a formatação de títulos já diverge atualmente: a branch editorial contém tamanhos escolhidos (`medium`/`large`) enquanto a branch técnica A30 ainda possui `default` em todos os títulos.

Correção recomendada para a release: criar uma etapa explícita de promoção/sincronização dos JSONs editoriais aprovados (`site`, `videos`, `paginas`, `destaques`, `galeria`, `links`, `layout`, `title-styles`) para a branch técnica candidata antes do merge em `main`, com diff e validação. Não configurar produção para ler diretamente a branch de Preview, pois isso faria futuras edições de Preview alcançarem produção sem promoção deliberada.

### 7. Ponte editorial é injetada também no build que poderá virar produção — PERFORMANCE/ARQUITETURA

Severidade: média.

`vite.config.js` injeta `content-preview-bridge.js` de forma incondicional. A ponte intercepta cada leitura de `/content/*.json` e tenta primeiro `/api/content`.

Se a produção não estiver configurada para a branch editorial — comportamento seguro esperado — cada um dos seis recursos editoriais fará uma tentativa remota que retorna 404 antes do fallback estático. Isso adiciona chamadas desnecessárias e latência ao primeiro carregamento.

Correção recomendada: ativar a ponte apenas em Preview/editorial, ou introduzir marcador de build/ambiente que permita ao cliente pular a chamada remota em produção.

### 8. Testes automatizados atuais não cobrem alguns dos bugs acima — CONFIRMADO

Severidade: média.

O Chrome headless atual valida o caminho feliz de login, edição e publicação simulada. Não testa:
- falha de publicação seguida de nova tentativa no mesmo formulário;
- listas totalmente vazias no site público;
- preview de layout sem salvar seguido de save em outro bloco;
- inconsistência entre `write_enabled` e branch permitida;
- promoção efetiva do conteúdo editorial para o candidato de produção.

Por isso os jobs `validate` podem passar mesmo com esses defeitos funcionais presentes.

## Pontos que passaram nesta rodada

- autenticação, PBKDF2 e rate limiter continuam cobertos pelos testes existentes;
- guard de escrita continua restrito a `content/pa-v001-admin-preview`;
- Notícias continua fora do escopo operacional;
- build, smoke, fluxo headless e Cloudflare Pages passaram após a correção de proporção das imagens;
- não foram alterados biografia, histórico, redação jurídica, domínio ou produção.

## Ordem recomendada de correção

1. corrigir retry dos formulários principais;
2. corrigir reconciliação de listas vazias;
3. corrigir `write_enabled` para respeitar branch autorizada;
4. corrigir preview de layout sem mutação persistente;
5. implementar promoção editorial explícita para release;
6. limitar a ponte editorial ao Preview;
7. adicionar testes de regressão específicos;
8. repetir auditoria funcional e revisão visual desktop/mobile antes de `prepublish:check`.
