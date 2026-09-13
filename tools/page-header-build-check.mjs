import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`PAGE HEADER BUILD CHECK: FAIL — ${message}`); process.exit(1); };

const publicHtml = read('dist/index.html');
const adminHtml = read('dist/admin/index.html');

if (!publicHtml.includes('<script type="module" src="/page-header-assist.js"></script>')) fail('runtime público de cabeçalhos não foi injetado');
if (!adminHtml.includes('<script type="module" src="/admin/page-header-assist.js"></script>')) fail('runtime administrativo de cabeçalhos não foi injetado');

for (const file of [
  'dist/page-header-assist.js',
  'dist/admin/page-header-assist.js',
  'dist/content/page-headers.json',
]) {
  if (!fs.existsSync(path.join(root, file))) fail(`arquivo ausente no build: ${file}`);
}

console.log('PAGE HEADER BUILD CHECK: PASS');
console.log('- runtime público e administrativo presentes no build');
console.log('- configuração padrão de cabeçalhos publicada no dist');
