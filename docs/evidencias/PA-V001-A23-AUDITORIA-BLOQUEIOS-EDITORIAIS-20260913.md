# PA Safra — V001-A23 — auditoria dos bloqueios editoriais

Data: 2026-09-13

## Objetivo

Transformar os cinco bloqueios editoriais restantes em verificações observáveis, sem promover nenhum deles automaticamente e sem tocar produção.

## Estado de entrada

`admin_nativo_validado=true` já possuía evidências combinadas A19+A20+A21+A22.

Permaneciam `false`:
- `redacao_juridica_confirmada`;
- `creditos_imagens_confirmados`;
- `dados_contato_confirmados`;
- `afirmacoes_historicas_confirmadas`;
- `revisao_visual_confirmada`.

## Auditoria implementada

Foi criado `tools/editorial-blockers-audit.mjs`, exposto como `npm run editorial:audit` e incluído no CI.

O gate não aprova conteúdo. Ele impede que um check editorial seja marcado como `true` enquanto o próprio repositório ainda contiver um bloqueio objetivo correspondente.

## Bloqueios observáveis atuais

### Redação jurídica
- `site.footer.institutional_note` declara que a redação jurídica definitiva ainda depende de validação.
- O texto “Sobre este site” caracteriza o TAC como firmado entre o Espólio de Wolnei Divino Franco e o Ministério Público do Estado de Mato Grosso; a aprovação jurídica desse enquadramento não está registrada no repositório.

### Créditos e licenças de imagens
- as duas imagens fornecidas pelo solicitante continuam com `Crédito/licença a confirmar antes da publicação definitiva`;
- a montagem de atrativos continua com `Crédito editorial a confirmar`;
- o registro histórico possui atribuição a George Zarur, mas o conteúdo atual não declara licença/autorização confirmada;
- a imagem atribuída a “A Notícia em Foco” tem crédito registrado, mas a auditoria não interpreta mera atribuição como prova automática de licença de publicação.

### Dados de contato
- o conteúdo atual não contém e-mail ou telefone confirmado;
- a nota institucional declara que os dados de contato serão publicados somente após validação.

### Afirmações históricas
A página de memória contém afirmações específicas que não devem ser autoaprovadas, incluindo:
- Wolnei Divino Franco como um dos primeiros advogados da região;
- participação na fundação de Campinápolis/MT;
- atuação na legalização das terras da viúva Estephânia Brawn;
- episódio de 1990 em Perdizes/MG envolvendo TAC e doação de laboratório.

A própria página registra que as informações biográficas específicas e o episódio de Perdizes devem ser acompanhados de documentação antes da publicação definitiva.

### Revisão visual
A22 validou tecnicamente o DOM e o fluxo administrativo, mas isso não equivale a aprovação visual/editorial. A auditoria exige evidência manual separada antes de `revisao_visual_confirmada=true`.

## Proteção contra falso PASS

Se qualquer um dos cinco checks acima for alterado para `true` enquanto o bloqueio observável correspondente ainda existir, `npm run editorial:audit` falha e o CI impede avanço silencioso.

## Resultado de validação

GitHub Actions `validate`, run `34758383417`, HEAD `5bfbd53d93195e3fbc4a157c83adc6a346992041`: **SUCCESS**.

Passaram:
- integridade editorial;
- auditoria de bloqueios;
- contrato do admin;
- autenticação/rate limiter;
- guard de branch;
- Cloudflare readiness/env contract;
- trava de pré-publicação;
- parser PowerShell;
- build;
- smoke;
- fluxo do admin em Chrome headless;
- artifact.

## Conclusão

**A23 T1: PASS para a auditoria dos bloqueios.**

Nenhum dos cinco gates editoriais foi aprovado. Produção continua bloqueada. A próxima etapa deve produzir ou obter as evidências que permitam resolver cada bloqueio individualmente, começando pelos itens que podem ser verificados documentalmente sem decisão subjetiva.
