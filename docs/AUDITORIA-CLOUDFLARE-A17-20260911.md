# Auditoria Cloudflare — PA Safra V001-A17/A18 — 2026-09-11

## Escopo

Auditoria operacional somente leitura realizada antes de configurar autenticação administrativa real no ambiente de preview.

Repositório autorizado e único alvo:

`Seshomaru1984/pa-safra-compensacao-ambiental-social`

## Estado confirmado pela auditoria

- branch local observada: `feat/pa-v001-a17-auth-rate-limit`;
- HEAD observado: `7247175187401e4db7422508112ca34e73787082`;
- remote local correspondente ao repositório autorizado;
- Wrangler autenticado via OAuth;
- projeto Cloudflare Pages encontrado: `pa-safra-compensacao-ambiental-social`;
- domínio técnico Pages encontrado: `pa-safra-compensacao-ambiental-social.pages.dev`;
- nenhum namespace Workers KV existente no momento da auditoria;
- nenhum secret configurado no ambiente `preview` no momento da auditoria;
- deploy de preview da A17 encontrado para o commit `7247175`;
- nenhum secret, senha, hash ou token foi gravado no repositório durante a auditoria;
- a trava editorial permanece separada da configuração de infraestrutura e não deve ser alterada nesta etapa.

A ausência de KV e secrets confirmou também que a tentativa anterior de configuração não deixou autenticação administrativa parcialmente ativa no Cloudflare.

## Estado local do Wrangler

A execução do Wrangler criou estado local em `.wrangler/`. Esse diretório não é fonte do projeto e não deve ser versionado. A V001-A18 adiciona `.wrangler/` ao `.gitignore`.

## Correção arquitetural após a auditoria

A A17 previa Workers KV para armazenar o contador do rate limiter. Antes de criar qualquer recurso Cloudflare, esse desenho foi reavaliado e substituído na A18.

O contador de tentativas de login é estado de segurança que sofre sequência de leitura, incremento e eventual bloqueio. A A18 passa a usar Cloudflare D1 como backend desse estado e o binding `PA_SAFRA_AUTH_DB`. A tabela é criada por `migrations/0001_admin_login_rate.sql`.

A regra funcional permanece:

- até 5 falhas dentro de 15 minutos;
- bloqueio de 15 minutos ao atingir o limite;
- resposta HTTP 429 com `Retry-After`;
- chave do cliente derivada por SHA-256, sem persistir o endereço bruto;
- falha fechada com HTTP 503 quando o backend de proteção não estiver configurado/disponível;
- limpeza do contador depois de autenticação válida.

Nenhum banco D1 foi criado no Cloudflare durante esta correção. Trata-se ainda de preparação de código, contrato, migration e documentação.

## Branch editorial controlada

Foi criada a branch `content/pa-v001-admin-preview` para o futuro teste ponta a ponta da escrita administrativa. Enquanto o painel estiver em validação, `PA_SAFRA_CONTENT_BRANCH` deve apontar para essa branch, não para `main`.

## Conclusão

Não foi identificada evidência de comprometimento, alteração indevida do repositório ou configuração administrativa parcial no Cloudflare. A produção continua separada do fluxo de preview e os gates editoriais permanecem pendentes.

## Próximo gate operacional

A continuação deve ocorrer somente em preview e nesta ordem:

1. manter a A18 validada no CI;
2. criar banco D1 dedicado à autenticação administrativa de preview;
3. aplicar `migrations/0001_admin_login_rate.sql`;
4. vincular o banco como `PA_SAFRA_AUTH_DB` ao ambiente de preview do Pages;
5. configurar credenciais administrativas e segredo de sessão sem expor senha em Git ou chat;
6. configurar credencial GitHub de escopo mínimo, restrita exclusivamente ao repositório PA Safra;
7. configurar `PA_SAFRA_CONTENT_BRANCH=content/pa-v001-admin-preview`;
8. manter `PA_SAFRA_ADMIN_ENABLED` desativado até os itens anteriores estarem prontos;
9. redeployar o preview para aplicar bindings/secrets;
10. executar teste ponta a ponta de login, rate limit, sessão, logout e escrita controlada;
11. verificar o custo real de CPU do PBKDF2 no ambiente Cloudflare;
12. somente depois da evidência operacional avaliar `admin_nativo_validado`.

Produção, domínio próprio e aprovações editoriais permanecem fora deste gate.
