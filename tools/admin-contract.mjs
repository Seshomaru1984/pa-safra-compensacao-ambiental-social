import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const fail = (message) => errors.push(message);
const exists = (rel) => fs.existsSync(path.join(root, rel));
const read = (rel) => exists(rel) ? fs.readFileSync(path.join(root, rel), 'utf8') : '';

for (const rel of [
  'public/admin/index.html',
  'public/admin/admin.css',
  'public/admin/admin.js',
  'functions/api/admin/login.js',
  'functions/api/admin/logout.js',
  'functions/api/admin/status.js',
  'functions/api/admin/content.js',
  'tools/admin-credentials.mjs',
  'tools/admin-auth-test.mjs',
  'tools/PA-SAFRA-GERAR-CREDENCIAIS-ADMIN.ps1',
  'docs/ADR-0002-ADMIN-NATIVO.md',
]) {
  if (!exists(rel)) fail(`Admin nativo: arquivo ausente: ${rel}`);
}

if (exists('.pages.yml')) fail('Pages CMS não deve permanecer como dependência do projeto.');
if (exists('tools/cms-contract.mjs')) fail('Contrato legado do Pages CMS ainda presente.');

const html = read('public/admin/index.html');
for (const token of ['Administração de conteúdo', 'Entrar no painel', 'Página inicial', 'Palestras e vídeos', '/admin/admin.js']) {
  if (!html.includes(token)) fail(`Admin nativo: interface ausente/incompleta: ${token}`);
}

const adminJs = read('public/admin/admin.js');
for (const token of [
  '/api/admin/login',
  '/api/admin/logout',
  '/api/admin/status',
  '/api/admin/content',
  '/content/site.json',
  '/content/videos.json',
]) {
  if (!adminJs.includes(token)) fail(`Admin nativo: integração ausente: ${token}`);
}

const loginJs = read('functions/api/admin/login.js');
const statusJs = read('functions/api/admin/status.js');
const contentJs = read('functions/api/admin/content.js');
const authText = `${loginJs}\n${statusJs}\n${contentJs}`;

for (const token of [
  'PA_SAFRA_ADMIN_ENABLED',
  'PA_SAFRA_ADMIN_USER',
  'PA_SAFRA_ADMIN_PASSWORD_HASH',
  'PA_SAFRA_SESSION_SECRET',
  'PA_SAFRA_AUTH_KV',
  'GITHUB_CONTENT_TOKEN',
  'pa_safra_admin_session',
  'PBKDF2',
  'HMAC',
]) {
  if (!authText.includes(token)) fail(`Admin nativo: contrato de autenticação ausente: ${token}`);
}

for (const forbidden of ['PA_SAFRA_ADMIN_EMAILS', 'Cf-Access-Authenticated-User-Email', 'Cf-Access-Jwt-Assertion']) {
  if (authText.includes(forbidden)) fail(`Admin nativo: dependência externa de autenticação ainda presente: ${forbidden}`);
}

for (const token of [
  'RATE_MAX_FAILURES = 5',
  'RATE_WINDOW_SECONDS = 15 * 60',
  'RATE_LOCK_SECONDS = 15 * 60',
  "request.headers.get('CF-Connecting-IP')",
  "'retry-after'",
  '429',
]) {
  if (!loginJs.includes(token)) fail(`Admin nativo: proteção contra força bruta incompleta: ${token}`);
}
if (!statusJs.includes('rate_limit_configured')) fail('Admin nativo: status não expõe readiness do rate limiter.');

for (const token of [
  "Seshomaru1984/pa-safra-compensacao-ambiental-social",
  "site: 'public/content/site.json'",
  "videos: 'public/content/videos.json'",
  'https://api.github.com/repos/',
  'Sec-Fetch-Site',
]) {
  if (!contentJs.includes(token)) fail(`Admin nativo: contrato de escrita incompleto: ${token}`);
}

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
    if (publication.checks?.admin_nativo_validado !== false) fail('admin_nativo_validado deve iniciar como false.');
  } catch (error) {
    fail(`Admin nativo: publicacao.json inválido: ${error.message}`);
  }
}

if (errors.length) {
  console.error('ADMIN NATIVO CONTRACT: FALHOU');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('ADMIN NATIVO CONTRACT: OK');
console.log('- Pages CMS removido como dependência');
console.log('- /admin com login próprio presente');
console.log('- sessão HttpOnly assinada por HMAC prevista');
console.log('- senha validada por hash PBKDF2, sem senha em código/GitHub');
console.log('- login bloqueia após 5 falhas/15 min via Workers KV');
console.log('- geradores de credenciais Node e PowerShell presentes');
console.log('- escrita depende de sessão válida + secret GitHub');
console.log('- escopo inicial limitado a site e vídeos');
console.log('- gate admin_nativo_validado permanece pendente');
