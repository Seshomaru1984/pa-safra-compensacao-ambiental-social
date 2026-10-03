# PA Safra — V001-A25 R2 — Persistência de layout e proporção visual

Data: 2026-09-13

## Problemas observados

1. A pré-visualização assistida funcionava, mas o site da branch A25 não refletia a disposição salva porque o runtime público lia apenas o `public/content/layout.json` estático da branch técnica.
2. Ao inverter texto e imagem, as proporções originais das colunas não eram invertidas junto com os elementos, alterando o espaço reservado às imagens e produzindo deformação/aparência de enquadramento incorreto.

## Correções

- adicionado endpoint público somente leitura `/api/layout`;
- o endpoint lê exclusivamente `public/content/layout.json` da branch editorial autorizada `content/pa-v001-admin-preview`;
- o runtime público consulta primeiro `/api/layout` e usa o arquivo estático apenas como fallback;
- nenhuma escrita foi exposta pela nova rota pública;
- a inversão agora troca também as proporções das colunas:
  - capa: imagem preserva aproximadamente `.98fr` e texto `1.02fr`;
  - Sobre: imagem preserva `.8fr` e texto `1.2fr`;
  - Memória e legado: imagem preserva `1.1fr` e texto `.9fr`;
- comportamento mobile permanece em uma coluna;
- mensagem do painel esclarecida: após salvar, abrir ou atualizar o site do Preview aplica a disposição persistida.

## Evidência de persistência

No momento da correção, a fonte editorial continha:

- `home_hero: image-left`;
- `about_hero: text-left`;
- `legacy_hero: text-left`.

Isso comprova que o salvamento administrativo estava ocorrendo; o defeito estava na leitura do site da A25.

## Validação final

HEAD: `ee336d054b195cde0075d58a494c2f512003c0a6`

- GitHub Actions `validate` (push): SUCCESS;
- GitHub Actions `validate` (PR): SUCCESS;
- Cloudflare Pages: SUCCESS;
- Preview estável: `https://ops-pa-v001-a25-layout-assis.pa-safra-compensacao-ambiental-social.pages.dev`;
- deployment exato: `https://60d53921.pa-safra-compensacao-ambiental-social.pages.dev`.

## Escopo preservado

- PR #27 permanece draft e não mesclada;
- `main`, `develop`, produção, domínio e DNS não foram alterados;
- nenhum texto biográfico, histórico, jurídico ou editorial foi reescrito;
- nenhum gate editorial pendente foi promovido.

**A25 R2: PASS.**
