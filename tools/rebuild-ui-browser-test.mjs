import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const dist = path.join(root, 'dist');
const adminHtmlPath = path.join(dist, 'admin', 'index.html');
const publicHtmlPath = path.join(dist, 'index.html');

if (!fs.existsSync(adminHtmlPath) || !fs.existsSync(publicHtmlPath)) {
  console.error('REBUILD UI BROWSER TEST: dist ausente. Execute npm run build antes deste teste.');
  process.exit(1);
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

const adminBootstrap = String.raw`<script>
(() => {
  const nativeFetch = window.fetch.bind(window);
  const data = {
    authenticated: false,
    firstContent502: true,
    calls: [],
    opens: [],
    content: {},
    layout: { version: 1, blocks: { home_hero: 'image-left' } },
    titleStyles: {
      version: 1,
      titles: {
        home_hero: { size: 'medium', align: 'default', color: 'default', weight: 'default', italic: false },
        home_intro: { size: 'default', align: 'default', color: 'default', weight: 'default', italic: false },
        about_hero: { size: 'medium', align: 'default', color: 'default', weight: 'default', italic: false },
        lectures_hero: { size: 'medium', align: 'default', color: 'default', weight: 'default', italic: false },
        gallery_hero: { size: 'medium', align: 'default', color: 'default', weight: 'default', italic: false },
        resources_hero: { size: 'medium', align: 'default', color: 'default', weight: 'default', italic: false },
        legacy_hero: { size: 'medium', align: 'default', color: 'default', weight: 'default', italic: false },
        extra_pages: { size: 'default', align: 'default', color: 'default', weight: 'default', italic: false },
      },
    },
    videoStyles: { version: 1, title_size_px: 24 },
  };
  window.__PA_REBUILD_TEST__ = data;
  window.open = (url) => { data.opens.push(String(url)); return null; };

  const reply = (payload, status = 200) => Promise.resolve(new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  }));
  const bodyOf = async (input, init) => {
    if (typeof init?.body === 'string') return JSON.parse(init.body || '{}');
    if (input instanceof Request) return JSON.parse(await input.clone().text() || '{}');
    return {};
  };
  const methodOf = (input, init) => String(init?.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
  const staticPath = {
    site: '/content/site.json', videos: '/content/videos.json', pages: '/content/paginas.json',
    highlights: '/content/destaques.json', gallery: '/content/galeria.json', links: '/content/links.json',
  };
  const loadStatic = async (resource) => {
    const file = staticPath[resource];
    if (!file) return null;
    const response = await nativeFetch(file, { cache: 'no-store' });
    return response.ok ? response.json() : null;
  };

  window.fetch = async (input, init = {}) => {
    const raw = input instanceof Request ? input.url : input;
    const url = new URL(String(raw), window.location.href);
    const method = methodOf(input, init);

    if (url.pathname === '/api/admin/status') {
      return reply({
        enabled: true, credentials_configured: true, rate_limit_configured: true, rate_limit_backend: 'd1', token_configured: true,
        authenticated: data.authenticated, write_enabled: data.authenticated, branch: 'content/pa-v001-admin-preview',
        message: data.authenticated ? 'Administração pronta.' : 'Informe usuário e senha para acessar.',
      });
    }
    if (url.pathname === '/api/admin/login' && method === 'POST') {
      const body = await bodyOf(input, init);
      if (body.username !== 'admin' || body.password !== 'rebuild-test-password') return reply({ ok: false, error: 'Credenciais inválidas.' }, 401);
      data.authenticated = true;
      data.calls.push({ endpoint: 'login', status: 200 });
      return reply({ ok: true });
    }
    if (url.pathname === '/api/admin/logout' && method === 'POST') {
      data.authenticated = false;
      data.calls.push({ endpoint: 'logout', status: 200 });
      return reply({ ok: true });
    }
    if (!data.authenticated && url.pathname.startsWith('/api/admin/')) return reply({ ok: false, error: 'Sessão inválida.' }, 401);

    if (url.pathname === '/api/admin/content' && method === 'PUT') {
      const body = await bodyOf(input, init);
      if (data.firstContent502) {
        data.firstContent502 = false;
        data.calls.push({ endpoint: 'content', resource: body.resource, status: 502 });
        return reply({ ok: false, error: 'conflito transitório simulado' }, 502);
      }
      data.content[body.resource] = structuredClone(body.data);
      data.calls.push({ endpoint: 'content', resource: body.resource, status: 200, data: structuredClone(body.data) });
      return reply({ ok: true, resource: body.resource, commit: 'rebuild-browser-mock', branch: 'content/pa-v001-admin-preview' });
    }
    if (url.pathname === '/api/content' && method === 'GET') {
      const resource = url.searchParams.get('resource') || '';
      if (!Object.prototype.hasOwnProperty.call(data.content, resource)) data.content[resource] = await loadStatic(resource);
      return reply(data.content[resource]);
    }

    if (url.pathname === '/api/admin/layout') {
      if (method === 'GET') return reply({ ok: true, data: data.layout });
      if (method === 'PUT') {
        const body = await bodyOf(input, init); data.layout = structuredClone(body.data);
        data.calls.push({ endpoint: 'layout', status: 200, data: structuredClone(body.data) });
        return reply({ ok: true, data: data.layout, commit: 'rebuild-layout-mock' });
      }
    }
    if (url.pathname === '/api/admin/title-styles') {
      if (method === 'GET') return reply({ ok: true, data: data.titleStyles });
      if (method === 'PUT') {
        const body = await bodyOf(input, init); data.titleStyles = structuredClone(body.data);
        data.calls.push({ endpoint: 'title-styles', status: 200, data: structuredClone(body.data) });
        return reply({ ok: true, data: data.titleStyles, commit: 'rebuild-title-mock' });
      }
    }
    if (url.pathname === '/api/admin/video-styles') {
      if (method === 'GET') return reply({ ok: true, data: data.videoStyles });
      if (method === 'PUT') {
        const body = await bodyOf(input, init); data.videoStyles = structuredClone(body.data);
        data.calls.push({ endpoint: 'video-styles', status: 200, data: structuredClone(body.data) });
        return reply({ ok: true, data: data.videoStyles, commit: 'rebuild-video-style-mock' });
      }
    }

    return nativeFetch(input, init);
  };
})();
</script>`;

const adminTest = String.raw`<script type="module">
const state = window.__PA_REBUILD_TEST__;
const wait = async (predicate, label, timeout = 9000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { if (predicate()) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  throw new Error('Timeout: ' + label);
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const successful = (endpoint, resource = null) => state.calls.filter((call) => call.endpoint === endpoint && call.status === 200 && (!resource || call.resource === resource));
const actionPair = (saveId) => {
  const save = document.getElementById(saveId);
  const actions = save?.closest('.form-actions');
  if (!save || !actions) return null;
  const buttons = [...actions.querySelectorAll('button')];
  return { save, actions, buttons, labels: buttons.map((button) => button.textContent.trim()) };
};
const noHorizontalOverflow = () => document.documentElement.scrollWidth <= window.innerWidth + 2;
const result = document.createElement('pre'); result.id = 'rebuild-admin-result'; result.hidden = true; document.body.append(result);

try {
  await wait(() => !document.querySelector('#login-panel')?.hidden, 'login visível');
  document.querySelector('#login-user').value = 'admin';
  document.querySelector('#login-password').value = 'rebuild-test-password';
  document.querySelector('#login-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await wait(() => !document.querySelector('#admin-app')?.hidden, 'Admin autenticado');

  const saveIds = ['save-home','save-about','save-highlights','save-videos','save-gallery','save-links','save-legacy','save-pages','save-appearance'];
  await wait(() => saveIds.every((id) => actionPair(id)?.labels.includes('Pré-visualizar') && actionPair(id)?.labels.includes('Salvar')), 'ações unificadas');
  for (const id of saveIds) {
    const pair = actionPair(id);
    assert(pair.buttons.length === 2, id + ' deve ter exatamente dois botões finais');
    assert(pair.labels.filter((label) => label === 'Pré-visualizar').length === 1, id + ' deve ter um Pré-visualizar');
    assert(pair.labels.filter((label) => label === 'Salvar').length === 1, id + ' deve ter um Salvar');
  }
  assert(!document.querySelector('[data-layout-save], [data-layout-preview], [data-title-save], [data-title-preview], [data-video-title-save], [data-video-title-preview]'), 'controles internos não podem criar botões próprios');

  await wait(() => document.querySelector('[data-layout-control="home_hero"]') && document.querySelector('#home-hero-image')?.dataset.imageUpload === 'ready', 'controles da Home');
  assert(document.querySelector('input[name="layout-home_hero"]:checked')?.value === 'image-left', 'layout editorial atual image-left não foi carregado');
  assert(document.querySelector('#home-hero-image').closest('label')?.nextElementSibling?.classList.contains('image-upload'), 'upload da Home não foi integrado ao campo de imagem');

  const homePreview = actionPair('save-home').buttons.find((button) => button.textContent.trim() === 'Pré-visualizar');
  homePreview.click();
  await wait(() => state.opens.length > 0, 'Pré-visualizar da Home');
  const previewUrl = new URL(state.opens.at(-1));
  assert(previewUrl.searchParams.get('layout_home') === 'image-left', 'Pré-visualizar não carregou a disposição selecionada');
  assert(previewUrl.hash === '#inicio', 'Pré-visualizar da Home abriu âncora incorreta');

  for (let round = 1; round <= 3; round += 1) {
    const before = successful('content', 'site').length;
    const title = document.querySelector('#home-hero-title');
    title.value = title.value.replace(/ \| R[123]$/, '') + ' | R' + round;
    document.querySelector('#home-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await wait(() => successful('content', 'site').length === before + 1, 'salvamento da Home R' + round);
    await wait(() => actionPair('save-home')?.save.textContent.trim() === 'Salvar' && !actionPair('save-home')?.save.disabled, 'Home pronta após R' + round);
    await wait(() => successful('title-styles').length >= round && successful('layout').length >= round, 'complementos da Home R' + round);
    const lastWrite = successful('content', 'site').at(-1);
    assert(lastWrite.data.hero.title.endsWith('| R' + round), 'payload da Home perdeu a edição R' + round);
    assert(actionPair('save-home').buttons.length === 2, 'ações da Home duplicaram após R' + round);
  }
  assert(state.calls.some((call) => call.endpoint === 'content' && call.status === 502), 'primeiro salvamento não exerceu recuperação do 502 transitório');
  assert(successful('content', 'site').length === 3, 'devem existir exatamente três salvamentos bem-sucedidos da Home');

  document.querySelector('[data-tab="legado"]').click();
  await wait(() => !document.querySelector('#panel-legado')?.hidden && document.querySelector('#legacy-image')?.dataset.imageUpload === 'ready', 'Memória e legado');
  assert(document.querySelector('#legacy-image').value.includes('wolnei-divino-franco.jpg'), 'foto de Wolnei não está no conteúdo de Memória e legado');
  assert(document.querySelector('#legacy-image').closest('label')?.nextElementSibling?.classList.contains('image-upload'), 'upload de Memória e legado não foi integrado');

  document.querySelector('[data-tab="videos"]').click();
  await wait(() => !document.querySelector('#panel-videos')?.hidden && document.querySelector('[data-video-title-control]'), 'controles de vídeos');
  assert(Number(document.querySelector('[data-video-title-size]').value) === 24, 'tamanho editorial atual de vídeos não foi carregado');
  const videoContentBefore = successful('content', 'videos').length;
  const videoStyleBefore = successful('video-styles').length;
  const titleStyleBefore = successful('title-styles').length;
  const firstVideoTitle = document.querySelector('#videos-editor [data-role="title"]');
  assert(firstVideoTitle, 'nenhum vídeo editorial foi carregado');
  firstVideoTitle.value += ' | revisão';
  document.querySelector('#save-videos').click();
  await wait(() => successful('content', 'videos').length === videoContentBefore + 1, 'salvamento de vídeos');
  await wait(() => successful('video-styles').length === videoStyleBefore + 1 && successful('title-styles').length === titleStyleBefore + 1, 'formatação integrada dos vídeos');
  assert(successful('content', 'videos').length === videoContentBefore + 1, 'controle de tamanho duplicou a gravação do conteúdo de vídeos');

  for (const tab of [...document.querySelectorAll('.tab')]) {
    tab.click();
    const id = tab.dataset.tab;
    await wait(() => !document.querySelector('[data-panel="' + id + '"]')?.hidden, 'painel ' + id);
    assert(noHorizontalOverflow(), 'rolagem horizontal involuntária no painel ' + id + ' em ' + window.innerWidth + 'px');
  }

  document.documentElement.dataset.rebuildAdminResult = 'PASS';
  result.textContent = 'REBUILD ADMIN UI TEST: PASS';
} catch (error) {
  document.documentElement.dataset.rebuildAdminResult = 'FAIL';
  result.textContent = 'REBUILD ADMIN UI TEST: FAIL — ' + error.message;
  console.error(result.textContent);
}
</script>`;

const publicTest = String.raw`<script type="module">
const wait = async (predicate, label, timeout = 9000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { if (predicate()) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  throw new Error('Timeout: ' + label);
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const noHorizontalOverflow = () => document.documentElement.scrollWidth <= window.innerWidth + 2;
const result = document.createElement('pre'); result.id = 'rebuild-public-result'; result.hidden = true; document.body.append(result);

try {
  await wait(() => document.querySelector('#titulo-inicio')?.textContent.includes('Fazenda Matrinchã'), 'conteúdo editorial da Home');
  assert(noHorizontalOverflow(), 'rolagem horizontal involuntária na Home em ' + window.innerWidth + 'px');

  const views = ['inicio','sobre','palestras','galeria','recursos','legado'];
  for (const id of views) {
    const link = document.querySelector('[data-nav="' + id + '"]');
    assert(link, 'navegação ausente: ' + id);
    link.click();
    await wait(() => !document.querySelector('[data-view="' + id + '"]')?.hidden, 'view pública ' + id);
    assert(noHorizontalOverflow(), 'rolagem horizontal involuntária em ' + id + ' a ' + window.innerWidth + 'px');
  }

  document.querySelector('[data-nav="legado"]').click();
  await wait(() => !document.querySelector('[data-view="legado"]')?.hidden, 'legado visível');
  const legacyImage = document.querySelector('[data-view="legado"] img');
  await wait(() => legacyImage?.src.includes('wolnei-divino-franco.jpg'), 'foto editorial de Wolnei aplicada');
  await wait(() => legacyImage.complete && legacyImage.naturalWidth > 0, 'foto de Wolnei carregada');
  assert(document.querySelector('[data-view="legado"]').textContent.includes('Wolnei Divino Franco'), 'texto de Memória e legado perdeu Wolnei Divino Franco');

  document.querySelector('[data-nav="palestras"]').click();
  await wait(() => !document.querySelector('[data-view="palestras"]')?.hidden, 'palestras visíveis');
  await wait(() => document.querySelectorAll('#videos-list .video-card').length >= 2, 'vídeos editoriais atuais');
  assert(noHorizontalOverflow(), 'rolagem horizontal involuntária em Palestras');

  document.documentElement.dataset.rebuildPublicResult = 'PASS';
  result.textContent = 'REBUILD PUBLIC UI TEST: PASS';
} catch (error) {
  document.documentElement.dataset.rebuildPublicResult = 'FAIL';
  result.textContent = 'REBUILD PUBLIC UI TEST: FAIL — ' + error.message;
  console.error(result.textContent);
}
</script>`;

const adminOriginal = fs.readFileSync(adminHtmlPath, 'utf8');
const bridgeMarker = '<script src="/content-preview-bridge.js"></script>';
if (!adminOriginal.includes(bridgeMarker)) {
  console.error('REBUILD UI BROWSER TEST: content-preview-bridge não encontrado no Admin buildado.');
  process.exit(1);
}
const adminHtml = adminOriginal
  .replace(bridgeMarker, `${adminBootstrap}\n${bridgeMarker}`)
  .replace('</body>', `${adminTest}\n</body>`);
const publicOriginal = fs.readFileSync(publicHtmlPath, 'utf8');
const publicHtml = publicOriginal.replace('</body>', `${publicTest}\n</body>`);

const mime = (file) => {
  const ext = path.extname(file).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  })[ext] || 'application/octet-stream';
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  const send = (status, type, body) => { response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }); response.end(body); };
  if (url.pathname === '/admin' || url.pathname === '/admin/') return send(200, 'text/html; charset=utf-8', adminHtml);
  if (url.pathname === '/') return send(200, 'text/html; charset=utf-8', publicHtml);

  let decoded;
  try { decoded = decodeURIComponent(url.pathname); } catch { return send(400, 'text/plain; charset=utf-8', 'bad path'); }
  const candidate = path.resolve(dist, `.${decoded}`);
  const distPrefix = `${path.resolve(dist)}${path.sep}`;
  if (!candidate.startsWith(distPrefix) || !fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) return send(404, 'text/plain; charset=utf-8', 'not found');
  response.writeHead(200, { 'content-type': mime(candidate), 'cache-control': 'no-store' });
  fs.createReadStream(candidate).pipe(response);
});

const chrome = findChrome();
if (!chrome) { console.error('REBUILD UI BROWSER TEST: Chrome/Chromium não encontrado.'); process.exit(1); }
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const address = server.address();
const port = typeof address === 'object' && address ? address.port : null;
if (!port) { server.close(); console.error('REBUILD UI BROWSER TEST: porta local não determinada.'); process.exit(1); }

async function runBrowser(kind, width, height) {
  const pathname = kind === 'admin' ? '/admin/' : '/';
  const url = `http://127.0.0.1:${port}${pathname}`;
  const args = [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-background-networking',
    '--disable-default-apps', '--no-first-run', `--window-size=${width},${height}`, '--virtual-time-budget=15000', '--dump-dom', url,
  ];
  let stdout = ''; let stderr = ''; let timedOut = false;
  const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const timeout = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 30000);
  const code = await new Promise((resolve) => child.once('close', resolve));
  clearTimeout(timeout);
  if (timedOut) throw new Error(`${kind} ${width}px excedeu 30 segundos`);
  if (code !== 0) throw new Error(`${kind} ${width}px: Chrome terminou com código ${code}: ${stderr.trim()}`);

  const attribute = kind === 'admin' ? 'data-rebuild-admin-result' : 'data-rebuild-public-result';
  const resultId = kind === 'admin' ? 'rebuild-admin-result' : 'rebuild-public-result';
  if (!stdout.includes(`${attribute}="PASS"`)) {
    const match = stdout.match(new RegExp(`<pre id="${resultId}"[^>]*>([^<]*)<\\/pre>`));
    const failure = match?.[1] || stderr.trim() || 'resultado PASS não encontrado';
    throw new Error(`${kind} ${width}px: ${failure}`);
  }
}

try {
  await runBrowser('admin', 1440, 1000);
  await runBrowser('admin', 390, 844);
  await runBrowser('public', 1440, 1000);
  await runBrowser('public', 390, 844);
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log('REBUILD UI BROWSER TEST: PASS');
console.log('- Admin validado em 1440px e 390px sem rolagem horizontal involuntária nos nove painéis');
console.log('- cada área mantém exatamente um Pré-visualizar e um Salvar');
console.log('- upload simples aparece na Home e em Memória e legado');
console.log('- primeiro, segundo e terceiro salvamentos consecutivos da Home funcionam sem recarregar');
console.log('- 502 transitório do primeiro salvamento é recuperado pela fila de escrita');
console.log('- vídeos usam uma única gravação de conteúdo com título e tamanho integrados');
console.log('- site público validado em 1440px e 390px nas seis áreas principais');
console.log('- foto de Wolnei, Memória e legado e dois vídeos editoriais atuais são carregados no site');
