import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`TITLE STYLE BUILD CHECK: FAIL — ${message}`); process.exit(1); };

const publicHtml = read('dist/index.html');
const adminHtml = read('dist/admin/index.html');
const site = JSON.parse(read('public/content/site.json'));
const hero = site?.hero || {};

if (!publicHtml.includes('<script type="module" src="/title-style-assist.js"></script>')) fail('runtime público de títulos não foi injetado');
if (!adminHtml.includes('<script type="module" src="/admin/title-style-assist.js"></script>')) fail('runtime administrativo de títulos não foi injetado');
if (!publicHtml.includes('<link rel="stylesheet" href="/first-paint-route.css" />')) fail('CSS de rota inicial não foi injetado');
if (!publicHtml.includes('<script src="/first-paint-route.js"></script>')) fail('script de rota inicial não foi injetado');
if (publicHtml.indexOf('/first-paint-route.css') > publicHtml.indexOf('</head>')) fail('CSS de rota inicial precisa estar no head');
if (publicHtml.indexOf('/first-paint-route.js') > publicHtml.indexOf('</head>')) fail('script de rota inicial precisa estar no head');

for (const file of [
  'dist/title-style-assist.js',
  'dist/admin/title-style-assist.js',
  'dist/content/title-styles.json',
  'dist/first-paint-route.css',
  'dist/first-paint-route.js',
]) {
  if (!fs.existsSync(path.join(root, file))) fail(`arquivo ausente no build: ${file}`);
}

const expectedClasses = ['hero-copy'];
if (hero.title_alignment === 'right') expectedClasses.push('align-right');
if (hero.title_alignment === 'center') expectedClasses.push('align-center');
if (hero.title_size === 'compact') expectedClasses.push('title-compact');
if (hero.title_size === 'small') expectedClasses.push('title-small');

if (!publicHtml.includes(`class="${expectedClasses.join(' ')}"`)) {
  fail('classes visuais da hero não foram sincronizadas no HTML inicial');
}

if (typeof hero.image === 'string' && hero.image.trim()) {
  const image = hero.image.trim();
  if (!publicHtml.includes(`src="${image}"`)) fail('imagem final da hero não está no primeiro src do build');
  if (!publicHtml.includes(`<link rel="preload" as="image" href="${image}" fetchpriority="high" />`)) {
    fail('preload da imagem principal não foi injetado');
  }
}

if (!/id="hero-image"[^>]*loading="eager"/i.test(publicHtml)) fail('hero principal deve carregar eager');
if (!/id="hero-image"[^>]*fetchpriority="high"/i.test(publicHtml)) fail('hero principal deve ter prioridade alta');
if (!/id="hero-image"[^>]*decoding="sync"/i.test(publicHtml)) fail('hero principal deve priorizar decodificação síncrona');

console.log('TITLE STYLE BUILD CHECK: PASS');
console.log('- título assistido presente no build');
console.log('- hero sincronizada no HTML inicial');
console.log('- imagem principal sem troca tardia de src e com preload prioritário');
console.log('- rota inicial protegida dentro do head antes do primeiro paint');
