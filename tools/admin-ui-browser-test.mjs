import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const files = {
  html: path.join(root, 'public', 'admin', 'index.html'),
  js: path.join(root, 'public', 'admin', 'admin.js'),
  css: path.join(root, 'public', 'admin', 'admin.css'),
  layoutAdmin: path.join(root, 'public', 'admin', 'layout-assist.js'),
  pageActions: path.join(root, 'public', 'admin', 'page-actions.js'),
  writeQueue: path.join(root, 'public', 'admin', 'write-queue.js'),
  site: path.join(root, 'public', 'content', 'site.json'),
  layout: path.join(root, 'public', 'content', 'layout.json'),
  videos: path.join(root, 'public', 'content', 'videos.json'),
  pages: path.join(root, 'public', 'content', 'paginas.json'),
  highlights: path.join(root, 'public', 'content', 'destaques.json'),
  gallery: path.join(root, 'public', 'content', 'galeria.json'),
  links: path.join(root, 'public', 'content', 'links.json'),
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) {
    console.error(`ADMIN UI BROWSER TEST: arquivo ausente: ${path.relative(root, file)}`);
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
  const nativeFetch = window.fetch.bind(window);
  let authenticated = false;
  let currentLayout = { version: 1, blocks: { home_hero: 'text-left' } };
  window.__A24_CALLS__ = [];
  const reply = (data, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } }));
  window.fetch = async (input, init = {}) => {
    const raw = typeof input === 'string' ? input : input.url;
    const url = new URL(raw, window.location.href);
    const method = String(init.method || 'GET').toUpperCase();
    if (url.pathname === '/api/admin/status') {
      window.__A24_CALLS__.push({ endpoint: 'status', method, authenticated });
      return reply({ enabled: true, credentials_configured: true, rate_limit_configured: true, rate_limit_backend: 'd1', token_configured: true, authenticated, write_enabled: authenticated, branch: 'content/pa-v001-admin-preview', message: authenticated ? 'Administração pronta.' : 'Informe usuário e senha para acessar.' });
    }
    if (url.pathname === '/api/admin/login') {
      const body = JSON.parse(String(init.body || '{}'));
      window.__A24_CALLS__.push({ endpoint: 'login', method, username: body.username });
      if (body.username !== 'admin' || body.password !== 'A24-test-password') return reply({ ok: false, error: 'Credenciais inválidas.' }, 401);
      authenticated = true;
      return reply({ ok: true });
    }
    if (url.pathname === '/api/admin/logout') {
      window.__A24_CALLS__.push({ endpoint: 'logout', method }); authenticated = false; return reply({ ok: true });
    }
    if (url.pathname === '/api/admin/layout') {
      const body = method === 'PUT' ? JSON.parse(String(init.body || '{}')) : null;
      window.__A24_CALLS__.push({ endpoint: 'layout', method, body });
      if (!authenticated) return reply({ ok: false, error: 'Sessão inválida.' }, 401);
      if (method === 'PUT') currentLayout = structuredClone(body.data);
      return reply({ ok: true, data: currentLayout, branch: 'content/pa-v001-admin-preview' });
    }
    if (url.pathname === '/api/admin/content') {
      const body = JSON.parse(String(init.body || '{}'));
      window.__A24_CALLS__.push({ endpoint: 'content', method, body });
      if (!authenticated) return reply({ ok: false, error: 'Sessão inválida.' }, 401);
      if (body.resource === 'news' || body.resource === 'noticias') return reply({ ok: false, error: 'Recurso editorial não permitido.' }, 400);
      return reply({ ok: true, resource: body.resource, commit: 'a24-browser-mock-commit', branch: 'content/pa-v001-admin-preview' });
    }
    return nativeFetch(input, init);
  };
})();
</script>`;

const browserTestModule = String.raw`
const wait = async (predicate, label, timeout = 6500) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Timeout: ' + label);
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const result = document.createElement('pre');
result.id = 'a24-result'; result.hidden = true; document.body.append(result);

try {
  await wait(() => !document.querySelector('#login-panel').hidden, 'painel de login');
  assert(document.querySelector('#admin-app').hidden, 'Admin deve iniciar oculto.');
  document.querySelector('#login-user').value = 'admin';
  document.querySelector('#login-password').value = 'A24-test-password';
  document.querySelector('#login-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await wait(() => !document.querySelector('#admin-app').hidden, 'entrada no admin');

  const tabs = [...document.querySelectorAll('.tab')];
  assert(tabs.length === 9, 'Painel deve expor exatamente nove áreas editoriais.');
  assert(!document.querySelector('[data-tab="noticias"]'), 'Notícias não pode existir no painel.');
  for (const id of ['inicio','sobre','destaques','videos','galeria','links','legado','paginas','aparencia']) {
    assert(document.querySelector('[data-tab="' + id + '"]'), 'Aba ausente: ' + id);
  }
  assert(!document.querySelector('#save-home').disabled, 'Publicação da página inicial deve estar habilitada após login.');
  await wait(() => document.querySelector('[data-layout-control="home_hero"]'), 'controle de disposição da capa');

  const title = document.querySelector('#home-hero-title');
  const originalTitle = title.value;
  title.value = originalTitle + ' — A24 PRIMEIRO';
  const rich = document.querySelector('#home-hero-lead');
  rich.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('justifyFull', false, null);
  const firstImageLeft = document.querySelector('input[name="layout-home_hero"][value="image-left"]');
  firstImageLeft.checked = true;
  firstImageLeft.dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelector('#save-home').click();

  await wait(() => window.__A24_CALLS__.filter((call) => call.endpoint === 'content' && call.body?.resource === 'site').length >= 1, 'primeira publicação da página inicial');
  await wait(() => window.__A24_CALLS__.filter((call) => call.endpoint === 'layout' && call.method === 'PUT').length >= 1, 'primeira publicação do layout');
  await wait(() => !document.querySelector('#save-home').disabled, 'reativação do Salvar após primeira publicação');

  const firstSiteWrite = window.__A24_CALLS__.filter((call) => call.endpoint === 'content' && call.body?.resource === 'site').at(-1);
  const firstLayoutWrite = window.__A24_CALLS__.filter((call) => call.endpoint === 'layout' && call.method === 'PUT').at(-1);
  assert(firstSiteWrite.body.data.hero.title.endsWith('— A24 PRIMEIRO'), 'Primeiro salvamento perdeu o título editado.');
  assert(firstSiteWrite.body.data.legacy?.body?.includes('Wolnei Divino Franco'), 'Salvar página inicial não pode apagar Memória e legado.');
  assert(firstLayoutWrite.body.data.blocks.home_hero === 'image-left', 'Primeiro salvamento perdeu Imagem à esquerda.');

  await wait(() => document.querySelector('[data-layout-control="home_hero"]'), 'controle recriado após primeiro salvamento');
  document.querySelector('#home-hero-title').value = originalTitle + ' — A24 SEGUNDO';
  const secondTextLeft = document.querySelector('input[name="layout-home_hero"][value="text-left"]');
  secondTextLeft.checked = true;
  secondTextLeft.dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelector('#save-home').click();

  await wait(() => window.__A24_CALLS__.filter((call) => call.endpoint === 'content' && call.body?.resource === 'site').length >= 2, 'segunda publicação da página inicial');
  await wait(() => window.__A24_CALLS__.filter((call) => call.endpoint === 'layout' && call.method === 'PUT').length >= 2, 'segunda publicação do layout');
  await wait(() => !document.querySelector('#save-home').disabled, 'reativação do Salvar após segunda publicação');

  const secondSiteWrite = window.__A24_CALLS__.filter((call) => call.endpoint === 'content' && call.body?.resource === 'site').at(-1);
  const secondLayoutWrite = window.__A24_CALLS__.filter((call) => call.endpoint === 'layout' && call.method === 'PUT').at(-1);
  assert(secondSiteWrite.body.data.hero.title.endsWith('— A24 SEGUNDO'), 'Segundo salvamento perdeu o título editado.');
  assert(secondLayoutWrite.body.data.blocks.home_hero === 'text-left', 'Segundo salvamento perdeu Texto à esquerda.');

  document.querySelector('[data-tab="legado"]').click();
  await wait(() => !document.querySelector('#panel-legado').hidden, 'aba legado');
  assert(document.querySelector('#legacy-body').innerText.includes('primeiros advogados da região'), 'Texto histórico original não foi preservado no editor.');
  assert(document.querySelector('#legacy-body').innerText.includes('Perdizes/MG'), 'Episódio de Perdizes não foi preservado no editor.');

  document.querySelector('[data-tab="videos"]').click();
  await wait(() => !document.querySelector('#panel-videos').hidden, 'aba vídeos');
  const before = document.querySelectorAll('#videos-editor .editor-card').length;
  document.querySelector('#add-video').click();
  const cards = [...document.querySelectorAll('#videos-editor .editor-card')];
  assert(cards.length === before + 1, 'Adicionar palestra não criou cartão.');
  const card = cards.at(-1);
  card.querySelector('[data-role="title"]').value = 'Palestra técnica A24';
  card.querySelector('[data-role="url"]').value = 'https://youtu.be/dQw4w9WgXcQ';
  card.querySelector('[data-role="description"]').textContent = 'Descrição de teste.';
  card.querySelector('[data-role="published"]').checked = false;
  document.querySelector('#save-videos').click();
  await wait(() => window.__A24_CALLS__.some((call) => call.endpoint === 'content' && call.body?.resource === 'videos'), 'publicação de vídeos');
  const videoWrite = [...window.__A24_CALLS__].reverse().find((call) => call.endpoint === 'content' && call.body?.resource === 'videos');
  assert(videoWrite.body.data.at(-1).title === 'Palestra técnica A24', 'Payload de vídeo perdeu o título.');
  assert(videoWrite.body.data.at(-1).published === false, 'Estado oculto do vídeo não foi preservado.');

  document.querySelector('[data-tab="links"]').click();
  await wait(() => !document.querySelector('#panel-links').hidden, 'aba links');
  assert(document.querySelectorAll('#official-links-editor .editor-card').length >= 3, 'Links oficiais existentes não foram carregados.');
  document.querySelector('#save-links').click();
  await wait(() => window.__A24_CALLS__.some((call) => call.endpoint === 'content' && call.body?.resource === 'links'), 'publicação de links');

  const toolbarText = [...document.querySelectorAll('.rich-toolbar button')].map((node) => node.title + ' ' + node.textContent).join(' ');
  for (const tool of ['Negrito', 'Itálico', 'Sublinhado', 'Centralizar', 'Justificar', 'Link', 'Limpar formato']) assert(toolbarText.includes(tool), 'Ferramenta de texto ausente: ' + tool);
  assert(document.querySelector('.rich-toolbar input[type="color"]'), 'Seletor de cor ausente.');
  assert(document.querySelector('.rich-toolbar select'), 'Seletor de tamanho ausente.');

  const visibleText = document.querySelector('.admin-shell').innerText.toLowerCase();
  for (const forbidden of ['github', 'cloudflare', 'branch', 'commit', 'deploy', 'json', 'javascript']) assert(!visibleText.includes(forbidden), 'Interface comum expôs termo técnico: ' + forbidden);

  document.querySelector('#logout-button').click();
  await wait(() => !document.querySelector('#login-panel').hidden, 'retorno ao login');
  assert(document.querySelector('#admin-app').hidden, 'Admin deve ocultar após logout.');
  assert(window.__A24_CALLS__.some((call) => call.endpoint === 'logout'), 'Logout não alcançou a API simulada.');

  document.documentElement.dataset.a24Result = 'PASS';
  result.textContent = 'A24 ADMIN UI BROWSER TEST: PASS';
} catch (error) {
  document.documentElement.dataset.a24Result = 'FAIL';
  result.textContent = 'A24 ADMIN UI BROWSER TEST: FAIL — ' + error.message;
  console.error(result.textContent);
}
`;

const originalHtml = fs.readFileSync(files.html, 'utf8');
const marker = '<script type="module" src="/admin/admin.js"></script>';
if (!originalHtml.includes(marker)) {
  console.error('ADMIN UI BROWSER TEST: marcador do admin.js não encontrado no HTML.');
  process.exit(1);
}
const injectedScripts = `${bootstrap}\n<script src="/admin/write-queue.js"></script>\n${marker}\n<script type="module" src="/admin/layout-assist.js"></script>\n<script type="module" src="/admin/page-actions.js"></script>\n<script type="module" src="/__a24_test.js"></script>`;
const testHtml = originalHtml.replace(marker, injectedScripts);

const staticMap = new Map([
  ['/content/site.json', files.site], ['/content/layout.json', files.layout], ['/content/videos.json', files.videos], ['/content/paginas.json', files.pages],
  ['/content/destaques.json', files.highlights], ['/content/galeria.json', files.gallery], ['/content/links.json', files.links],
]);

const scriptMap = new Map([
  ['/admin/admin.js', files.js], ['/admin/layout-assist.js', files.layoutAdmin], ['/admin/page-actions.js', files.pageActions], ['/admin/write-queue.js', files.writeQueue],
]);

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  const send = (status, type, body) => { response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }); response.end(body); };
  if (url.pathname === '/admin' || url.pathname === '/admin/') return send(200, 'text/html; charset=utf-8', testHtml);
  if (scriptMap.has(url.pathname)) return send(200, 'text/javascript; charset=utf-8', fs.readFileSync(scriptMap.get(url.pathname)));
  if (url.pathname === '/admin/admin.css') return send(200, 'text/css; charset=utf-8', fs.readFileSync(files.css));
  if (staticMap.has(url.pathname)) return send(200, 'application/json; charset=utf-8', fs.readFileSync(staticMap.get(url.pathname)));
  if (url.pathname === '/__a24_test.js') return send(200, 'text/javascript; charset=utf-8', browserTestModule);
  return send(404, 'text/plain; charset=utf-8', 'not found');
});

const chrome = findChrome();
if (!chrome) { console.error('ADMIN UI BROWSER TEST: Chrome/Chromium não encontrado no ambiente.'); process.exit(1); }
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const address = server.address();
const port = typeof address === 'object' && address ? address.port : null;
if (!port) { server.close(); console.error('ADMIN UI BROWSER TEST: porta local não determinada.'); process.exit(1); }

const url = `http://127.0.0.1:${port}/admin/`;
const args = ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-background-networking', '--disable-default-apps', '--no-first-run', '--virtual-time-budget=12000', '--dump-dom', url];
let stdout = ''; let stderr = ''; let timedOut = false;
const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
child.stdout.on('data', (chunk) => { stdout += chunk; }); child.stderr.on('data', (chunk) => { stderr += chunk; });
const timeout = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 30000);
const exitCode = await new Promise((resolve) => child.once('close', resolve));
clearTimeout(timeout); await new Promise((resolve) => server.close(resolve));
if (timedOut) { console.error('ADMIN UI BROWSER TEST: Chrome excedeu 30 segundos.'); process.exit(1); }
if (exitCode !== 0) { console.error(`ADMIN UI BROWSER TEST: Chrome terminou com código ${exitCode}.`); if (stderr.trim()) console.error(stderr.trim()); process.exit(1); }
if (!/data-a24-result="PASS"/.test(stdout) || !stdout.includes('A24 ADMIN UI BROWSER TEST: PASS')) {
  console.error('ADMIN UI BROWSER TEST: fluxo ampliado não concluiu com PASS.');
  const match = stdout.match(/A24 ADMIN UI BROWSER TEST:[^<]*/); if (match) console.error(match[0]);
  if (stderr.trim()) console.error(stderr.trim());
  process.exit(1);
}
console.log('ADMIN UI BROWSER TEST: PASS');
console.log('- login e logout preservados');
console.log('- Página inicial salva conteúdo e disposição em dois ciclos consecutivos sem travar o botão');
console.log('- nove áreas editoriais presentes; Notícias ausente');
console.log('- Memória e legado original preservada ao editar outro módulo');
console.log('- publicação de site, vídeos e links gera payload coerente');
console.log('- editor rico oferece estilos, alinhamento, tamanho, cor e links');
