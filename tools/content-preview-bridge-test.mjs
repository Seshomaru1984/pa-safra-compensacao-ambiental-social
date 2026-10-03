import assert from 'node:assert/strict';
import fs from 'node:fs';

const endpointSource = fs.readFileSync('functions/api/content.js', 'utf8');
const bridgeSource = fs.readFileSync('public/content-preview-bridge.js', 'utf8');
const viteSource = fs.readFileSync('vite.config.js', 'utf8');

assert.match(endpointSource, /ALLOWED_CONTENT_BRANCH\s*=\s*'content\/pa-v001-admin-preview'/);
for (const resource of ['site', 'videos', 'pages', 'highlights', 'gallery', 'links']) {
  assert.match(endpointSource, new RegExp(`${resource}:\\s*'public/content/`));
}
assert.doesNotMatch(endpointSource, /onRequestPut/);
assert.match(bridgeSource, /'\/content\/site\.json': 'site'/);
assert.match(bridgeSource, /'\/content\/videos\.json': 'videos'/);
assert.match(bridgeSource, /new URL\('\/api\/content'/);
assert.match(bridgeSource, /if \(response\.ok\) return response/);
assert.match(bridgeSource, /return nativeFetch\(input, init\)/);
assert.match(viteSource, /content-preview-bridge\.js/);
assert.match(viteSource, /installFirstPaintRoute/);
assert.match(viteSource, /bridgedAdmin = injectBeforeHeadEnd\(html, PREVIEW_CONTENT_BRIDGE_TAG\)/);

const originalFetch = globalThis.fetch;
try {
  const sample = [{ title: 'Teste remoto', youtube_url: 'https://youtu.be/abc', description: '', published: true }];
  globalThis.fetch = async (url) => {
    assert.match(String(url), /public\/content\/videos\.json/);
    const encoded = Buffer.from(JSON.stringify(sample), 'utf8').toString('base64');
    return new Response(JSON.stringify({ content: encoded }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const module = await import(`../functions/api/content.js?test=${Date.now()}`);
  const good = await module.onRequestGet({
    request: new Request('https://preview.example/api/content?resource=videos'),
    env: { PA_SAFRA_CONTENT_BRANCH: 'content/pa-v001-admin-preview', GITHUB_CONTENT_TOKEN: 'test-token' },
  });
  assert.equal(good.status, 200);
  assert.equal(good.headers.get('x-pa-content-source'), 'editorial-preview');
  assert.deepEqual(await good.json(), sample);

  const wrongBranch = await module.onRequestGet({
    request: new Request('https://preview.example/api/content?resource=videos'),
    env: { PA_SAFRA_CONTENT_BRANCH: 'main' },
  });
  assert.equal(wrongBranch.status, 404);

  const unknown = await module.onRequestGet({
    request: new Request('https://preview.example/api/content?resource=unknown'),
    env: { PA_SAFRA_CONTENT_BRANCH: 'content/pa-v001-admin-preview' },
  });
  assert.equal(unknown.status, 400);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('CONTENT PREVIEW BRIDGE TEST: PASS');
