# PA-V001-A20 — rate limiter D1 live no Preview

Data: 2026-09-12
Branch: `ops/pa-v001-a20-preview-rate-limit-e2e`
Gate: A20 / F1 live

## Resultado

**PASS** para o comportamento live do rate limiter D1 no Cloudflare Preview.

Evidência operacional recebida no log local `PA-A20-RATE-LIMIT-20260912-232636.log`:

- repositório PA Safra confirmado;
- branch A20 sincronizada no HEAD `fc045c4e11cefb1aad8fef5ec8583a9977019ef1`;
- Wrangler autenticado;
- D1 de Preview confirmado;
- `/api/admin/status` confirmou autenticação + backend D1 e escrita GitHub bloqueada;
- precondição D1 sem estado preexistente para o cliente;
- falhas 1–4: HTTP 401;
- falha 5: HTTP 429 + `Retry-After=899`;
- D1 confirmou `count >= 5` e `blocked_until` futuro;
- senha correta durante lock: HTTP 429;
- estado de teste removido do D1 e ausência confirmada;
- origem inválida: HTTP 403 sem alterar D1;
- login correto após limpeza: HTTP 200 + cookie seguro;
- sessão autenticada confirmada;
- `GITHUB_CONTENT_TOKEN`/GitHub write continuou bloqueado;
- logout: HTTP 200 + expiração do cookie confirmados.

O executor, após a linha de logout, ainda executa as verificações finais de estado sem cookie e ausência de registro residual no D1; qualquer falha nesse trecho cai no `catch` e acrescenta `FALHA:` ao mesmo log. O arquivo recebido terminou sem registro de falha.

## Incidente procedural anterior

A primeira execução da A20 falhou antes de qualquer tentativa de login porque o helper HTTP anexava conteúdo em GET. A correção limitou `StringContent` a POST. Após a correção, o CI completo passou no run `34732942438` e a execução live acima completou o fluxo funcional.

## Segurança preservada

A A20 não fez deploy, não alterou secrets, não configurou `GITHUB_CONTENT_TOKEN`, não escreveu conteúdo editorial e não tocou `main`, `develop`, produção, domínio ou DNS.

## Estado

- T1: PASS.
- F1 live: PASS.
- A20: CONCLUÍDA.
- `admin_nativo_validado`: permanece `false` porque a escrita editorial controlada ainda não foi validada.

Próximo gate: A21 — escrita editorial controlada exclusivamente na branch `content/pa-v001-admin-preview`, sem escrita em `main`/`develop` e sem publicação em produção.
