# PA-V001 - Mapa interativo de Acesso

Data: 15/09/2026

## Checkpoint preservado

Antes desta alteração, o estado aprovado pelo usuário foi preservado em:

`checkpoint/pa-v001-pre-mapa-20260915`

Commit preservado:

`659169cbfd848f7ed71fccec815a4221e38e42ba`

A funcionalidade continua isolada em:

`feat/pa-v001-interactive-access-map`

## Objetivo

Transformar Acesso e localização em uma experiência cartográfica útil para desktop e principalmente celular, sem substituir o conteúdo textual e as referências já existentes.

O mapa deve permanecer limpo por padrão. Informações de maior densidade territorial são apresentadas como camadas opcionais que o usuário liga ou desliga conforme a necessidade.

## Funcionalidades

- mapa interativo com zoom, arraste e escala métrica;
- mapa-base OpenStreetMap;
- base opcional `Relevo topográfico`, usando OpenTopoMap com dados SRTM;
- seletor nativo de camadas recolhido no canto superior direito;
- camada `Vias oficiais e vicinais`;
- camada `Rios e córregos`;
- camada `Massas d'água`;
- camada `Assentamentos`;
- camada `Limites municipais`;
- camadas oficiais carregadas somente quando selecionadas;
- pontos rodoviários de referência da BR-158, MT-251, divisa Nova Xavantina/Campinápolis e entroncamento MT-251/MT-110;
- pontos rodoviários baseados no Sistema Rodoviário Estadual da SINFRA/MT;
- botão `Minha localização`;
- geolocalização solicitada somente por ação explícita do usuário;
- marcador `Você está aqui` e círculo de precisão aproximada;
- botão para restaurar a visão regional;
- controles rápidos para aproximar os pontos rodoviários;
- layout responsivo para celular;
- fallback textual caso a biblioteca cartográfica externa não esteja disponível.

## Camadas oficiais do INTERMAT

A aplicação não entrega ao navegador uma URL arbitrária de consulta. A rota pública fixa `/api/map/layer` aceita somente cinco identificadores conhecidos:

- `roads`;
- `drainage`;
- `water`;
- `settlements`;
- `municipalities`.

A consulta é limitada por envelope geográfico à região de Nova Xavantina/Campinápolis e usa paginação controlada. O navegador recebe GeoJSON com apenas os campos necessários à leitura cartográfica.

No caso de assentamentos, foram deliberadamente excluídos campos cadastrais que não são necessários ao mapa, como matrícula e responsável técnico. São solicitados somente nome, município, identificação SIPRA e modalidade.

## Privacidade

O site não persiste coordenadas do usuário no backend. A geolocalização é obtida pelo navegador após consentimento. Ao centralizar o mapa, os provedores de tiles recebem as solicitações correspondentes à área cartográfica visualizada.

As consultas ao INTERMAT passam pela rota intermediária do próprio site e não carregam dados pessoais do usuário.

## Segurança e desempenho

- Leaflet fixado na versão 1.9.4;
- CSS e JavaScript do Leaflet carregados com SRI;
- CSP libera `unpkg.com` apenas para Leaflet;
- CSP libera `tile.openstreetmap.org` e os subdomínios de `tile.opentopomap.org` apenas para imagens cartográficas;
- `Permissions-Policy` libera geolocalização apenas para a própria origem;
- câmera, microfone, pagamento e USB continuam bloqueados;
- camadas vetoriais são carregadas sob demanda;
- respostas da rota cartográfica podem ser armazenadas em cache público por 6 horas, com `stale-while-revalidate` de 24 horas;
- falha de uma camada oficial não derruba o mapa-base;
- produção `main` continua fora do escopo.

## Fontes

### INTERMAT

Base Cartográfica Digital do Estado de Mato Grosso, escala 1:100.000, SIRGAS 2000.

Serviços utilizados:

- sistema viário: `INTERMAT_CARTOGRAFIA/TRA_SISTEMA_VIARIO_L`;
- drenagem: `BDC/HID_TRECHO_DRENAGEM_L`;
- massas d'água: `INTERMAT_CARTOGRAFIA/HID_MASSA_DE_AGUA_A`;
- assentamentos: `INTERMAT_CARTOGRAFIA/LIM_ASSENTAMENTO_A`;
- limites municipais: `INTERMAT_CARTOGRAFIA/LIM_LIMITE_POLITICO_ADMINISTRATIVO_A`.

Os metadados oficiais informam reprodução permitida mediante citação da fonte para as camadas fundiárias e administrativas aplicáveis.

### SINFRA/MT

Sistema Rodoviário Estadual, trechos 251EMT0005 e 251EMT0006 da MT-251, usado para os pontos rodoviários de referência já incorporados ao mapa.

### OpenStreetMap e OpenTopoMap

- OpenStreetMap como mapa-base, com atribuição visível;
- OpenTopoMap como base topográfica opcional, com dados OSM/SRTM e atribuição CC-BY-SA visível no próprio mapa.

### TOPODATA/INPE

O TOPODATA foi pesquisado e registrado como fonte oficial brasileira de modelo digital de elevação e variáveis geomorfométricas. Não é consumido diretamente nesta versão. Pode ser usado em evolução posterior para altitude, declividade, relevo sombreado próprio ou outras derivações locais, sempre com atribuição ao INPE.

## Validação

HEAD antes desta atualização documental:

`8fbb399bcc02f30b42e713a6fdcfb38078a3228f`

Workflow `validate` do PR #44:

- run ID `34967717396`;
- run number `1129`;
- resultado: SUCCESS;
- build: PASS;
- smoke: PASS;
- JavaScript: PASS;
- Cloudflare readiness: PASS;
- navegador headless: PASS.

A atualização deste documento altera o HEAD da branch. O novo HEAD deve ser revalidado antes de qualquer integração.

## Limite da validação automatizada

O CI protege estrutura, sintaxe, build, segurança, contrato das camadas e interface headless. A disponibilidade momentânea dos servidores externos do INTERMAT e dos provedores de tiles continua sendo uma condição de rede e deve ser observada no Preview real durante a revisão manual.
