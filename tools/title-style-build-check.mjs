import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`TITLE STYLE BUILD CHECK: FAIL — ${message}`); process.exit(1); };

const publicHtml = read('dist/index.html');
const adminHtml = read('dist/admin/index.html');

if (!publicHtml.includes('<script type="module" src="/title-style-assist.js"></script>')) fail('runtime público de títulos não foi injetado');
if (!adminHtml.includes('<script type="module" src="/admin/title-style-assist.js"></script>')) fail('runtime administrativo de títulos não foi injetado');

for (const file of [
  'dist/title-style-assist.js',
  'dist/admin/title-style-assist.js',
  'dist/content/title-styles.json',
]) {
  if (!fs.existsSync(path.join(root, file))) fail(`arquivo ausente no build: ${file}`);
}

console.log('TITLE STYLE BUILD CHECK: PASS');
