import assert from 'node:assert/strict';
import { onRequest } from '../functions/_middleware.js';

const originalFetch = globalThis.fetch;

function htmlResponse() {
  return new Response('<!doctype html><html><head><link rel="stylesheet" href="/styles.css"></head><body><h1 id="titulo-inicio">Título</h1></body></html>', {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', etag: 'abc', 'content-length': '123' },
  });
}

async function runRootCase(requestUrl, payload) {
  let nextCalls = 0;
  let fetchCalls = 0;
  globalThis.fetch = async (input) => {
    fetchCalls += 1;
    const url = new URL(String(input));
    if (url.pathname === '/api/title-styles') {
      return new Response(JSON.stringify({ ok: true, data: payload }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.pathname === '/content/title-styles.json') {
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
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
  const payload = {
    version: 1,
    titles: {
      home_hero: { size: 'medium', align: 'center', color: '#123456', weight: 'bold', italic: true },
    },
  };

  const root = await runRootCase('https://preview.example/', payload);
  assert.equal(root.response.status, 200);
  assert.equal(root.nextCalls, 1);
  assert.ok(root.fetchCalls >= 1);
  assert.ok(root.html.includes('id="pa-safra-title-first-paint"'), 'CSS crítico não foi injetado no HTML inicial.');
  assert.ok(root.html.indexOf('pa-safra-title-first-paint') < root.html.indexOf('</head>'), 'CSS crítico precisa estar dentro do head.');
  assert.ok(root.html.includes('#titulo-inicio{font-size:clamp(1.75rem, 3.2vw, 2.6rem)!important'), 'Tamanho médio não foi aplicado antes do primeiro paint.');
  assert.ok(root.html.includes('text-align:center!important'), 'Alinhamento não foi incorporado ao CSS inicial.');
  assert.ok(root.html.includes('color:#123456!important'), 'Cor não foi incorporada ao CSS inicial.');
  assert.ok(root.html.includes('font-weight:800!important'), 'Peso não foi incorporado ao CSS inicial.');
  assert.ok(root.html.includes('font-style:italic!important'), 'Itálico não foi incorporado ao CSS inicial.');
  assert.ok(root.html.includes('@media(max-width:680px){#titulo-inicio{font-size:clamp(1.6rem, 7vw, 2.15rem)!important}}'), 'Tamanho responsivo mobile não foi antecipado.');
  assert.equal(root.response.headers.get('etag'), null, 'ETag antigo não pode sobreviver à transformação do HTML.');
  assert.equal(root.response.headers.get('content-length'), null, 'Content-Length antigo não pode sobreviver à transformação do HTML.');

  const preview = await runRootCase('https://preview.example/?title_preview=home_hero&title_size=display&title_align=right&title_color=%23abcdef&title_weight=semibold&title_italic=0', payload);
  assert.ok(preview.html.includes('font-size:clamp(2.45rem, 5.5vw, 4.2rem)!important'), 'Pré-visualização precisa ser antecipada no HTML inicial.');
  assert.ok(preview.html.includes('text-align:right!important'), 'Alinhamento da pré-visualização não foi antecipado.');
  assert.ok(preview.html.includes('color:#abcdef!important'), 'Cor da pré-visualização não foi antecipada.');
  assert.ok(preview.html.includes('font-weight:650!important'), 'Peso da pré-visualização não foi antecipado.');

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
  assert.equal(adminFetch, 0, 'Painel administrativo não deve consultar estilos de primeiro paint.');

  console.log('TITLE FIRST PAINT TEST: PASS');
  console.log('- HTML público recebe CSS crítico antes do primeiro paint');
  console.log('- valores salvos e preview usam as mesmas faixas seguras');
  console.log('- painel administrativo permanece intocado');
} finally {
  globalThis.fetch = originalFetch;
}
