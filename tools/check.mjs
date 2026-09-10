import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredImages = [
  'public/assets/img/rio-nova-xavantina.jpg',
  'public/assets/img/registro-historico.jpg',
  'public/assets/img/atrativos-nova-xavantina.jpg',
  'public/assets/img/solicitante-rio-cristalino.webp',
  'public/assets/img/solicitante-cerrado.webp',
];

const sourceParts = [
  'assets-source/requester/rio/part01.b64',
  'assets-source/requester/rio/part02.b64',
  'assets-source/requester/rio/part03.b64',
  'assets-source/requester/rio/part04.b64',
  'assets-source/requester/cerrado/part01.b64',
  'assets-source/requester/cerrado/part02.b64',
  'assets-source/requester/cerrado/part03.b64',
];

const required = [
  'index.html',
  'styles.css',
  'app.js',
  '.pages.yml',
  'public/_headers',
  'tools/prepublish.mjs',
  'tools/smoke-build.mjs',
  'tools/prepare-requester-images.mjs',
  'public/content/publicacao.json',
  'public/content/site.json',
  'public/content/noticias.json',
  'public/content/videos.json',
  'public/content/paginas.json',
  'public/content/destaques.json',
  'public/content/galeria.json',
  'public/assets/icons/pa-safra.svg',
  ...requiredImages,
  ...sourceParts,
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

function validateImage(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return;
  const data = fs.readFileSync(full);
  if (data.length < 32) {
    errors.push(`Imagem muito pequena ou corrompida: ${rel}`);
    return;
  }

  if (/\.webp$/i.test(rel)) {
    if (data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WEBP') {
      errors.push(`Assinatura WebP invalida: ${rel}`);
      return;
    }
    const declaredLength = data.readUInt32LE(4) + 8;
    if (declaredLength !== data.length) errors.push(`WebP truncado/inconsistente: ${rel}`);
  } else if (/\.jpe?g$/i.test(rel)) {
    if (!(data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)) {
      errors.push(`Assinatura JPEG invalida: ${rel}`);
    }
    if (!(data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9)) {
      errors.push(`JPEG truncado/inconsistente: ${rel}`);
    }
  }
}

requiredImages.forEach(validateImage);

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
    if (publication.production_branch !== 'main') errors.push('publicacao.json deve manter production_branch como main.');
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

const sitePath = path.join(root, 'public/content/site.json');
if (fs.existsSync(sitePath)) {
  try {
    const site = JSON.parse(fs.readFileSync(sitePath, 'utf8'));
    if (site?.hero?.image !== '/assets/img/solicitante-rio-cristalino.webp') {
      errors.push('Imagem principal deve apontar para o WebP reconstruido e validado.');
    }
  } catch {
    // Erro de JSON ja registrado acima.
  }
}

const galleryPath = path.join(root, 'public/content/galeria.json');
if (fs.existsSync(galleryPath)) {
  try {
    const gallery = JSON.parse(fs.readFileSync(galleryPath, 'utf8'));
    for (const image of ['/assets/img/solicitante-rio-cristalino.webp', '/assets/img/solicitante-cerrado.webp']) {
      if (!gallery.some((item) => item?.image === image)) errors.push(`Galeria nao referencia a imagem validada: ${image}`);
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
  for (const token of ['X-Content-Type-Options: nosniff', 'Referrer-Policy: strict-origin-when-cross-origin', 'Permissions-Policy:', '/content/*', '/assets/*']) {
    if (!headers.includes(token)) errors.push(`Regra obrigatoria ausente em public/_headers: ${token}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('RESULTADO: OK');
