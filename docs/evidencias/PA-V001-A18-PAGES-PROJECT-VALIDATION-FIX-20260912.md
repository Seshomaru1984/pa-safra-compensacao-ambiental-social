# PA-V001-A18 — correção da validação do projeto Pages

Data: 2026-09-12

## Incidente observado

A execução local sincronizou corretamente a branch `ops/pa-v001-a18-cloudflare-preview-admin` e validou o provisionador pelo parser, mas o provisionador abortou antes de criar D1 porque a validação dependia das propriedades textuais `Project Name` retornadas por `wrangler pages project list --json`.

Nenhum D1, secret, binding, domínio, DNS, `main` ou `develop` foi alterado nessa tentativa.

## Correção

A validação do projeto Pages deixou de depender do schema do JSON de `pages project list`. O projeto `pa-safra-compensacao-ambiental-social` agora é validado pelo nome exato através de `wrangler pages deployment list --project-name pa-safra-compensacao-ambiental-social --environment preview --json`, operação somente leitura que falha se o projeto não existir ou não estiver acessível na conta autenticada.

O auditor somente leitura recebeu a mesma correção para evitar divergência entre diagnóstico e provisionamento.

## Evidência automatizada

GitHub Actions `validate`, run 34665973659, commit `2146dcdf26ef8fbb354e39283000ece09e55deda`: **SUCCESS**.

Passaram: contrato editorial, autenticação 401/429, readiness Cloudflare, contrato de ambiente, trava editorial, parser PowerShell, build e smoke.

## Estado de segurança

- repositório alvo exclusivo: `Seshomaru1984/pa-safra-compensacao-ambiental-social`;
- PR #20 permanece draft e não mesclado;
- `main` e `develop` não foram alteradas;
- nenhum recurso D1 foi criado por esta correção;
- produção, domínio e DNS permanecem fora de escopo;
- `admin_nativo_validado` permanece `false`.
