import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('public/admin/write-queue.js', 'utf8');
const viteSource = fs.readFileSync('vite.config.js', 'utf8');

for (const endpoint of ['/api/admin/content', '/api/admin/title-styles', '/api/admin/video-styles']) {
  assert.match(source, new RegExp(endpoint.replaceAll('/', '\\/')));
}
assert.match(source, /response\.status !== 502/);
assert.match(source, /writeTail\.then\(execute, execute\)/);
assert.match(viteSource, /ADMIN_WRITE_QUEUE_TAG/);
assert.match(viteSource, /\/admin\/write-queue\.js/);

let active = 0;
let maxActive = 0;
let nativeCalls = 0;
let first502 = true;

const fakeWindow = {
  location: { href: 'https://preview.example/admin/', origin: 'https://preview.example' },
  setTimeout,
  fetch: async () => {
    nativeCalls += 1;
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    if (first502) {
      first502 = false;
      return new Response(JSON.stringify({ ok: false, error: 'conflito transitório' }), { status: 502 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  },
};

const context = vm.createContext({
  window: fakeWindow,
  URL,
  Request,
  Response,
  Promise,
  Set,
  Object,
  String,
});
vm.runInContext(source, context, { filename: 'write-queue.js' });

const saveRound = async () => Promise.all([
  fakeWindow.fetch('/api/admin/content', { method: 'PUT', body: '{}', headers: { 'content-type': 'application/json' } }),
  fakeWindow.fetch('/api/admin/title-styles', { method: 'PUT', body: '{}', headers: { 'content-type': 'application/json' } }),
  fakeWindow.fetch('/api/admin/video-styles', { method: 'PUT', body: '{}', headers: { 'content-type': 'application/json' } }),
]);

const first = await saveRound();
const second = await saveRound();

assert(first.every((response) => response.status === 200), 'primeiro salvamento deve se recuperar de 502 transitório');
assert(second.every((response) => response.status === 200), 'segundo salvamento consecutivo deve continuar funcionando');
assert.equal(maxActive, 1, 'gravações editoriais devem ser estritamente serializadas');
assert(nativeCalls >= 7, 'deve haver ao menos uma repetição após 502');

console.log('ADMIN WRITE QUEUE TEST: PASS');
console.log('- content, title-styles e video-styles nunca gravam em paralelo');
console.log('- 502 transitório é repetido automaticamente');
console.log('- dois salvamentos consecutivos permanecem operacionais');
