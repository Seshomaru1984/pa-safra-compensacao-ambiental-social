import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mustExist = [
  'dist/index.html',
  'dist/admin/index.html',
  'dist/layout-assist.js',
  'dist/admin/home-editor.js',
  'dist/admin/home-editor.css',
  'dist/content/layout.json',
];
for (const file of mustExist) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`LAYOUT BUILD CHECK: FAIL — ausente ${file}`);
    process.exit(1);
  }
}

const index = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'dist/admin/index.html'), 'utf8');

if (!index.includes('<script type="module" src="/layout-assist.js"></script>')) {
  console.error('LAYOUT BUILD CHECK: FAIL — runtime público não injetado.');
  process.exit(1);
}
if (!admin.includes('<script src="/admin/home-editor.js"></script>')) {
  console.error('LAYOUT BUILD CHECK: FAIL — novo controlador da Home não injetado.');
  process.exit(1);
}
if (!admin.includes('<link rel="stylesheet" href="/admin/home-editor.css" />')) {
  console.error('LAYOUT BUILD CHECK: FAIL — estilo do novo controlador da Home não injetado.');
  process.exit(1);
}
if (admin.includes('/admin/layout-assist.js')) {
  console.error('LAYOUT BUILD CHECK: FAIL — controlador administrativo antigo ainda está no build.');
  process.exit(1);
}

console.log('LAYOUT BUILD CHECK: PASS');
console.log('- runtime público de layout preservado');
console.log('- Home administrativa usa somente o novo controlador reconstruído');
