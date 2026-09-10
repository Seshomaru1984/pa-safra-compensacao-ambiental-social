import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'index.html',
  'styles.css',
  'app.js',
  '.pages.yml',
  'public/_headers',
  'tools/prepublish.mjs',
  'tools/smoke-build.mjs',
  'public/content/publicacao.json',
  'public/content/site.json',
  'public/content/noticias.json',
  'public/content/videos.json',
  'public/content/paginas.json',
  'public/content/destaques.json',
  'public/content/galeria.json',
  'public/assets/icons/pa-safra.svg',
  'public/assets/img/rio-nova-xavantina.jpg',
  'public/assets/img/registro-historico.jpg',
  'public/assets/img/atrativos-nova-xavantina.jpg',
  'public/assets/img/solicitante-rio-cristalino.jpg',
  'public/assets/img/solicitante-cerrado.jpg',
];

const contentJson = [
  'public/content/publicacao.json',
  'public/content/site.json',
  'public/content/noticias.json',
  'public/content/videos.json',
  'public/content/paginas.json',
  'public/content/destaques.json',
  'public/content/galeria.json',
];

const errors = [];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) errors.push(`Arquivo ausente: ${rel}`);
}

for (const rel of contentJson) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  try {
    JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (error) {
    errors.push(`JSON invalido em ${rel}: ${error.message}`);
  }
}

const publicationPath = path.join(root, 'public/content/publicacao.json');
if (fs.existsSync(publicationPath)) {
  try {
    const publication = JSON.parse(fs.readFileSync(publicationPath, 'utf8'));
    if (publication.production_branch !== 'main') {
      errors.push('publicacao.json deve manter production_branch como main.');
    }
    if (!publication.checks || typeof publication.checks !== 'object') {
      errors.push('publicacao.json deve conter o objeto checks.');
    } else {
      for (const [key, value] of Object.entries(publication.checks)) {
        if (typeof value !== 'boolean') errors.push(`Validacao de publicacao deve ser booleana: ${key}`);
      }
    }
  } catch {
    // Erro de JSON ja registrado acima.
  }
}

const htmlPath = path.join(root, 'index.html');
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  for (const token of [
    'Projeto de Compensação Ambiental e Social - PA Safra',
    'Sobre este site',
    'Memória e legado',
    'Notícias',
    'Galeria',
    'Links Úteis',
    'Vila do Banco Safra',
    'https://www.sema.mt.gov.br/',
    'https://mpmt.mp.br/',
    'https://www.gov.br/ibama/pt-br',
    'id="cms-pages-root"',
    'id="noticias-list"',
    'id="videos-list"',
    'id="destaques-list"',
    'id="galeria-list"',
    '<script type="module" src="app.js"></script>',
  ]) {
    if (!html.includes(token)) errors.push(`Conteudo obrigatorio ausente: ${token}`);
  }
}

const appPath = path.join(root, 'app.js');
if (fs.existsSync(appPath)) {
  const app = fs.readFileSync(appPath, 'utf8');
  for (const token of ['/content/site.json', '/content/noticias.json', '/content/videos.json', '/content/paginas.json', '/content/destaques.json', '/content/galeria.json']) {
    if (!app.includes(token)) errors.push(`Integracao CMS ausente em app.js: ${token}`);
  }
}

const headersPath = path.join(root, 'public/_headers');
if (fs.existsSync(headersPath)) {
  const headers = fs.readFileSync(headersPath, 'utf8');
  for (const token of [
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'Permissions-Policy:',
    '/content/*',
    '/assets/*',
  ]) {
    if (!headers.includes(token)) errors.push(`Regra obrigatoria ausente em public/_headers: ${token}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('RESULTADO: OK');
