# PA-V001-A19 R4 — evidência funcional do Preview

Data: 2026-09-12
Ambiente: Cloudflare Pages Preview
Branch: `ops/pa-v001-a19-preview-auth-e2e`
HEAD executado: `801c91ba65a50bb573b3209d222c5226e4bb9cf0`

## Objetivo

Comprovar, no runtime real do Cloudflare Preview, a correção da autenticação administrativa após alinhar PBKDF2-SHA256 ao limite de 100000 iterações do workerd/Workers.

## Evidência de execução

Log operacional fornecido pelo usuário: `PA-A19-R4-PBKDF2-20260912-224343.log`.

A execução confirmou:

- repositório PA Safra e branch A19 exatos;
- fast-forward local até `801c91ba65a50bb573b3209d222c5226e4bb9cf0`;
- Wrangler autenticado e projeto Pages/Preview confirmado;
- estado remoto prévio preservado, com GitHub write bloqueado;
- build formal pelo fluxo normativo concluído;
- `npm run check`: PASS;
- `npm run build`: PASS em modo advisory, sem autorizar produção;
- `npm run smoke`: PASS;
- ZIP local arquivado e SHA-256 registrado;
- binding D1 de Preview já presente;
- novo hash PBKDF2-SHA256/100000 gerado localmente;
- somente `PA_SAFRA_ADMIN_PASSWORD_HASH` renovado no Preview;
- `PA_SAFRA_SESSION_SECRET`, `GITHUB_CONTENT_TOKEN`, D1 e demais secrets não alterados;
- deploy Preview da correção concluído;
- configuração Wrangler temporária removida;
- login real no Cloudflare Preview: PASS;
- sessão assinada/cookie no Preview: PASS;
- escrita GitHub permaneceu bloqueada;
- logout e invalidação da sessão: PASS.

Deployment observado: `https://e318fd01.pa-safra-compensacao-ambiental-social.pages.dev`.
Alias de Preview: `https://ops-pa-v001-a19-preview-auth.pa-safra-compensacao-ambiental-social.pages.dev`.

## Classificação

- PROJECT: correção PBKDF2 R4 implementada e funcional no runtime real.
- ENVIRONMENT: Cloudflare Preview, Pages Functions, D1 e secrets necessários responderam corretamente.
- PROCEDURE: execução R4 concluída sem falha bloqueante.

## Resultado do gate

A autenticação real, sessão e logout da A19 passam de FAIL para **PASS funcional no Preview**.

Este PASS não valida ainda o fluxo editorial completo. Permanecem pendentes:

- teste live controlado do rate limiter D1 (401/429/Retry-After, bloqueio e limpeza controlada);
- habilitação futura e controlada de `GITHUB_CONTENT_TOKEN` somente para a branch editorial de Preview;
- teste real de edição/pré-visualização/publicação;
- confirmação final de `admin_nativo_validado`.

`admin_nativo_validado` deve permanecer `false` até os gates acima serem concluídos.

Produção, `main`, `develop`, domínio e DNS não foram alterados por esta execução.
