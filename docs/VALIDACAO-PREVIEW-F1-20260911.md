# PA Safra — Validação remota F1 do Cloudflare Pages

Data: 11/09/2026

## Escopo

Primeira validação remota real do site em Cloudflare Pages, mantendo a produção bloqueada e sem uso do domínio próprio.

## Preview validado

- projeto Cloudflare Pages: `pa-safra-compensacao-ambiental-social`
- branch de validação: `feat/pa-v001-a13-preview-cloudflare-f1`
- commit-base do preview F1: `2a18c4b224466e9bc67c73b7de7c2747e59b635c`
- URL validada: `https://4d31ffe3.pa-safra-compensacao-ambiental-social.pages.dev`
- ambiente: Preview
- produção `main`: sem deployment, bloqueada deliberadamente pelo gate editorial

## Evidências técnicas

O smoke remoto foi executado pelo GitHub Actions contra a URL real do Cloudflare Pages e terminou com sucesso.

Execução:

- workflow: `remote-preview`
- run ID: `34608039703`
- resultado: `success`

O gate confirmou:

- HTTPS e host `*.pages.dev` autorizado;
- identidade do PA Safra e integridade UTF-8;
- ausência do placeholder proibido de contato;
- cabeçalhos `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy` e `X-Frame-Options`;
- `public/content/publicacao.json` remoto ainda com `production_branch: main` e `status: pendente`;
- `robots.txt` bloqueando indexação enquanto a publicação está pendente;
- integridade estrutural das duas imagens WebP do solicitante.

O workflow principal `validate` também passou no commit utilizado para executar o smoke remoto.

## Estado após a F1

- preview técnico: aprovado;
- produção: continua bloqueada;
- domínio próprio: disponível segundo informação do usuário, porém ainda não configurado;
- revisão visual humana: pendente;
- Pages CMS operacional em ambiente real: pendente;
- pendências jurídicas, históricas, de contato e créditos: permanecem conforme `publicacao.json`.

## Próximo gate

Antes de domínio e produção, executar revisão visual humana do preview e teste operacional do Pages CMS. Nenhuma pendência editorial deve ser marcada como concluída apenas para permitir deploy.
