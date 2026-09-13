# PA-V001-A27 — First paint estável em todas as rotas públicas

Data: 2026-09-13

## Diagnóstico complementar

A Home já havia sido estabilizada, mas as demais rotas ainda apresentavam mudança visual ao recarregar porque o documento HTML nasce com a Home visível e as outras `view` ocultas. Como a navegação pública usa `#hash`, o servidor não recebe a rota escolhida; o `app.js` só trocava para `#sobre`, `#legado`, `#palestras`, `#galeria` ou `#recursos` depois de carregar os JSONs públicos.

Isso produzia um flash de estado provisório e podia ser percebido como mudança de formatação ou piscada de imagem.

## Correção

- criado `public/first-paint-route.js`, carregado de forma síncrona no `<head>`;
- criado `public/first-paint-route.css` para bloquear a pintura da view provisória;
- Home, Sobre e Memória/legado podem aparecer imediatamente na rota correta;
- Palestras, Galeria, Links úteis e páginas extras aguardam a montagem definitiva antes de serem reveladas;
- Sobre e Memória/legado pré-carregam a imagem principal quando são a rota inicial;
- ao primeiro `hashchange`, o gate é removido e a navegação volta ao fluxo normal;
- o build valida que script e CSS de rota estão no `<head>`, antes do `<body>`.

## Segurança

- editor administrativo não alterado;
- nenhum conteúdo editorial, histórico, biográfico ou jurídico foi reescrito;
- `main`, `develop`, produção, domínio e DNS intocados;
- PR #29 permanece draft e não mesclada.

## Validação

HEAD funcional: `aef925ad6e307813264c89b4ed96e6d1bab216be`

- `validate`: SUCCESS no HEAD;
- Cloudflare Pages: SUCCESS;
- Preview imutável: `https://ee5671cf.pa-safra-compensacao-ambiental-social.pages.dev`;
- Preview de branch: `https://ops-pa-v001-a27-first-paint.pa-safra-compensacao-ambiental-social.pages.dev`.
