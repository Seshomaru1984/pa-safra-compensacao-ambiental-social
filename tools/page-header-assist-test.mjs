import fs from 'node:fs';
import { validatePageHeaders } from '../functions/api/admin/page-headers.js';

const fail = (message) => { console.error(`PAGE HEADER ASSIST TEST: FAIL — ${message}`); process.exit(1); };
const read = (file) => fs.readFileSync(file, 'utf8');

const base = JSON.parse(read('public/content/page-headers.json'));
let valid;
try {
  valid = validatePageHeaders(base);
} catch (error) {
  fail(`configuração padrão inválida: ${error.message}`);
}

const keys = ['about', 'lectures', 'gallery', 'resources', 'legacy', 'extra_pages'];
for (const key of keys) {
  if (!valid.headers[key]) fail(`cabeçalho ausente: ${key}`);
  if (!/^#[0-9a-f]{6}$/i.test(valid.headers[key].color)) fail(`cor inválida em ${key}`);
  if (!['compact', 'normal', 'wide'].includes(valid.headers[key].size)) fail(`tamanho inválido em ${key}`);
}

for (const badSize of ['free', 'huge', '120px', 'drag']) {
  const sample = structuredClone(base);
  sample.headers.about.size = badSize;
  try {
    validatePageHeaders(sample);
    fail(`tamanho proibido foi aceito: ${badSize}`);
  } catch {}
}

for (const badColor of ['red', '#12345', 'url(x)', 'expression(x)', 'transparent']) {
  const sample = structuredClone(base);
  sample.headers.about.color = badColor;
  try {
    validatePageHeaders(sample);
    fail(`cor proibida foi aceita: ${badColor}`);
  } catch {}
}

const publicRuntime = read('public/page-header-assist.js');
const adminRuntime = read('public/admin/page-header-assist.js');
const middleware = read('functions/api/admin/_middleware.js');
const firstPaint = read('public/first-paint-route.js');
const vite = read('vite.config.js');

for (const token of ['data-page-header-size="compact"', 'data-page-header-size="normal"', 'data-page-header-size="wide"']) {
  if (!publicRuntime.includes(token)) fail(`CSS público sem ${token}`);
}
if (!publicRuntime.includes('@media (max-width: 980px)')) fail('proteção responsiva ausente');
if (!adminRuntime.includes('Cor de fundo') || !adminRuntime.includes('Tamanho da faixa')) fail('controles administrativos incompletos');
if (!adminRuntime.includes('Compacto') || !adminRuntime.includes('Normal') || !adminRuntime.includes('Amplo')) fail('opções seguras de tamanho ausentes');
if (!middleware.includes('/api/admin/page-headers')) fail('middleware não protege escrita de cabeçalhos');
if (!firstPaint.includes("'/api/page-headers'")) fail('first paint não acompanha cabeçalhos remotos');
if (!firstPaint.includes("'.page-hero[data-page-header]'")) fail('first paint não exige cabeçalho final na rota interna');
if (!vite.includes('/page-header-assist.js') || !vite.includes('/admin/page-header-assist.js')) fail('build não injeta runtimes de cabeçalho');

console.log('PAGE HEADER ASSIST TEST: PASS');
console.log('- cinco páginas internas + páginas extras possuem configuração segura');
console.log('- somente compacto/normal/amplo e cor hexadecimal são aceitos');
console.log('- mobile, first paint e branch editorial permanecem protegidos');
