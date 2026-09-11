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
  'functions/api/admin/status.js',
  'functions/api/admin/content.js',
  'docs/ADR-0002-ADMIN-NATIVO.md',
]) {
  if (!exists(rel)) fail(`Admin nativo: arquivo ausente: ${rel}`);
}

if (exists('.pages.yml')) fail('Pages CMS não deve permanecer como dependência do projeto.');
if (exists('tools/cms-contract.mjs')) fail('Contrato legado do Pages CMS ainda presente.');

const html = read('public/admin/index.html');
for (const token of ['Administração de conteúdo', 'Página inicial', 'Palestras e vídeos', '/admin/admin.js']) {
  if (!html.includes(token)) fail(`Admin nativo: interface ausente/incompleta: ${token}`);
}

const adminJs = read('public/admin/admin.js');
for (const token of ['/api/admin/status', '/api/admin/content', '/content/site.json', '/content/videos.json']) {
  if (!adminJs.includes(token)) fail(`Admin nativo: integração ausente: ${token}`);
}

const statusJs = read('functions/api/admin/status.js');
const contentJs = read('functions/api/admin/content.js');
for (const token of ['PA_SAFRA_ADMIN_ENABLED', 'PA_SAFRA_ADMIN_EMAILS', 'GITHUB_CONTENT_TOKEN']) {
  if (!`${statusJs}\n${contentJs}`.includes(token)) fail(`Admin nativo: variável de segurança ausente: ${token}`);
}
for (const token of [
  "Seshomaru1984/pa-safra-compensacao-ambiental-social",
  "site: 'public/content/site.json'",
  "videos: 'public/content/videos.json'",
  'Cf-Access-Authenticated-User-Email',
  'Cf-Access-Jwt-Assertion',
  'https://api.github.com/repos/',
]) {
  if (!contentJs.includes(token)) fail(`Admin nativo: contrato de escrita incompleto: ${token}`);
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
console.log('- /admin presente');
console.log('- API de status e escrita controlada presente');
console.log('- escrita depende de Access + allowlist + secret GitHub');
console.log('- escopo inicial limitado a site e vídeos');
console.log('- gate admin_nativo_validado permanece pendente');
