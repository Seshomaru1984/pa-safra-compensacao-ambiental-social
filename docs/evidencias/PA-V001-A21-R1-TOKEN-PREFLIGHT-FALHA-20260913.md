# PA Safra — V001-A21 — primeira execução live

Data: 2026-09-13

## Evidência recebida

Arquivo local: `PA-A21-CONTENT-WRITE-20260913-085555.log`.

## Resultado

A execução confirmou:
- repositório autorizado;
- branch A21 e branch editorial inicialmente no checkpoint `1624b9697cefa4c0a22654140871ecb308cf1de5`;
- Wrangler autenticado;
- D1 de Preview confirmado;
- build normativo, smoke, ZIP e SHA-256 concluídos;
- SHA-256 do pacote: `fb9462ab4f5c8912a5a3b2161a9ebd0c170ab88039f8ce55f590268f91ebbe85`.

A execução abortou no primeiro probe autenticado do GitHub com a mensagem genérica:

`TOKEN GITHUB NAO CONSEGUIU LER A BRANCH EDITORIAL AUTORIZADA.`

## Efeito externo

A falha ocorreu **antes** de configurar `GITHUB_CONTENT_TOKEN` no Cloudflare Preview, antes do deploy A21 e antes de qualquer escrita editorial. Portanto:
- nenhum secret foi alterado por essa execução;
- nenhum conteúdo foi escrito;
- `main`, `develop`, produção, domínio e DNS não foram alterados.

## Classificação

O bloqueio funcional está no preflight da credencial GitHub. A primeira versão do gate mascarava o HTTP real e, por isso, não permitia distinguir token inválido/expirado de falta de acesso ao repositório/branch. Essa limitação de observabilidade é classificada como **PROCEDURE**.

## Correção

A continuação R2:
- não repete o build formal já aprovado;
- revalida apenas o `dist` existente via smoke;
- valida primeiro a identidade do token via API;
- diferencia HTTP 401, 403 e 404 sem registrar o token;
- só configura o secret de Preview depois de comprovar leitura da branch editorial;
- mantém o restante do gate de escrita/restauração exclusivamente em `content/pa-v001-admin-preview`.
