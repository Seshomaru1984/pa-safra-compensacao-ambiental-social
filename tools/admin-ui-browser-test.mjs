import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const adminHtmlPath = path.join(root, 'public', 'admin', 'index.html');
const adminJsPath = path.join(root, 'public', 'admin', 'admin.js');
const adminCssPath = path.join(root, 'public', 'admin', 'admin.css');
const siteJsonPath = path.join(root, 'public', 'content', 'site.json');
const videosJsonPath = path.join(root, 'public', 'content', 'videos.json');

for (const file of [adminHtmlPath, adminJsPath, adminCssPath, siteJsonPath, videosJsonPath]) {
  if (!fs.existsSync(file)) {
    console.error(`ADMIN UI BROWSER TEST: arquivo ausente: ${path.relative(root, file)}`);
    process.exit(1);
  }
}

function findChrome() {
  const direct = [
    process.env.CHROME_PATH,
    process.env.GOOGLE_CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : null,
    process.platform === 'win32' ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' : null,
  ].filter(Boolean);

  for (const candidate of direct) {
    if (path.isAbsolute(candidate) && fs.existsSync(candidate)) return candidate;
  }

  for (const command of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome']) {
    const probe = spawnSync(command, ['--version'], { encoding: 'utf8' });
    if (!probe.error && probe.status === 0) return command;
  }

  return null;
}

const bootstrap = String.raw`<script>
(() => {
  const nativeFetch = window.fetch.bind(window);
  let authenticated = false;
  window.__A22_CALLS__ = [];

  const reply = (data, status = 200) => Promise.resolve(new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  }));

  window.fetch = async (input, init = {}) => {
    const raw = typeof input === 'string' ? input : input.url;
    const url = new URL(raw, window.location.href);
    const method = String(init.method || 'GET').toUpperCase();

    if (url.pathname === '/api/admin/status') {
      window.__A22_CALLS__.push({ endpoint: 'status', method, authenticated });
      return reply({
        enabled: true,
        credentials_configured: true,
        rate_limit_configured: true,
        rate_limit_backend: 'd1',
        token_configured: true,
        authenticated,
        write_enabled: authenticated,
        branch: 'content/pa-v001-admin-preview',
        message: authenticated ? 'Administração pronta.' : 'Informe usuário e senha para acessar.',
      });
    }

    if (url.pathname === '/api/admin/login') {
      const body = JSON.parse(String(init.body || '{}'));
      window.__A22_CALLS__.push({ endpoint: 'login', method, username: body.username });
      if (body.username !== 'admin' || body.password !== 'A22-test-password') {
        return reply({ ok: false, error: 'Credenciais inválidas.' }, 401);
      }
      authenticated = true;
      return reply({ ok: true });
    }

    if (url.pathname === '/api/admin/logout') {
      window.__A22_CALLS__.push({ endpoint: 'logout', method });
      authenticated = false;
      return reply({ ok: true });
    }

    if (url.pathname === '/api/admin/content') {
      const body = JSON.parse(String(init.body || '{}'));
      window.__A22_CALLS__.push({ endpoint: 'content', method, body });
      if (!authenticated) return reply({ ok: false, error: 'Sessão inválida.' }, 401);
      return reply({
        ok: true,
        resource: body.resource,
        commit: 'a22-browser-mock-commit',
        branch: 'content/pa-v001-admin-preview',
      });
    }

    return nativeFetch(input, init);
  };
})();
</script>`;

const browserTestModule = String.raw`
const wait = async (predicate, label, timeout = 5000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Timeout: ' + label);
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const result = document.createElement('pre');
result.id = 'a22-result';
result.hidden = true;
document.body.append(result);

try {
  await wait(() => !document.querySelector('#login-panel').hidden, 'painel de login');
  assert(document.querySelector('#admin-app').hidden, 'Admin deve iniciar oculto.');

  document.querySelector('#login-user').value = 'admin';
  document.querySelector('#login-password').value = 'A22-test-password';
  document.querySelector('#login-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

  await wait(() => !document.querySelector('#admin-app').hidden, 'entrada no admin');
  assert(document.querySelector('#login-panel').hidden, 'Login deve ocultar após autenticação.');
  assert(!document.querySelector('#save-site').disabled, 'Publicação de site deve estar habilitada após login.');
  assert(!document.querySelector('#save-videos').disabled, 'Publicação de vídeos deve estar habilitada após login.');

  const heroTitle = document.querySelector('#hero-title');
  const previewTitle = document.querySelector('#preview-title');
  const originalTitle = heroTitle.value;
  const editedTitle = originalTitle + ' — A22';
  heroTitle.value = editedTitle;
  heroTitle.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('#preview-site').click();
  assert(previewTitle.textContent === editedTitle, 'Pré-visualização não refletiu o título editado.');

  document.querySelector('#site-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await wait(() => window.__A22_CALLS__.some((call) => call.endpoint === 'content' && call.body?.resource === 'site'), 'publicação do site');
  const siteWrite = window.__A22_CALLS__.find((call) => call.endpoint === 'content' && call.body?.resource === 'site');
  assert(siteWrite.body.data.hero.title === editedTitle, 'Payload do site não contém o título pré-visualizado.');

  document.querySelector('[data-tab="videos"]').click();
  await wait(() => !document.querySelector('#panel-videos').hidden, 'aba vídeos');
  const before = document.querySelectorAll('.video-editor-card').length;
  document.querySelector('#add-video').click();
  const cards = [...document.querySelectorAll('.video-editor-card')];
  assert(cards.length === before + 1, 'Adicionar palestra não criou novo cartão.');
  const card = cards.at(-1);
  card.querySelector('.video-title').value = 'Palestra técnica A22';
  card.querySelector('.video-url').value = 'https://youtu.be/dQw4w9WgXcQ';
  card.querySelector('.video-description').value = 'Registro de teste do fluxo administrativo.';
  card.querySelector('.video-published').checked = false;
  document.querySelector('#save-videos').click();
  await wait(() => window.__A22_CALLS__.some((call) => call.endpoint === 'content' && call.body?.resource === 'videos'), 'publicação dos vídeos');
  const videoWrite = [...window.__A22_CALLS__].reverse().find((call) => call.endpoint === 'content' && call.body?.resource === 'videos');
  const lastVideo = videoWrite.body.data.at(-1);
  assert(lastVideo.title === 'Palestra técnica A22', 'Payload de vídeos perdeu o título editado.');
  assert(lastVideo.published === false, 'Estado oculto da palestra não foi preservado.');

  const visibleText = document.querySelector('.admin-shell').innerText.toLowerCase();
  for (const forbidden of ['github', 'cloudflare', 'branch', 'commit', 'deploy', 'json', 'javascript']) {
    assert(!visibleText.includes(forbidden), 'Interface comum expôs termo técnico: ' + forbidden);
  }

  document.querySelector('#logout-button').click();
  await wait(() => !document.querySelector('#login-panel').hidden, 'retorno ao login');
  assert(document.querySelector('#admin-app').hidden, 'Admin deve ocultar após logout.');
  assert(window.__A22_CALLS__.some((call) => call.endpoint === 'logout'), 'Logout não alcançou a API simulada.');

  document.documentElement.dataset.a22Result = 'PASS';
  result.textContent = 'A22 ADMIN UI BROWSER TEST: PASS';
} catch (error) {
  document.documentElement.dataset.a22Result = 'FAIL';
  result.textContent = 'A22 ADMIN UI BROWSER TEST: FAIL — ' + error.message;
  console.error(result.textContent);
}
`;

const originalHtml = fs.readFileSync(adminHtmlPath, 'utf8');
const marker = '<script type="module" src="/admin/admin.js"></script>';
if (!originalHtml.includes(marker)) {
  console.error('ADMIN UI BROWSER TEST: marcador do admin.js não encontrado no HTML.');
  process.exit(1);
}
const testHtml = originalHtml.replace(marker, `${bootstrap}\n${marker}\n<script type="module" src="/__a22_test.js"></script>`);

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  const send = (status, type, body) => {
    response.writeHead(status, {
      'content-type': type,
      'cache-control': 'no-store',
    });
    response.end(body);
  };

  if (url.pathname === '/admin' || url.pathname === '/admin/') return send(200, 'text/html; charset=utf-8', testHtml);
  if (url.pathname === '/admin/admin.js') return send(200, 'text/javascript; charset=utf-8', fs.readFileSync(adminJsPath));
  if (url.pathname === '/admin/admin.css') return send(200, 'text/css; charset=utf-8', fs.readFileSync(adminCssPath));
  if (url.pathname === '/content/site.json') return send(200, 'application/json; charset=utf-8', fs.readFileSync(siteJsonPath));
  if (url.pathname === '/content/videos.json') return send(200, 'application/json; charset=utf-8', fs.readFileSync(videosJsonPath));
  if (url.pathname === '/__a22_test.js') return send(200, 'text/javascript; charset=utf-8', browserTestModule);
  return send(404, 'text/plain; charset=utf-8', 'not found');
});

const chrome = findChrome();
if (!chrome) {
  console.error('ADMIN UI BROWSER TEST: Chrome/Chromium não encontrado no ambiente.');
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
  console.error('ADMIN UI BROWSER TEST: porta local não determinada.');
  process.exit(1);
}

const url = `http://127.0.0.1:${port}/admin/`;
const args = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--disable-background-networking',
  '--disable-default-apps',
  '--no-first-run',
  '--virtual-time-budget=8000',
  '--dump-dom',
  url,
];

let stdout = '';
let stderr = '';
let timedOut = false;
const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
child.stdout.on('data', (chunk) => { stdout += chunk; });
child.stderr.on('data', (chunk) => { stderr += chunk; });

const timeout = setTimeout(() => {
  timedOut = true;
  child.kill('SIGKILL');
}, 20000);

const exitCode = await new Promise((resolve) => child.once('close', resolve));
clearTimeout(timeout);
await new Promise((resolve) => server.close(resolve));

if (timedOut) {
  console.error('ADMIN UI BROWSER TEST: Chrome excedeu 20 segundos.');
  process.exit(1);
}

if (exitCode !== 0) {
  console.error(`ADMIN UI BROWSER TEST: Chrome terminou com código ${exitCode}.`);
  if (stderr.trim()) console.error(stderr.trim());
  process.exit(1);
}

if (!/data-a22-result="PASS"/.test(stdout) || !stdout.includes('A22 ADMIN UI BROWSER TEST: PASS')) {
  console.error('ADMIN UI BROWSER TEST: fluxo de interface não concluiu com PASS.');
  const resultMatch = stdout.match(/A22 ADMIN UI BROWSER TEST:[^<]*/);
  if (resultMatch) console.error(resultMatch[0]);
  if (stderr.trim()) console.error(stderr.trim());
  process.exit(1);
}

console.log('ADMIN UI BROWSER TEST: PASS');
console.log('- login próprio exibido e autenticação simulada no navegador');
console.log('- edição da página inicial refletida na pré-visualização');
console.log('- publicação de site gerou payload coerente');
console.log('- palestra adicionada e publicação de vídeos gerou payload coerente');
console.log('- interface comum não expôs termos técnicos proibidos');
console.log('- logout retornou ao estado não autenticado');
