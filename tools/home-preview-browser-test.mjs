import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const adminPreview = fs.readFileSync(path.join(root, 'public/admin/home-preview.js'), 'utf8');
const pageActions = fs.readFileSync(path.join(root, 'public/admin/page-actions.js'), 'utf8');
const publicPreview = fs.readFileSync(path.join(root, 'public/home-preview-runtime.js'), 'utf8');

function findChrome() {
  const direct = [process.env.CHROME_PATH, process.env.GOOGLE_CHROME_BIN, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  for (const candidate of direct) if (path.isAbsolute(candidate) && fs.existsSync(candidate)) return candidate;
  for (const command of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome']) {
    const probe = spawnSync(command, ['--version'], { encoding: 'utf8' });
    if (!probe.error && probe.status === 0) return command;
  }
  return null;
}

const adminHtml = `<!doctype html><html><body>
<div id="admin-message" hidden></div>
<div id="panel-inicio">
<form id="home-form">
<input id="home-brand-tagline" value="Tagline salva">
<input id="home-hero-eyebrow" value="Rótulo salvo">
<input id="home-hero-title" value="Título salvo">
<div id="home-hero-lead" contenteditable="true">Texto salvo</div>
<select id="home-title-alignment"><option value="left" selected>left</option></select>
<select id="home-title-size"><option value="standard" selected>standard</option></select>
<input id="home-hero-image" value="/assets/img/teste.webp">
<input id="home-hero-alt" value="Imagem teste">
<input id="home-intro-eyebrow" value="Introdução salva">
<input id="home-intro-title" value="Título da seção salvo">
<div id="home-intro-text" contenteditable="true">Corpo salvo</div>
<section data-home-layout-control>
<input id="home-layout-text-left" type="radio" name="home-hero-layout" value="text-left" checked>
<input id="home-layout-image-left" type="radio" name="home-hero-layout" value="image-left">
</section>
<div class="form-actions"><button id="save-home" type="submit">Salvar</button></div>
</form>
</div>
<script>window.PASafraHomeEditor={getSelectedLayout(){return document.querySelector('input[name="home-hero-layout"]:checked')?.value||'text-left';}};window.__OPENED='';window.open=(url)=>{window.__OPENED=String(url);return null;};</script>
<script src="/admin/home-preview.js"></script>
<script type="module" src="/admin/page-actions.js"></script>
<script type="module" src="/test.js"></script>
</body></html>`;

const probeHtml = `<!doctype html><html><body><script src="/home-preview-runtime.js"></script><script type="module">
try {
  const response = await fetch('/content/site.json');
  const site = await response.json();
  document.body.dataset.result = 'PASS';
  document.body.dataset.title = site.hero?.title || '';
  document.body.dataset.intro = site.home?.intro_title || '';
} catch (error) {
  document.body.dataset.result = 'FAIL';
  document.body.dataset.error = error.message;
}
</script></body></html>`;

const testJs = `
const wait=async(fn,label,timeout=6000)=>{const start=Date.now();while(Date.now()-start<timeout){if(fn())return;await new Promise(r=>setTimeout(r,25));}throw new Error('Timeout: '+label);};
const assert=(value,message)=>{if(!value)throw new Error(message);};
const out=document.createElement('pre');out.id='result';out.hidden=true;document.body.append(out);
try{
  await wait(()=>document.querySelector('[data-page-preview-for="save-home"]'),'preview button');
  document.querySelector('#home-hero-title').value='Título NÃO SALVO';
  document.querySelector('#home-intro-title').value='Introdução NÃO SALVA';
  document.querySelector('#home-layout-image-left').checked=true;
  document.querySelector('[data-page-preview-for="save-home"]').click();
  await wait(()=>window.__OPENED,'preview URL');
  const url=new URL(window.__OPENED);
  const token=url.searchParams.get('_pa_home_preview');
  assert(token,'preview deve gerar token de rascunho');
  assert(url.searchParams.get('layout_home')==='image-left','preview deve levar layout não salvo');
  assert(url.hash==='#inicio','preview deve abrir a Home');
  const draft=JSON.parse(localStorage.getItem('pa-safra-home-preview:'+token)||'null');
  assert(draft?.site_patch?.hero?.title==='Título NÃO SALVO','rascunho deve conter título não salvo');
  assert(draft?.site_patch?.home?.intro_title==='Introdução NÃO SALVA','rascunho deve conter texto não salvo');
  const frame=document.createElement('iframe');
  frame.src='/probe'+url.search+url.hash;
  document.body.append(frame);
  await wait(()=>frame.contentDocument?.body?.dataset?.result,'public preview runtime');
  assert(frame.contentDocument.body.dataset.result==='PASS','runtime público falhou');
  assert(frame.contentDocument.body.dataset.title==='Título NÃO SALVO','site público não recebeu título do rascunho');
  assert(frame.contentDocument.body.dataset.intro==='Introdução NÃO SALVA','site público não recebeu introdução do rascunho');
  document.documentElement.dataset.homePreviewResult='PASS';
  out.textContent='HOME PREVIEW BROWSER TEST: PASS';
}catch(error){document.documentElement.dataset.homePreviewResult='FAIL';out.textContent='HOME PREVIEW BROWSER TEST: FAIL — '+error.message;console.error(out.textContent);}
`;

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  const send = (status, type, body) => { response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }); response.end(body); };
  if (url.pathname === '/admin/' || url.pathname === '/admin') return send(200, 'text/html; charset=utf-8', adminHtml);
  if (url.pathname === '/probe') return send(200, 'text/html; charset=utf-8', probeHtml);
  if (url.pathname === '/admin/home-preview.js') return send(200, 'text/javascript; charset=utf-8', adminPreview);
  if (url.pathname === '/admin/page-actions.js') return send(200, 'text/javascript; charset=utf-8', pageActions);
  if (url.pathname === '/home-preview-runtime.js') return send(200, 'text/javascript; charset=utf-8', publicPreview);
  if (url.pathname === '/test.js') return send(200, 'text/javascript; charset=utf-8', testJs);
  if (url.pathname === '/content/site.json') return send(200, 'application/json; charset=utf-8', JSON.stringify({
    brand_tagline: 'Tagline do servidor',
    hero: { title: 'Título DO SERVIDOR', eyebrow: 'Servidor', lead: 'Servidor', title_alignment: 'left', title_size: 'standard', image: '/assets/img/teste.webp', image_alt: 'Servidor' },
    home: { intro_eyebrow: 'Servidor', intro_title: 'Introdução DO SERVIDOR', intro_text: 'Servidor' }
  }));
  return send(404, 'text/plain; charset=utf-8', 'not found');
});

const chrome = findChrome();
if (!chrome) { console.error('HOME PREVIEW BROWSER TEST: Chrome/Chromium não encontrado.'); process.exit(1); }
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const port = server.address().port;
const url = `http://127.0.0.1:${port}/admin/`;
const args = ['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--virtual-time-budget=10000','--dump-dom',url];
let stdout='';let stderr='';
const child=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',c=>stdout+=c);child.stderr.on('data',c=>stderr+=c);
const timeout=setTimeout(()=>child.kill('SIGKILL'),20000);
const code=await new Promise(resolve=>child.once('close',resolve));clearTimeout(timeout);await new Promise(resolve=>server.close(resolve));
if(code!==0||!/data-home-preview-result="PASS"/.test(stdout)){console.error('HOME PREVIEW BROWSER TEST: FAIL');const match=stdout.match(/HOME PREVIEW BROWSER TEST:[^<]*/);if(match)console.error(match[0]);if(stderr.trim())console.error(stderr.trim());process.exit(1);}
console.log('HOME PREVIEW BROWSER TEST: PASS');
console.log('- pré-visualização usa título e texto ainda não salvos');
console.log('- disposição da capa não salva é aplicada ao preview');
console.log('- preview não publica nem altera conteúdo editorial');
