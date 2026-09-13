# PA-V001-A27 — First paint sem salto visual

Data: 2026-09-13

## Problema observado
Ao atualizar a página pública, o topo ainda apresentava mudança rápida de formatação e a imagem principal piscava ao aparecer.

## Diagnóstico final
Além da formatação assistida de títulos e da disposição texto/imagem, a Home possuía configuração visual própria aplicada tardiamente por `app.js`:
- `title_alignment: right`;
- `title_size: compact`.

O HTML inicial também referenciava a imagem principal em `.jpg`, enquanto `site.json` apontava para a versão final `.webp`. Assim o navegador podia iniciar o carregamento de uma imagem e trocar o `src` depois.

## Correção
O build passou a sincronizar `dist/index.html` com `public/content/site.json` antes da publicação:
- classes visuais de `hero-copy` já presentes no HTML inicial;
- `src` inicial da imagem principal já aponta para o arquivo final configurado;
- `loading=eager`, `fetchpriority=high` e `decoding=sync` na imagem principal;
- preload da imagem principal no `<head>`;
- editor administrativo mantido sem alteração.

O middleware A27 continua antecipando, antes do primeiro paint, a formatação assistida de títulos e a disposição segura texto/imagem.

## Validação
HEAD: `0de35d85120b663008045e6986a8a5832b689c89`

GitHub Actions:
- run `34774332330`: SUCCESS;
- run `34774334029`: SUCCESS;
- build: SUCCESS;
- smoke: SUCCESS;
- Chrome headless: SUCCESS.

Cloudflare Pages:
- deployment `2fa80655-c615-4c14-a5a7-8b57ace11626`: SUCCESS;
- URL imutável: `https://2fa80655.pa-safra-compensacao-ambiental-social.pages.dev`;
- Preview de branch: `https://ops-pa-v001-a27-first-paint.pa-safra-compensacao-ambiental-social.pages.dev`.

## Segurança operacional
- A26 preservada no HEAD validado `578df4424552646f30421eded46e38605abccd91`;
- PR #29 continua draft e não mesclada;
- `main`, `develop`, produção, domínio e DNS não foram alterados.
