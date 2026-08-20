# Projeto de Compensação Ambiental e Social - PA Safra

Portal de desenvolvimento do Projeto de Compensação Ambiental e Social - PA Safra, com foco em Nova Xavantina/MT e nas comunidades de Alvorada, Córrego do Jatobá e Vila do Banco Safra.

## Desenvolvimento local

Execute `INICIAR-PA-SAFRA.ps1` ou use o atalho `PA Safra - Desenvolvimento` criado na Área de Trabalho.

Endereço local:

`http://127.0.0.1:4173/`

## Validação

- `npm run check`
- `node --check app.js`
- `npm run build`

## GitHub

Repositório previsto:

`Seshomaru1984/pa-safra-compensacao-ambiental-social`

O script inicial cria o repositório como privado por padrão e publica o primeiro commit usando GitHub CLI (`gh`).
## Fluxo de desenvolvimento seguro

O projeto utiliza `main` como estado consolidado e `develop` como base de integracao. Alteracoes relevantes sao implementadas em branches proprias, passam pelo gate local e sao publicadas por Pull Request para `develop`.

A politica completa esta em [`docs/GIT-WORKFLOW.md`](docs/GIT-WORKFLOW.md).