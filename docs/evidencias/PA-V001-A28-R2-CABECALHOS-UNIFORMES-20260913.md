# PA-V001-A28 R2 — Cabeçalhos internos uniformes

Data: 2026-09-13

## Correção de interpretação
A primeira implementação A28 tratou cor e altura individuais por página como requisito. O pedido correto era o oposto: remover a variação visual entre páginas internas e padronizar a base onde ficam título e imagem. A primeira A28 foi descartada e a branch foi restaurada à A27 antes da R2.

## Escopo aplicado
- Home excluída da padronização.
- Sobre, Palestras, Galeria, Links úteis, Memória/legado e páginas extras usam a mesma base de fundo.
- Fundo único: gradiente #173f35 → #285f52.
- Altura base desktop: 300 px.
- Espaçamento vertical e alinhamento unificados.
- Sobre e Memória/legado usam a mesma proporção estrutural de texto + mídia.
- Imagens de cabeçalho limitadas ao mesmo quadro visual: até 460 × 220 px no desktop.
- Páginas sem imagem não recebem coluna vazia artificial.
- Mobile em uma coluna, com imagem limitada a 520 px de largura.
- Formatação assistida dos títulos e inversão segura texto/imagem preservadas.
- Nenhum controle individual de cor/altura foi mantido no admin.
- Nenhuma alteração de conteúdo editorial, biografia, história ou redação jurídica.

## Implementação
- `public/internal-header-uniform.css`
- `vite.config.js` injeta o stylesheet no `<head>` antes do primeiro paint.

## Validação funcional
HEAD funcional: `dad389b910cb17fb4189db441b9c281f3fe6c509`

- GitHub Actions `validate`: SUCCESS.
- Build: SUCCESS.
- Smoke: SUCCESS.
- Chrome headless: SUCCESS.
- Cloudflare Pages: SUCCESS.
- Preview imutável: https://7ca6241b.pa-safra-compensacao-ambiental-social.pages.dev
- Preview de branch: https://ops-pa-v001-a28-cabecalhos-i.pa-safra-compensacao-ambiental-social.pages.dev

## Segurança operacional
- base preservada: A27 `0b2388545efb4d0b6cca90c61223d919c693d6bc`;
- PR #30 permanece draft e sem merge;
- produção, `main`, `develop`, domínio e DNS intocados.
