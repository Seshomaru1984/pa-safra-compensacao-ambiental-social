# PA-V001-A19 R2 — correção do deploy Preview com configuração Wrangler no root

Data: 2026-09-12

## Evidência observada

A primeira execução real da A19 configurou os secrets exclusivamente no ambiente Preview, validou o D1 `pa-safra-auth-preview` e gerou o build, mas o deploy foi bloqueado pelo Wrangler 4.131.1 com a mensagem:

`Pages does not support custom paths for the Wrangler configuration file`

A falha ocorreu antes do deploy A19. `GITHUB_CONTENT_TOKEN` permaneceu ausente e nenhuma escrita editorial foi habilitada.

## Causa

O configurador A19 utilizava `--config <caminho-customizado>` com `wrangler pages deploy`. Pages não aceita caminho customizado para o arquivo Wrangler. A configuração Pages deve existir no root com nome canônico (`wrangler.toml`, `wrangler.json` ou `wrangler.jsonc`).

## Correção R2

- removido o uso de `--config` customizado;
- o script baixa a configuração atual do projeto com `wrangler pages download config`, preservando a configuração já existente no dashboard;
- a configuração baixada é usada temporariamente no root;
- somente o binding `PA_SAFRA_AUTH_DB` é acrescentado em `env.preview`;
- qualquer binding homônimo em `env.production` causa bloqueio;
- o deploy continua explicitamente em branch Preview;
- o arquivo Wrangler temporário é removido do worktree após o deploy ou em `finally`;
- o build local passou a usar obrigatoriamente `tools/PA-SAFRA-BUILD-E-ARQUIVAR.ps1`, incluindo check, build, smoke, ZIP, SHA-256 e arquivamento em `_PACOTES-LOCAL`;
- secrets de Preview podem ser renovados de forma idempotente; senha em texto puro não é gravada;
- `GITHUB_CONTENT_TOKEN` continua deliberadamente não configurado.

## Validação

GitHub Actions `validate` run 362 passou integralmente no commit `ddbed41a900050daf9cbe2d853bdded87c6818d4`, incluindo parser PowerShell, contratos de autenticação, build e smoke.

## Escopo preservado

- `main`: não alterada;
- `develop`: não alterada;
- Production Pages: não configurada por esta correção;
- domínio/DNS: não alterados;
- `admin_nativo_validado`: permanece `false` até a prova real de login/sessão/rate-limit e, posteriormente, escrita editorial controlada.
