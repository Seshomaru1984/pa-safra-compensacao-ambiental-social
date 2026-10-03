# PA-V001 - Auditoria de camadas e autoenquadramento

Data: 15/09/2026

Branch: `feat/pa-v001-interactive-access-map`

## Objetivo

Verificar se as demarcações exibidas pelo mapa correspondem às geometrias das fontes cartográficas oficiais, com atenção especial a sistema viário, drenagem e massas d'água, e fazer o mapa reenquadrar automaticamente a área útil quando uma camada é ativada.

## Resultado da auditoria geométrica

As camadas vetoriais não são redesenhadas manualmente pelo site.

A rota `/api/map/layer` consulta os serviços ArcGIS oficiais com:

- filtro espacial por envelope regional;
- `inSR=4326`;
- `outSR=4326`;
- `returnGeometry=true`;
- resposta GeoJSON.

Para INTERMAT, a fonte original declara SIRGAS 2000, EPSG:4674. A transformação de referência para 4326 é solicitada ao próprio ArcGIS Server. A aplicação não aplica deslocamento, escala artificial ou reconstrução da geometria.

Na camada de assentamentos, somente os atributos são normalizados. O objeto `geometry` recebido da fonte INCRA/IBAMA é preservado sem alteração.

## Sistema viário

Fonte:

`INTERMAT_CARTOGRAFIA/TRA_SISTEMA_VIARIO_L/FeatureServer/0`

A camada oficial declara:

- geometria: linha;
- finalidade: trechos viários do Estado de Mato Grosso;
- escala cartográfica: 1:100.000;
- referência: SIRGAS 2000;
- rodovias estaduais elaboradas pela SINFRA com GPS transportado;
- atualização vinculada à publicação do mapa viário da SINFRA e a correções da base.

Correção aplicada nesta auditoria:

- a consulta `roads` passou a filtrar `sv_tipo = 'Rodovia'`;
- feições de outros tipos eventualmente presentes no serviço, como ferrovia, deixam de ser apresentadas como vias rodoviárias.

A página oficial da SINFRA consultada em 15/09/2026 disponibiliza `Mapa Rodoviário - 2025-2026` e `Sistema Rodoviário Estadual - 2023`. Os pontos principais da MT-251 usados pelo mapa permanecem baseados nos trechos oficiais da SINFRA já registrados no projeto.

## Rios e córregos

Fonte:

`BDC/HID_TRECHO_DRENAGEM_L/FeatureServer/0`

A camada oficial declara:

- geometria: linha;
- finalidade: trechos de drenagem do Estado de Mato Grosso;
- escala: 1:100.000;
- referência: SIRGAS 2000.

Foi identificado um erro de completude na primeira implementação: o proxy aceitava no máximo 4 páginas de 500 feições, limitando a resposta a 2.000 feições, enquanto a consulta oficial do recorte regional retornava 5.857.

Correção aplicada:

- `PAGE_SIZE`: 1000;
- `MAX_PAGES`: 8;
- capacidade segura de até 8.000 feições;
- o run 1161 confirmou ao vivo `drainage=5857`.

Portanto, a camada deixou de apresentar apenas um subconjunto inicial da drenagem regional.

## Massas d'água

Fonte:

`INTERMAT_CARTOGRAFIA/HID_MASSA_DE_AGUA_A/FeatureServer/0`

A camada oficial declara:

- geometria: polígono;
- escala: 1:100.000;
- referência: SIRGAS 2000;
- representação de cursos d'água de margem dupla e outros corpos d'água, incluindo rios, ribeirões, córregos, lagoas, igarapés, corixos, sangradouros, vazantes, baías e furos conforme classificação da base.

O run 1161 confirmou ao vivo `water=18` para o envelope regional.

Essa camada não deve ser confundida com `Rios e córregos`: a primeira representa áreas/polígonos de água; a segunda representa eixos lineares de drenagem. O próprio mapa passou a explicar essa diferença.

## Limite de precisão

A auditoria confirma correspondência com a cartografia oficial utilizada, não precisão cadastral ou topográfica de campo.

A escala 1:100.000 é adequada para orientação regional. Limites, margens de cursos d'água, estradas vicinais e outros detalhes podem conter generalização cartográfica e defasagem temporal em relação a alterações muito recentes no terreno.

Por isso, o mapa deve ser interpretado como referência territorial e de acesso, não como levantamento geodésico, memorial descritivo ou prova de limite fundiário.

## Autoenquadramento

Ao ativar uma camada oficial, o mapa agora:

1. carrega a geometria sob demanda;
2. calcula a extensão das coordenadas da camada dentro do envelope regional autorizado;
3. ajusta automaticamente o zoom e o centro para mostrar a área correspondente;
4. aplica limite de zoom adequado ao tipo de camada;
5. repete o enquadramento quando uma camada já carregada é desativada e ativada novamente.

O cálculo de enquadramento considera apenas coordenadas dentro do envelope regional para evitar que polígonos extensos, como limites municipais completos, afastem excessivamente a visualização do foco do PA Safra.

## Contagens ao vivo no run 1161

- rodovias: 45 feições após filtro `sv_tipo = 'Rodovia'`;
- drenagem: 5.857 feições;
- massas d'água: 18 feições;
- projetos de assentamento: 14 feições;
- municípios: 7 feições.

## Validação

HEAD funcional antes desta evidência:

`9c4de3f51f30f566635af9278d369b388cda9cb7`

Workflow:

- run: 1161;
- conclusão: SUCCESS;
- fontes cartográficas ao vivo: PASS;
- JavaScript: PASS;
- build: PASS;
- smoke: PASS;
- Cloudflare readiness/env: PASS;
- navegador headless: PASS.

Cloudflare Pages publicou o mesmo HEAD com sucesso em:

`https://84edf314.pa-safra-compensacao-ambiental-social.pages.dev`

A criação desta evidência altera o HEAD da branch e requer revalidação do novo commit antes de integração.

## Escopo

O PR #44 permanece somente candidato de Preview. Não há autorização implícita para merge em `develop`, promoção para `main` ou publicação de produção.
