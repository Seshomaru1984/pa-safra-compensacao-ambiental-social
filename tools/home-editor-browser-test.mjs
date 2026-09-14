import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const files = {
  html: path.join(root, 'public', 'admin', 'index.html'),
  admin: path.join(root, 'public', 'admin', 'admin.js'),
  home: path.join(root, 'public', 'admin', 'home-editor.js'),
  queue: path.join(root, 'public', 'admin', 'write-queue.js'),
  titles: path.join(root, 'public', 'admin', 'title-style-assist.js'),
  actions: path.join(root, 'public', 'admin', 'page-actions.js'),
  css: path.join(root, 'public', 'admin', 'admin.css'),
  homeCss: path.join(root, 'public', 'admin', 'home-editor.css'),
  site: path.join(root, 'public', 'content', 'site.json'),
  videos: path.join(root, 'public', 'content', 'videos.json'),
  pages: path.join(root, 'public', 'content', 'paginas.json'),
  highlights: path.join(root, 'public', 'content', 'destaques.json'),
  gallery: path.join(root, 'public', 'content', 'galeria.json'),
  links: path.join(root, 'public', 'content', 'links.json'),
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) {
    console.error(`HOME EDITOR BROWSER TEST: arquivo ausente: ${path.relative(root, file)}`);
    process.exit(1);
  }
}

function findChrome() {
  const direct = [
    process.env.CHROME_PATH, process.env.GOOGLE_CHROME_BIN,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : null,
    process.platform === 'win32' ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' : null,
  ].filter(Boolean);
  for (const candidate of direct) if (path.isAbsolute(candidate) && fs.existsSync(candidate)) return candidate;
  for (const command of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome']) {
    const probe = spawnSync(command, ['--version'], { encoding: 'utf8' });
    if (!probe.error && probe.status === 0) return command;
  }
  return null;
}

const bootstrap = String.raw`<script>
(() => {
  let authenticated = false;
  let layout = { version: 1, blocks: { home_hero: 'text-left' } };
  let titleStyles = {
    version: 1,
    titles: {
      home_hero: { size: 'default', align: 'default', color: 'default', weight: 'default', italic: false },
      home_intro: { size: 'default', align: 'default', color: 'default', weight: 'default', italic: false },
      about_hero: { size: 'default', align: 'default', color: 'default', weight: 'default', italic: false },
      lectures_hero: { size: 'default', align: 'default', color: 'default', weight: 'default', italic: false },
      gallery_hero: { size: 'default', align: 'default', color: 'default', weight: 'default', italic: false },
      resources_hero: { size: 'default', align: 'default', color: 'default', weight: 'default', italic: false },
      legacy_hero: { size: 'default', align: 'default', color: 'default', weight: 'default', italic: false },
      extra_pages: { size: 'default', align: 'default', color: 'default', weight: 'default', italic: false }
    }
  };
  window.__HOME_CALLS__ = [];
  window.__HOME_PREVIEW__ = '';
  window.open = (url) => { window.__HOME_PREVIEW__ = String(url); return null; };

  const nativeFetch = window.fetch.bind(window);
  const reply = (data, status = 200) => Promise.resolve(new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  }));

  window.fetch = async (input, init = {}) => {
    const raw = typeof input === 'string' ? input : input.url;
    const url = new URL(raw, window.location.href);
    const method = String(init.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();

    if (url.pathname === '/api/admin/status') {
      return reply({
        enabled: true,
        credentials_configured: true,
        rate_limit_configured: true,
        rate_limit_backend: 'd1',
        token_configured: true,
        authenticated,
        write_enabled: authenticated,
        branch: 'content/pa-v001-admin-preview',
        message: authenticated ? 'Administração pronta.' : 'Informe usuário e senha para acessar.'
      });
    }

    if (url.pathname === '/api/admin/login') {
      const body = JSON.parse(String(init.body || '{}'));
      if (body.username !== 'admin' || body.password !== 'home-test-password') return reply({ ok: false, error: 'Credenciais inválidas.' }, 401);
      authenticated = true;
      return reply({ ok: true });
    }

    if (url.pathname === '/api/admin/logout') {
      authenticated = false;
      return reply({ ok: true });
    }

    if (url.pathname === '/api/admin/layout') {
      if (!authenticated) return reply({ ok: false, error: 'Sessão inválida.' }, 401);
      if (method === 'GET') return reply({ ok: true, data: layout, branch: 'content/pa-v001-admin-preview', user: 'admin' });
      if (method === 'PUT') {
        const body = JSON.parse(String(init.body || '{}'));
        layout = structuredClone(body.data);
        window.__HOME_CALLS__.push({ endpoint: 'layout', method, body: structuredClone(body) });
        return reply({ ok: true, data: layout, branch: 'content/pa-v001-admin-preview', user: 'admin' });
      }
    }

    if (url.pathname === '/api/admin/title-styles') {
      if (!authenticated) return reply({ ok: false, error: 'Sessão inválida.' }, 401);
      if (method === 'GET') return reply({ ok: true, data: titleStyles });
      if (method === 'PUT') {
        const body = JSON.parse(String(init.body || '{}'));
        titleStyles = structuredClone(body.data);
        window.__HOME_CALLS__.push({ endpoint: 'title-styles', method, body: structuredClone(body) });
        return reply({ ok: true, data: titleStyles });
      }
    }

    if (url.pathname === '/api/admin/content' && method === 'PUT') {
      if (!authenticated) return reply({ ok: false, error: 'Sessão inválida.' }, 401);
      const body = JSON.parse(String(init.body || '{}'));
      window.__HOME_CALLS__.push({ endpoint: 'content', method, body: structuredClone(body) });
      return reply({ ok: true, resource: body.resource, commit: 'home-editor-browser-test', branch: 'content/pa-v001-admin-preview' });
    }

    return nativeFetch(input, init);
  };
})();
</script>`;

const browserTest = String.raw`
const wait = async (predicate, label, timeout = 9000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Timeout: ' + label);
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const result = document.createElement('pre');
result.id = 'home-editor-result';
result.hidden = true;
document.body.append(result);

try {
  await wait(() => !document.querySelector('#login-panel').hidden, 'login');
  document.querySelector('#login-user').value = 'admin';
  document.querySelector('#login-password').value = 'home-test-password';
  document.querySelector('#login-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

  await wait(() => !document.querySelector('#admin-app').hidden, 'admin aberto');
  await wait(() => document.querySelector('[data-home-layout-control]'), 'controle de layout');
  await wait(() => document.querySelector('[data-page-preview-for="save-home"]'), 'botão único de preview');

  const assertSingleActions = () => {
    const form = document.querySelector('#home-form');
    assert(form.querySelectorAll('#save-home').length === 1, 'Home deve ter exatamente um botão Salvar.');
    assert(form.querySelectorAll('[data-page-preview-for="save-home"]').length === 1, 'Home deve ter exatamente um botão Pré-visualizar.');
    assert(!form.querySelector('[data-layout-save]') && !form.querySelector('[data-layout-preview]'), 'controle de disposição não pode criar botões próprios.');
  };
  assertSingleActions();

  const firstTitle = document.querySelector('#home-hero-title');
  firstTitle.value = firstTitle.value + ' — PRIMEIRO';
  document.querySelector('#home-layout-image-left').checked = true;
  document.querySelector('#save-home').click();

  await wait(() => window.__HOME_CALLS__.filter((call) => call.endpoint === 'layout').length >= 1, 'primeiro layout salvo');
  await wait(() => window.__HOME_CALLS__.filter((call) => call.endpoint === 'content' && call.body?.resource === 'site').length >= 1, 'primeiro conteúdo salvo');
  await wait(() => !document.querySelector('#save-home').disabled, 'Salvar reabilitado após primeira gravação');
  await wait(() => document.querySelector('[data-home-layout-control]'), 'controle recriado após primeiro save');
  await wait(() => document.querySelector('[data-page-preview-for="save-home"]'), 'preview recriado após primeiro save');
  assertSingleActions();

  const firstSite = window.__HOME_CALLS__.find((call) => call.endpoint === 'content' && call.body?.resource === 'site');
  const firstLayout = window.__HOME_CALLS__.find((call) => call.endpoint === 'layout');
  assert(firstSite.body.data.hero.title.endsWith('— PRIMEIRO'), 'primeiro salvamento perdeu a edição do título.');
  assert(firstLayout.body.data.blocks.home_hero === 'image-left', 'primeiro salvamento perdeu Imagem à esquerda.');

  const secondTitle = document.querySelector('#home-hero-title');
  secondTitle.value = secondTitle.value.replace(' — PRIMEIRO', '') + ' — SEGUNDO';
  document.querySelector('#home-layout-text-left').checked = true;
  document.querySelector('#save-home').click();

  await wait(() => window.__HOME_CALLS__.filter((call) => call.endpoint === 'layout').length >= 2, 'segundo layout salvo');
  await wait(() => window.__HOME_CALLS__.filter((call) => call.endpoint === 'content' && call.body?.resource === 'site').length >= 2, 'segundo conteúdo salvo');
  await wait(() => !document.querySelector('#save-home').disabled, 'Salvar reabilitado após segunda gravação');
  await wait(() => document.querySelector('[data-home-layout-control]'), 'controle recriado após segundo save');
  await wait(() => document.querySelector('[data-page-preview-for="save-home"]'), 'preview recriado após segundo save');
  assertSingleActions();

  const siteWrites = window.__HOME_CALLS__.filter((call) => call.endpoint === 'content' && call.body?.resource === 'site');
  const layoutWrites = window.__HOME_CALLS__.filter((call) => call.endpoint === 'layout');
  assert(siteWrites.at(-1).body.data.hero.title.endsWith('— SEGUNDO'), 'segundo salvamento perdeu a edição do título.');
  assert(layoutWrites.at(-1).body.data.blocks.home_hero === 'text-left', 'segundo salvamento perdeu Texto à esquerda.');

  document.querySelector('#home-layout-image-left').checked = true;
  document.querySelector('[data-page-preview-for="save-home"]').click();
  await wait(() => window.__HOME_PREVIEW__, 'URL de pré-visualização');
  const preview = new URL(window.__HOME_PREVIEW__);
  assert(preview.searchParams.get('layout_home') === 'image-left', 'Pré-visualizar deve usar a disposição selecionada mesmo antes de salvar.');
  assert(preview.hash === '#inicio', 'Pré-visualizar da Home deve abrir #inicio.');

  document.documentElement.dataset.homeEditorResult = 'PASS';
  result.textContent = 'HOME EDITOR BROWSER TEST: PASS';
} catch (error) {
  document.documentElement.dataset.homeEditorResult = 'FAIL';
  result.textContent = 'HOME EDITOR BROWSER TEST: FAIL — ' + error.message;
  console.error(result.textContent);
}
`;

const originalHtml = fs.readFileSync(files.html, 'utf8');
const marker = '<script type="module" src="/admin/admin.js"></script>';
if (!originalHtml.includes(marker)) {
  console.error('HOME EDITOR BROWSER TEST: marcador do admin.js não encontrado.');
  process.exit(1);
}

const scripts = `${bootstrap}\n<script src="/admin/write-queue.js"></script>\n${marker}\n<script src="/admin/home-editor.js"></script>\n<script type="module" src="/admin/title-style-assist.js"></script>\n<script type="module" src="/admin/page-actions.js"></script>\n<script type="module" src="/__home_editor_test.js"></script>`;
const testHtml = originalHtml
  .replace('</head>', '<link rel="stylesheet" href="/admin/home-editor.css" />\n</head>')
  .replace(marker, scripts);

const staticMap = new Map([
  ['/content/site.json', files.site], ['/content/videos.json', files.videos], ['/content/paginas.json', files.pages],
  ['/content/destaques.json', files.highlights], ['/content/galeria.json', files.gallery], ['/content/links.json', files.links],
]);

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  const send = (status, type, body) => {
    response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
    response.end(body);
  };

  if (url.pathname === '/admin' || url.pathname === '/admin/') return send(200, 'text/html; charset=utf-8', testHtml);
  if (url.pathname === '/admin/admin.js') return send(200, 'text/javascript; charset=utf-8', fs.readFileSync(files.admin));
  if (url.pathname === '/admin/home-editor.js') return send(200, 'text/javascript; charset=utf-8', fs.readFileSync(files.home));
  if (url.pathname === '/admin/write-queue.js') return send(200, 'text/javascript; charset=utf-8', fs.readFileSync(files.queue));
  if (url.pathname === '/admin/title-style-assist.js') return send(200, 'text/javascript; charset=utf-8', fs.readFileSync(files.titles));
  if (url.pathname === '/admin/page-actions.js') return send(200, 'text/javascript; charset=utf-8', fs.readFileSync(files.actions));
  if (url.pathname === '/admin/admin.css') return send(200, 'text/css; charset=utf-8', fs.readFileSync(files.css));
  if (url.pathname === '/admin/home-editor.css') return send(200, 'text/css; charset=utf-8', fs.readFileSync(files.homeCss));
  if (staticMap.has(url.pathname)) return send(200, 'application/json; charset=utf-8', fs.readFileSync(staticMap.get(url.pathname)));
  if (url.pathname === '/__home_editor_test.js') return send(200, 'text/javascript; charset=utf-8', browserTest);
  return send(404, 'text/plain; charset=utf-8', 'not found');
});

const chrome = findChrome();
if (!chrome) {
  console.error('HOME EDITOR BROWSER TEST: Chrome/Chromium não encontrado.');
  process.exit(1);
}

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
const port = typeof address === 'object' && address ? address.port : null;
if (!port) {
  server.close();
  console.error('HOME EDITOR BROWSER TEST: porta local não determinada.');
  process.exit(1);
}

const url = `http://127.0.0.1:${port}/admin/`;
const args = [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-background-networking',
  '--disable-default-apps', '--no-first-run', '--virtual-time-budget=14000', '--dump-dom', url,
];
let stdout = '';
let stderr = '';
let timedOut = false;
const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
child.stdout.on('data', (chunk) => { stdout += chunk; });
child.stderr.on('data', (chunk) => { stderr += chunk; });
const timeout = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 30000);
const exitCode = await new Promise((resolve) => child.once('close', resolve));
clearTimeout(timeout);
await new Promise((resolve) => server.close(resolve));

if (timedOut) {
  console.error('HOME EDITOR BROWSER TEST: Chrome excedeu 30 segundos.');
  process.exit(1);
}
if (exitCode !== 0) {
  console.error(`HOME EDITOR BROWSER TEST: Chrome terminou com código ${exitCode}.`);
  if (stderr.trim()) console.error(stderr.trim());
  process.exit(1);
}
if (!/data-home-editor-result="PASS"/.test(stdout) || !stdout.includes('HOME EDITOR BROWSER TEST: PASS')) {
  console.error('HOME EDITOR BROWSER TEST: fluxo da Home não concluiu com PASS.');
  const match = stdout.match(/HOME EDITOR BROWSER TEST:[^<]*/);
  if (match) console.error(match[0]);
  if (stderr.trim()) console.error(stderr.trim());
  process.exit(1);
}

console.log('HOME EDITOR BROWSER TEST: PASS');
console.log('- Página inicial edita e salva conteúdo normalmente');
console.log('- disposição da capa salva no mesmo clique sem botão próprio');
console.log('- primeiro e segundo salvamentos consecutivos funcionam');
console.log('- botão Salvar retorna ao estado habilitado após cada gravação');
console.log('- existe somente um Salvar e um Pré-visualizar na Home');
console.log('- pré-visualização usa a disposição ainda não salva selecionada no formulário');
