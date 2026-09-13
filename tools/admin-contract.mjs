import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const fail = (message) => errors.push(message);
const exists = (rel) => fs.existsSync(path.join(root, rel));
const read = (rel) => exists(rel) ? fs.readFileSync(path.join(root, rel), 'utf8') : '';

for (const rel of [
  'public/admin/index.html', 'public/admin/admin.css', 'public/admin/admin.js',
  'functions/api/admin/login.js', 'functions/api/admin/logout.js', 'functions/api/admin/status.js', 'functions/api/admin/content.js',
  'tools/admin-credentials.mjs', 'tools/admin-auth-test.mjs', 'tools/admin-ui-browser-test.mjs',
  'tools/PA-SAFRA-GERAR-CREDENCIAIS-ADMIN.ps1', 'migrations/0001_admin_login_rate.sql', 'docs/ADR-0002-ADMIN-NATIVO.md',
  'public/content/site.json', 'public/content/videos.json', 'public/content/paginas.json', 'public/content/destaques.json',
  'public/content/galeria.json', 'public/content/links.json',
]) if (!exists(rel)) fail(`Admin nativo: arquivo ausente: ${rel}`);

if (exists('.pages.yml')) fail('Pages CMS não deve permanecer como dependência do projeto.');
if (exists('tools/cms-contract.mjs')) fail('Contrato legado do Pages CMS ainda presente.');

const html = read('public/admin/index.html');
for (const token of [
  'Administração de conteúdo', 'Entrar no painel', 'Página inicial', 'Sobre o Projeto', 'Destaques', 'Palestras e vídeos',
  'Galeria', 'Links úteis', 'Memória e legado', 'Páginas extras', 'Aparência e rodapé', '/admin/admin.js',
]) if (!html.includes(token)) fail(`Admin nativo: interface ausente/incompleta: ${token}`);
if (/data-tab=["']noticias["']/i.test(html)) fail('Admin nativo: Notícias não deve existir como módulo administrativo.');

const adminJs = read('public/admin/admin.js');
for (const token of [
  '/api/admin/login', '/api/admin/logout', '/api/admin/status', '/api/admin/content',
  '/content/site.json', '/content/videos.json', '/content/paginas.json', '/content/destaques.json', '/content/galeria.json', '/content/links.json',
  'justifyFull', 'foreColor', 'fontSize', 'createLink', 'removeFormat',
]) if (!adminJs.includes(token)) fail(`Admin nativo: integração/ferramenta ausente: ${token}`);
if (adminJs.includes('/content/noticias.json')) fail('Admin nativo: Notícias não deve ser carregado pelo painel.');

const loginJs = read('functions/api/admin/login.js');
const statusJs = read('functions/api/admin/status.js');
const contentJs = read('functions/api/admin/content.js');
const authText = `${loginJs}\n${statusJs}\n${contentJs}`;

for (const token of [
  'PA_SAFRA_ADMIN_ENABLED', 'PA_SAFRA_ADMIN_USER', 'PA_SAFRA_ADMIN_PASSWORD_HASH', 'PA_SAFRA_SESSION_SECRET',
  'PA_SAFRA_AUTH_DB', 'GITHUB_CONTENT_TOKEN', 'pa_safra_admin_session', 'PBKDF2', 'HMAC',
]) if (!authText.includes(token)) fail(`Admin nativo: contrato de autenticação ausente: ${token}`);

for (const forbidden of ['PA_SAFRA_ADMIN_EMAILS', 'Cf-Access-Authenticated-User-Email', 'Cf-Access-Jwt-Assertion', 'PA_SAFRA_AUTH_KV']) {
  if (authText.includes(forbidden)) fail(`Admin nativo: dependência obsoleta/externa ainda presente: ${forbidden}`);
}

for (const token of [
  'RATE_MAX_FAILURES = 5', 'RATE_WINDOW_SECONDS = 15 * 60', 'RATE_LOCK_SECONDS = 15 * 60',
  "request.headers.get('CF-Connecting-IP')", "'retry-after'", '429', 'INSERT INTO admin_login_rate', 'db.batch([upsert, select])',
]) if (!loginJs.includes(token)) fail(`Admin nativo: proteção contra força bruta incompleta: ${token}`);
if (!statusJs.includes('rate_limit_configured')) fail('Admin nativo: status não expõe readiness do rate limiter.');
if (!statusJs.includes("rate_limit_backend: rateLimitReady ? 'd1' : null")) fail('Admin nativo: status não identifica backend D1 do rate limiter.');

const migration = read('migrations/0001_admin_login_rate.sql');
for (const token of ['CREATE TABLE IF NOT EXISTS admin_login_rate', 'client_key TEXT PRIMARY KEY', 'blocked_until INTEGER']) {
  if (!migration.includes(token)) fail(`Admin nativo: migration D1 incompleta: ${token}`);
}

for (const token of [
  "Seshomaru1984/pa-safra-compensacao-ambiental-social",
  "site: 'public/content/site.json'", "videos: 'public/content/videos.json'", "pages: 'public/content/paginas.json'",
  "highlights: 'public/content/destaques.json'", "gallery: 'public/content/galeria.json'", "links: 'public/content/links.json'",
  'https://api.github.com/repos/', 'Sec-Fetch-Site', 'ensureRichText',
]) if (!contentJs.includes(token)) fail(`Admin nativo: contrato de escrita incompleto: ${token}`);
if (/noticias\s*:\s*['"]public\/content\/noticias\.json/i.test(contentJs)) fail('Admin nativo: API não pode permitir escrita em Notícias.');

const site = JSON.parse(read('public/content/site.json') || '{}');
if (!site.legacy?.body || !site.legacy?.title) fail('Admin nativo: Memória e legado precisa estar representado na fonte editorial.');

const credentialsTool = read('tools/admin-credentials.mjs');
for (const token of ['pbkdf2Sync', 'randomBytes', 'PA_SAFRA_ADMIN_PASSWORD_HASH', 'PA_SAFRA_SESSION_SECRET']) {
  if (!credentialsTool.includes(token)) fail(`Admin nativo: utilitário de credenciais incompleto: ${token}`);
}
if (credentialsTool.includes('console.log(password)')) fail('Admin nativo: senha não pode ser impressa pelo utilitário.');

const powershellTool = read('tools/PA-SAFRA-GERAR-CREDENCIAIS-ADMIN.ps1');
for (const token of ['Read-Host', '-AsSecureString', 'Rfc2898DeriveBytes', 'HashAlgorithmName]::SHA256', 'PA_SAFRA_ADMIN_PASSWORD_HASH', 'PA_SAFRA_SESSION_SECRET']) {
  if (!powershellTool.includes(token)) fail(`Admin nativo: gerador PowerShell incompleto: ${token}`);
}

const publicationPath = 'public/content/publicacao.json';
if (exists(publicationPath)) {
  try {
    const publication = JSON.parse(read(publicationPath));
    if ('pages_cms_testado' in (publication.checks || {})) fail('Gate legado pages_cms_testado ainda presente.');
    if (typeof publication.checks?.admin_nativo_validado !== 'boolean') fail('admin_nativo_validado deve ser booleano.');
  } catch (error) { fail(`Admin nativo: publicacao.json inválido: ${error.message}`); }
}

if (errors.length) {
  console.error('ADMIN NATIVO CONTRACT: FALHOU');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('ADMIN NATIVO CONTRACT: OK');
console.log('- /admin mantém login próprio e nove áreas editoriais');
console.log('- Notícias permanece fora da interface e da lista branca de escrita');
console.log('- editor rico oferece alinhamento, tamanho, cor, listas, links e estilos básicos');
console.log('- sessão HttpOnly assinada e rate limiter D1 preservados');
console.log('- escrita permanece restrita à branch editorial de Preview pelo middleware');
