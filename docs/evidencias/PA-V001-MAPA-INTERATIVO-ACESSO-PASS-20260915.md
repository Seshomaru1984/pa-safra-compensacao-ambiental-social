# PA-V001 - Mapa interativo de Acesso

Data: 15/09/2026

## Checkpoint preservado

Antes desta alteração, o estado aprovado pelo usuário foi preservado em:

`checkpoint/pa-v001-pre-mapa-20260915`

Commit preservado:

`659169cbfd848f7ed71fccec815a4221e38e42ba`

A nova funcionalidade foi desenvolvida separadamente em:

`feat/pa-v001-interactive-access-map`

## Objetivo

Transformar Acesso e localização em uma experiência cartográfica útil para desktop e principalmente celular, sem substituir o conteúdo textual e as referências já existentes.

## Funcionalidades

- mapa interativo com zoom, arraste e escala métrica;
- mapa-base OpenStreetMap;
- pontos rodoviários de referência da BR-158, MT-251, divisa Nova Xavantina/Campinápolis e entroncamento MT-251/MT-110;
- pontos rodoviários baseados no Sistema Rodoviário Estadual da SINFRA/MT;
- botão `Minha localização`;
- geolocalização solicitada somente por ação explícita do usuário;
- marcador `Você está aqui` e círculo de precisão aproximada;
- botão para restaurar a visão regional;
- controles rápidos para aproximar os pontos rodoviários;
- layout responsivo para celular;
- fallback textual caso a biblioteca cartográfica externa não esteja disponível.

## Privacidade

O site não persiste coordenadas do usuário no backend. A geolocalização é obtida pelo navegador após consentimento. Ao centralizar o mapa, o provedor de tiles recebe as solicitações correspondentes à área cartográfica visualizada.

## Segurança

- Leaflet fixado na versão 1.9.4;
- CSS e JavaScript do Leaflet carregados com SRI;
- CSP libera apenas `unpkg.com` para Leaflet e `tile.openstreetmap.org` para os tiles;
- `Permissions-Policy` libera geolocalização apenas para a própria origem;
- nenhuma câmera, microfone, pagamento ou USB é liberado;
- produção `main` continua fora do escopo.

## Fontes

- SINFRA/MT, Sistema Rodoviário Estadual: trechos 251EMT0005 e 251EMT0006 da MT-251;
- OpenStreetMap como mapa-base, com atribuição visível;
- Leaflet 1.9.4 para interação e geolocalização mobile.

## Validação funcional inicial

HEAD funcional anterior a este documento:

`e0a90e9906e0953b9c41f0e141ec9bc6fbccabc9`

Workflow `validate`:

- run ID `34964458552`;
- run number `1119`;
- resultado: SUCCESS;
- build: PASS;
- smoke: PASS;
- JavaScript: PASS;
- Cloudflare readiness: PASS;
- navegador headless: PASS.

Como este documento altera o HEAD da branch, o candidato final deve ser revalidado antes da abertura do PR.
