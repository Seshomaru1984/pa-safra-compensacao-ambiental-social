import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mustExist = [
  'dist/index.html',
  'dist/admin/index.html',
  'dist/layout-assist.js',
  'dist/admin/layout-assist.js',
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
if (!admin.includes('<script type="module" src="/admin/layout-assist.js"></script>')) {
  console.error('LAYOUT BUILD CHECK: FAIL — runtime administrativo não injetado.');
  process.exit(1);
}
console.log('LAYOUT BUILD CHECK: PASS');
