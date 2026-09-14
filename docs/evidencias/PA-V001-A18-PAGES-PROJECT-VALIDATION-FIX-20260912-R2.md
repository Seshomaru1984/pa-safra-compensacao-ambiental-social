# PA-V001-A18 — correção da validação Pages — R2

HEAD validado: `15e41c6d3dc986b3b6e0525bde32884f747445a8`

A execução local de 11/09/2026 sincronizou corretamente a A18, mas o provisionador abortou antes de criar D1 porque `wrangler pages project list --json` não expôs o projeto no formato de propriedades esperado pelo script.

Correção aplicada:

- removida a dependência de `Project Name`/`Project Domains` do JSON de `pages project list`;
- validação do projeto passa a usar o nome exato em `pages deployment list --project-name pa-safra-compensacao-ambiental-social --environment preview --json`;
- auditor somente leitura alinhado ao mesmo método;
- nenhuma criação de D1, secret, binding, domínio, DNS ou alteração de `main`/`develop` durante a falha observada.

GitHub Actions `validate`, run `34666008176`: **SUCCESS**.
