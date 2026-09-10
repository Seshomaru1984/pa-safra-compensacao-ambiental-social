# PA Safra — Compensação Ambiental e Social

Portal institucional e informativo do Projeto de Compensação Ambiental e Social — PA Safra, em Nova Xavantina/MT.

## Desenvolvimento

- `main`: estado consolidado e aprovado;
- `develop`: integração de desenvolvimento;
- branches `feat/...` e `fix/...`: alterações isoladas por etapa;
- validação automática: `npm ci`, `npm run check`, `node --check app.js` e `npm run build`.

## Conteúdo editável

A estrutura V001-A3 separa o conteúdo editorial do layout e prepara o projeto para edição via Pages CMS. Os dados editáveis ficam em `public/content/`, e as imagens públicas ficam em `public/assets/`.

A configuração do painel está em `.pages.yml`.

## Execução local

```powershell
npm ci
npm run dev
```

O servidor de desenvolvimento usa a porta local exclusiva `4286` com `--strictPort`.

## Publicação planejada

A arquitetura definida para produção é GitHub + Pages CMS + Cloudflare Pages + domínio próprio. A publicação em produção ainda não foi executada.

## Validação editorial

Antes da publicação definitiva, devem ser confirmados créditos/licenças das imagens fornecidas pelo solicitante, dados de contato e afirmações históricas/biográficas que dependam de documentação específica.
