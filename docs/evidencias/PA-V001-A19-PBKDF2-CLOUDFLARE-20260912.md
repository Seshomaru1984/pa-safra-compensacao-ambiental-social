# PA-V001-A19 — diagnóstico e correção PBKDF2 no Cloudflare Preview

Data: 12/09/2026
Escopo: somente `ops/pa-v001-a19-preview-auth-e2e` / Cloudflare Preview.
Produção, `main`, `develop`, domínio, DNS e escrita editorial GitHub permanecem fora deste gate.

## 1. Falha observada

O Preview A19 apresentava o seguinte estado:

- `/api/admin/status`: HTTP 200;
- administração habilitada;
- credenciais configuradas;
- rate limiter D1 configurado e backend `d1`;
- `GITHUB_CONTENT_TOKEN` ausente;
- `write_enabled=false`;
- branch editorial `content/pa-v001-admin-preview`;
- login real: HTTP 500.

A hipótese inicial não foi tratada como causa confirmada até haver diagnóstico runtime independente do `wrangler tail`, cujo procedimento já havia falhado repetidamente.

## 2. Diagnóstico runtime isolado

Workflow: `a19-runtime-diagnostic`
Run: `34719004809`
HEAD: `846c8dcf95be3095c16e26b52782b2ba9dc31e13`
Conclusão do workflow: `success`

Artefato: `pa-safra-a19-runtime-diagnostic`
Artifact ID: `10305203739`
SHA-256 do artefato: `c15d3807727c93d73fa766e40e05a364f70bbff165c2d174c2bc61ec51e4bd24`

O diagnóstico usou uma senha aleatória deliberadamente incorreta, sem usar a credencial real e sem realizar qualquer escrita editorial.

Resultado:

- status do ambiente: HTTP 200 e equivalente à A19 validada;
- tentativa de login com senha aleatória: HTTP 500;
- resposta: página Cloudflare `Worker threw exception`;
- a falha aconteceu antes do retorno controlado 401 previsto para senha incorreta.

Classificação gravada no artefato:

`FALHA_NAO_TRATADA_NO_CAMINHO_PBKDF2_OU_ANTES_DO_RETORNO_401`

## 3. Causa técnica

A A19 gerava `PA_SAFRA_ADMIN_PASSWORD_HASH` com PBKDF2-SHA256 e **310000 iterações**.

O login usa `crypto.subtle.deriveBits()` no runtime Cloudflare Workers. O `workerd`/Cloudflare Workers limita PBKDF2 a **100000 iterações**. Acima desse teto, o runtime lança `NotSupportedError`, o que explica o `Worker threw exception` observado antes do 401.

Fontes de compatibilidade consultadas:

- Cloudflare Workers — Web Crypto: https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
- `cloudflare/workerd#1346`: https://github.com/cloudflare/workerd/issues/1346
- reprodução recente do mesmo erro em Workers, `Drakonis96/nodus#454`: https://github.com/Drakonis96/nodus/issues/454

A combinação entre a evidência runtime do próprio PA Safra e o limite documentado/reproduzido do runtime torna a causa suficientemente confirmada para correção.

Classificação: **PROJECT / incompatibilidade de runtime**.

## 4. Correção mínima

A correção A19 passa a:

1. fixar PBKDF2-SHA256 em `100000` iterações para o runtime Workers;
2. impedir que hashes com contagem diferente sejam enviados ao WebCrypto;
3. transformar hash incompatível em falha controlada HTTP 503 JSON, em vez de exceção não tratada/HTTP 500 Cloudflare;
4. testar explicitamente em T1 o caso histórico de hash com 310000 iterações;
5. atualizar o gerador local de credenciais para 100000;
6. usar um único executor canônico R4 para renovar **somente** `PA_SAFRA_ADMIN_PASSWORD_HASH` no Preview, publicar o código corrigido e validar login/sessão/logout reais.

A R4 não renova `PA_SAFRA_SESSION_SECRET`, não configura `GITHUB_CONTENT_TOKEN`, não altera D1 e não toca produção.

## 5. Observação de segurança

O teto de 100000 é uma restrição do runtime e é inferior a recomendações modernas de custo para PBKDF2-SHA256. Não será tentado contornar esse teto com uma implementação PBKDF2 intensiva em JavaScript no Worker, pois isso deslocaria o problema para consumo de CPU e disponibilidade.

A decisão de 100000 nesta fase é de compatibilidade do login existente no Preview. Uma estratégia de endurecimento posterior pode avaliar pepper server-side ou outra arquitetura/KDF compatível com o ambiente, sem bloquear a correção funcional A19.

## 6. Gate corrente

A causa do HTTP 500 está diagnosticada e a correção foi implementada no candidato. O F1 da A19 continua **PENDENTE** até a R4 renovar o hash de Preview com a senha conhecida apenas pelo responsável e comprovar, no Cloudflare real:

- login HTTP 200;
- sessão autenticada;
- logout;
- escrita GitHub ainda bloqueada.

`admin_nativo_validado` permanece `false` até os gates posteriores do painel e publicação editorial controlada.
