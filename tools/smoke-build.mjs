import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const errors = [];

const required = [
  'index.html',
  '_headers',
  'content/site.json',
  'content/noticias.json',
  'content/videos.json',
  'content/paginas.json',
  'content/destaques.json',
  'content/galeria.json',
  'assets/icons/pa-safra.svg',
  'assets/img/rio-nova-xavantina.jpg',
  'assets/img/registro-historico.jpg',
  'assets/img/atrativos-nova-xavantina.jpg',
  'assets/img/solicitante-rio-cristalino.jpg',
  'assets/img/solicitante-cerrado.jpg',
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
    if (fs.statSync(full).isFile() && fs.statSync(full).size === 0) {
      errors.push(`Arquivo vazio no build: ${rel}`);
    }
  }
}

const jsonFiles = [
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
  if (!html.includes('Projeto de Compensação Ambiental e Social - PA Safra')) {
    errors.push('Identidade do PA Safra ausente no index.html gerado.');
  }
  if (!/(?:src|href)="[^"]*\/assets\//.test(html)) {
    errors.push('index.html gerado nao referencia assets compilados pelo Vite.');
  }
}

const forbiddenTokens = [
  'contato@exemplo.com',
  "url('https://unsplash.com')",
  'url("https://unsplash.com")',
];

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
      if (text.includes(token)) {
        errors.push(`Placeholder proibido encontrado em ${path.relative(dist, full)}: ${token}`);
      }
    }
  }
}

scanTextTree(dist);

const headersPath = path.join(dist, '_headers');
if (fs.existsSync(headersPath)) {
  const headers = fs.readFileSync(headersPath, 'utf8');
  for (const token of [
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'Permissions-Policy:',
    '/content/*',
    'Cache-Control: public, max-age=0, must-revalidate',
    '/assets/*',
  ]) {
    if (!headers.includes(token)) errors.push(`Regra obrigatoria ausente em _headers: ${token}`);
  }
}

const sitePath = path.join(dist, 'content/site.json');
if (fs.existsSync(sitePath)) {
  try {
    const site = JSON.parse(fs.readFileSync(sitePath, 'utf8'));
    const heroImage = site?.hero?.image;
    if (typeof heroImage === 'string' && heroImage.trim()) {
      const normalized = heroImage.replace(/^\/+/, '');
      if (!fs.existsSync(path.join(dist, normalized))) {
        errors.push(`Imagem principal configurada nao existe no build: ${heroImage}`);
      }
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
