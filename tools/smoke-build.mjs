import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const errors = [];

const requiredImages = [
  'assets/img/rio-nova-xavantina.jpg',
  'assets/img/registro-historico.jpg',
  'assets/img/atrativos-nova-xavantina.jpg',
  'assets/img/solicitante-rio-cristalino.webp',
  'assets/img/solicitante-cerrado.webp',
];

const required = [
  'index.html',
  '_headers',
  'robots.txt',
  'content/publicacao.json',
  'content/site.json',
  'content/noticias.json',
  'content/videos.json',
  'content/paginas.json',
  'content/destaques.json',
  'content/galeria.json',
  'assets/icons/pa-safra.svg',
  ...requiredImages,
];

if (!fs.existsSync(dist)) {
  errors.push('Diretorio dist ausente. Execute npm run build antes do smoke test.');
} else {
  for (const rel of required) {
    const full = path.join(dist, rel);
    if (!fs.existsSync(full)) {
      errors.push(`Saida obrigatoria ausente no build: ${rel}`);
      continue;
    }
    if (fs.statSync(full).isFile() && fs.statSync(full).size === 0) errors.push(`Arquivo vazio no build: ${rel}`);
  }
}

function validateImage(rel) {
  const full = path.join(dist, rel);
  if (!fs.existsSync(full)) return;
  const data = fs.readFileSync(full);
  if (data.length < 32) {
    errors.push(`Imagem muito pequena ou corrompida no build: ${rel}`);
    return;
  }

  if (/\.webp$/i.test(rel)) {
    if (data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WEBP') {
      errors.push(`Assinatura WebP invalida no build: ${rel}`);
      return;
    }
    const declaredLength = data.readUInt32LE(4) + 8;
    if (declaredLength !== data.length) errors.push(`WebP truncado/inconsistente no build: ${rel}`);
  } else if (/\.jpe?g$/i.test(rel)) {
    if (!(data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)) errors.push(`Assinatura JPEG invalida no build: ${rel}`);
    if (!(data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9)) errors.push(`JPEG truncado/inconsistente no build: ${rel}`);
  }
}

requiredImages.forEach(validateImage);

const jsonFiles = [
  'content/publicacao.json',
  'content/site.json',
  'content/noticias.json',
  'content/videos.json',
  'content/paginas.json',
  'content/destaques.json',
  'content/galeria.json',
];

for (const rel of jsonFiles) {
  const full = path.join(dist, rel);
  if (!fs.existsSync(full)) continue;
  try {
    const text = fs.readFileSync(full, 'utf8');
    if (text.includes('\uFFFD')) errors.push(`Caractere de substituicao UTF-8 em ${rel}`);
    JSON.parse(text);
  } catch (error) {
    errors.push(`JSON invalido no build em ${rel}: ${error.message}`);
  }
}

const indexPath = path.join(dist, 'index.html');
if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, 'utf8');
  if (html.includes('\uFFFD')) errors.push('index.html contem caractere de substituicao UTF-8.');
  if (!html.includes('Projeto de Compensação Ambiental e Social - PA Safra')) errors.push('Identidade do PA Safra ausente no index.html gerado.');
  if (!/(?:src|href)="[^"]*\/assets\//.test(html)) errors.push('index.html gerado nao referencia assets compilados pelo Vite.');
}

const forbiddenTokens = ['contato@exemplo.com', "url('https://unsplash.com')", 'url("https://unsplash.com")'];

function scanTextTree(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanTextTree(full);
      continue;
    }
    if (!/\.(?:html|css|js|json|txt|svg)$/i.test(entry.name) && entry.name !== '_headers') continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const token of forbiddenTokens) {
      if (text.includes(token)) errors.push(`Placeholder proibido encontrado em ${path.relative(dist, full)}: ${token}`);
    }
  }
}

scanTextTree(dist);

const headersPath = path.join(dist, '_headers');
if (fs.existsSync(headersPath)) {
  const headers = fs.readFileSync(headersPath, 'utf8');
  for (const token of [
    'Content-Security-Policy:',
    "default-src 'self'",
    "frame-src https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'Permissions-Policy:',
    'X-Frame-Options: DENY',
    '/content/*',
    'Cache-Control: public, max-age=0, must-revalidate',
    '/assets/*',
  ]) {
    if (!headers.includes(token)) errors.push(`Regra obrigatoria ausente em _headers: ${token}`);
  }
}

let publication = null;
const publicationPath = path.join(dist, 'content/publicacao.json');
if (fs.existsSync(publicationPath)) {
  try {
    publication = JSON.parse(fs.readFileSync(publicationPath, 'utf8'));
    if (publication.production_branch !== 'main') errors.push('content/publicacao.json no build deve manter production_branch como main.');
    if (!publication.checks || typeof publication.checks !== 'object') errors.push('content/publicacao.json no build deve conter o objeto checks.');
  } catch {
    // JSON ja e validado acima.
  }
}

const robotsPath = path.join(dist, 'robots.txt');
if (fs.existsSync(robotsPath) && publication) {
  const robots = fs.readFileSync(robotsPath, 'utf8');
  const blocked = /User-agent:\s*\*[^]*Disallow:\s*\/\s*$/im.test(robots);
  const approved = publication.status === 'aprovado' && Object.values(publication.checks || {}).every(Boolean);
  if (!approved && !blocked) errors.push('robots.txt deve bloquear indexacao enquanto a publicacao estiver pendente.');
  if (approved && blocked) errors.push('robots.txt nao pode continuar bloqueando indexacao apos aprovacao integral.');
}

const sitePath = path.join(dist, 'content/site.json');
if (fs.existsSync(sitePath)) {
  try {
    const site = JSON.parse(fs.readFileSync(sitePath, 'utf8'));
    const heroImage = site?.hero?.image;
    if (typeof heroImage === 'string' && heroImage.trim()) {
      const normalized = heroImage.replace(/^\/+/, '');
      if (!fs.existsSync(path.join(dist, normalized))) errors.push(`Imagem principal configurada nao existe no build: ${heroImage}`);
      if (heroImage === '/assets/img/solicitante-rio-cristalino.webp') validateImage(normalized);
    }
  } catch {
    // JSON principal ja e validado acima.
  }
}

if (errors.length) {
  console.error('SMOKE BUILD: FALHOU');
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('SMOKE BUILD: OK');
