# PA Safra — V001-A30 — preparação da versão final

Data: 2026-09-13

## Objetivo

Preparar a versão final sem promover produção antes dos gates editoriais obrigatórios.

## Limpeza já executada no conteúdo editorial de Preview

- removido de `content/pa-v001-admin-preview/public/content/videos.json` o vídeo de exemplo e toda a descrição contendo `TESTE`;
- `videos.json` passou a `[]`;
- alinhado `admin_nativo_validado=true` em `content/pa-v001-admin-preview/public/content/publicacao.json`, preservando `status: pendente` e os cinco gates editoriais como `false`.

Commits editoriais:
- `9c68a0e19743d6093137d484f77bd7a28e3138f4` — remoção do vídeo/teste;
- `4397101de8e3b07eae2d9ed53bd417ed04737883` — alinhamento do gate técnico do admin.

## Auditoria de links públicos

Abertura confirmada em 2026-09-13 para:
- SEMA-MT;
- Ministério Público do Estado de Mato Grosso;
- Ibama — portal principal;
- Câmara Municipal de Campinápolis — História;
- Ibama — Educação Ambiental;
- Ibama — Reparação de danos.

As duas URLs do IBGE permaneceram sem conclusão pelo mecanismo de verificação utilizado nesta rodada, que retornou erro interno ao abrir as páginas. Não foi inferido que os links estejam quebrados.

## Pesquisa histórica/documental

### Confirmado em fonte pública oficial

A página histórica da Câmara Municipal de Campinápolis registra:
- origem da localidade como Vila Jatobá;
- existência de uma área de 25 mil hectares pertencente à viúva Estephânia Brawn;
- elevação de Vila Jatobá a distrito de Nova Xavantina em 13/05/1980, com denominação Campinápolis.

Também foram localizados registros públicos que comprovam atuação profissional de Wolnei Divino Franco como advogado.

### Não confirmado por fonte pública suficiente nesta rodada

Não foi encontrada evidência pública suficiente para promover automaticamente as seguintes afirmações presentes no conteúdo editorial:
- Wolnei Divino Franco como um dos primeiros advogados da região;
- participação de Wolnei na fundação de Campinápolis;
- condição de primeiro advogado a atuar na legalização das terras da viúva Estephânia Brawn;
- episódio de 1990 em Perdizes/MG envolvendo amônia, TAC e doação de laboratório de química.

Foi localizada referência pública a processo ambiental iniciado em 2026 envolvendo Ministério Público do Estado de Mato Grosso, Gustavo Muniz Franco e Wolnei Divino Franco, mas isso não comprova, por si só, a redação específica atualmente usada no site sobre o TAC ou que o portal integra formalmente determinada cláusula do instrumento.

## Créditos de imagens

Continuam sem evidência de licença/autorização suficiente:
- duas imagens fornecidas pelo solicitante marcadas como `Crédito/licença a confirmar antes da publicação definitiva`;
- montagem `atrativos-nova-xavantina.jpg`, marcada como `Crédito editorial a confirmar`;
- `rio-nova-xavantina.jpg`, atribuída a “A Notícia em Foco”, sem prova de licença de republicação;
- `registro-historico.jpg`, atribuído a George Zarur, sem documento de autorização/licença registrado no projeto.

Atribuição de autoria não foi tratada como equivalente a licença de publicação.

## Pendências que exigem decisão ou documentação externa

1. **Redação jurídica/TAC** — obter o instrumento ou uma redação formalmente aprovada pelos responsáveis.
2. **Direitos das imagens** — obter autorização/licença ou substituir/remover materiais sem autorização comprovada.
3. **Contato institucional** — confirmar contato real a publicar ou decidir formalmente que o portal não terá contato institucional.
4. **Biografia/história** — fornecer documentação das afirmações específicas ou autorizar redução apenas aos fatos comprováveis. Nenhuma reescrita foi realizada nesta etapa.
5. **Revisão visual final** — executar somente depois de estabilizar o conteúdo definitivo.

## Estado

- produção continua bloqueada;
- `main`, `develop`, domínio e DNS não foram alterados;
- nenhum gate editorial foi promovido sem evidência;
- próxima ação: obter/confirmar as quatro decisões/documentos externos acima, aplicar as mudanças editoriais autorizadas e então realizar revisão visual final + `prepublish:check`.
