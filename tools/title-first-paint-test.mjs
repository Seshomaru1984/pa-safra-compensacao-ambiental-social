import assert from 'node:assert/strict';
import { onRequest } from '../functions/_middleware.js';

const originalFetch = globalThis.fetch;

function htmlResponse() {
  return new Response('<!doctype html><html><head><link rel="stylesheet" href="/styles.css"></head><body><div class="hero-grid"><div class="hero-copy"><h1 id="titulo-inicio">Título</h1></div><div class="hero-media"></div></div><section data-view="sobre"><div class="page-hero-grid"><div></div><img /></div></section><section data-view="legado"><div class="legacy-grid"><div></div><figure class="legacy-photo"></figure></div></section></body></html>', {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', etag: 'abc', 'content-length': '123' },
  });
}

async function runRootCase(requestUrl, titlePayload, layoutPayload) {
  let nextCalls = 0;
  let fetchCalls = 0;
  globalThis.fetch = async (input) => {
    fetchCalls += 1;
    const url = new URL(String(input));
    if (url.pathname === '/api/title-styles') {
      return new Response(JSON.stringify({ ok: true, data: titlePayload }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/content/title-styles.json') {
      return new Response(JSON.stringify(titlePayload), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/api/layout') {
      return new Response(JSON.stringify({ ok: true, data: layoutPayload }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/content/layout.json') {
      return new Response(JSON.stringify(layoutPayload), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 404 });
  };

  const response = await onRequest({
    request: new Request(requestUrl),
    env: { PA_SAFRA_CONTENT_BRANCH: 'content/pa-v001-admin-preview' },
    next: async () => { nextCalls += 1; return htmlResponse(); },
  });

  return { response, html: await response.text(), nextCalls, fetchCalls };
}

try {
  const titlePayload = {
    version: 1,
    titles: {
      home_hero: { size: 'medium', align: 'center', color: '#123456', weight: 'bold', italic: true },
    },
  };
  const layoutPayload = {
    version: 1,
    blocks: {
      home_hero: 'image-left',
      about_hero: 'image-left',
      legacy_hero: 'image-left',
    },
  };

  const root = await runRootCase('https://preview.example/', titlePayload, layoutPayload);
  assert.equal(root.response.status, 200);
  assert.equal(root.nextCalls, 1);
  assert.ok(root.fetchCalls >= 2);
  assert.ok(root.html.includes('id="pa-safra-title-first-paint"'), 'CSS crítico do título não foi injetado no HTML inicial.');
  assert.ok(root.html.includes('id="pa-safra-layout-first-paint"'), 'CSS crítico do layout não foi injetado no HTML inicial.');
  assert.ok(root.html.indexOf('pa-safra-title-first-paint') < root.html.indexOf('</head>'), 'CSS crítico do título precisa estar dentro do head.');
  assert.ok(root.html.indexOf('pa-safra-layout-first-paint') < root.html.indexOf('</head>'), 'CSS crítico do layout precisa estar dentro do head.');
  assert.ok(root.html.includes('#titulo-inicio{font-size:clamp(1.75rem, 3.2vw, 2.6rem)!important'), 'Tamanho médio não foi aplicado antes do primeiro paint.');
  assert.ok(root.html.includes('text-align:center!important'), 'Alinhamento não foi incorporado ao CSS inicial.');
  assert.ok(root.html.includes('color:#123456!important'), 'Cor não foi incorporada ao CSS inicial.');
  assert.ok(root.html.includes('font-weight:800!important'), 'Peso não foi incorporado ao CSS inicial.');
  assert.ok(root.html.includes('font-style:italic!important'), 'Itálico não foi incorporado ao CSS inicial.');
  assert.ok(root.html.includes('@media(max-width:680px){#titulo-inicio{font-size:clamp(1.6rem, 7vw, 2.15rem)!important}}'), 'Tamanho responsivo mobile não foi antecipado.');
  assert.ok(root.html.includes('@media(min-width:981px){.hero-grid{grid-template-columns:minmax(420px,.98fr) minmax(0,1.02fr)}'), 'Grade invertida da home não foi antecipada.');
  assert.ok(root.html.includes('.hero-grid>.hero-copy{grid-column:2;grid-row:1}'), 'Texto da home não foi posicionado antes do primeiro paint.');
  assert.ok(root.html.includes('.hero-grid>.hero-media{grid-column:1;grid-row:1}'), 'Imagem da home não foi posicionada antes do primeiro paint.');
  assert.ok(root.html.includes('[data-view="sobre"] .page-hero-grid{grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr)}'), 'Layout do Sobre não foi antecipado.');
  assert.ok(root.html.includes('[data-view="legado"] .legacy-grid{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr)}'), 'Layout do Legado não foi antecipado.');
  assert.equal(root.response.headers.get('etag'), null, 'ETag antigo não pode sobreviver à transformação do HTML.');
  assert.equal(root.response.headers.get('content-length'), null, 'Content-Length antigo não pode sobreviver à transformação do HTML.');

  const preview = await runRootCase('https://preview.example/?title_preview=home_hero&title_size=display&title_align=right&title_color=%23abcdef&title_weight=semibold&title_italic=0&layout_home=text-left&layout_about=image-left', titlePayload, layoutPayload);
  assert.ok(preview.html.includes('font-size:clamp(2.45rem, 5.5vw, 4.2rem)!important'), 'Pré-visualização do título precisa ser antecipada no HTML inicial.');
  assert.ok(preview.html.includes('text-align:right!important'), 'Alinhamento da pré-visualização não foi antecipado.');
  assert.ok(preview.html.includes('color:#abcdef!important'), 'Cor da pré-visualização não foi antecipada.');
  assert.ok(preview.html.includes('font-weight:650!important'), 'Peso da pré-visualização não foi antecipado.');
  assert.ok(!preview.html.includes('.hero-grid>.hero-copy{grid-column:2;grid-row:1}'), 'Preview text-left da home não deve receber a inversão salva.');
  assert.ok(preview.html.includes('[data-view="sobre"] .page-hero-grid>div{grid-column:2;grid-row:1}'), 'Preview image-left do Sobre deve ser antecipado.');

  let adminNext = 0;
  let adminFetch = 0;
  globalThis.fetch = async () => { adminFetch += 1; return new Response('{}', { status: 500 }); };
  const adminResponse = await onRequest({
    request: new Request('https://preview.example/admin/'),
    env: { PA_SAFRA_CONTENT_BRANCH: 'content/pa-v001-admin-preview' },
    next: async () => { adminNext += 1; return new Response('ADMIN', { status: 200, headers: { 'content-type': 'text/html' } }); },
  });
  assert.equal(await adminResponse.text(), 'ADMIN', 'Middleware não deve alterar o painel administrativo.');
  assert.equal(adminNext, 1);
  assert.equal(adminFetch, 0, 'Painel administrativo não deve consultar dados de primeiro paint.');

  console.log('FIRST PAINT TEST: PASS');
  console.log('- HTML público recebe CSS crítico de títulos e layout antes do primeiro paint');
  console.log('- valores salvos e preview usam as mesmas faixas e disposições seguras');
  console.log('- painel administrativo permanece intocado');
} finally {
  globalThis.fetch = originalFetch;
}
