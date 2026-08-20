import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'index.html',
  'styles.css',
  'app.js',
  'assets/icons/pa-safra.svg',
  'assets/img/rio-nova-xavantina.jpg',
  'assets/img/registro-historico.jpg',
  'assets/img/atrativos-nova-xavantina.jpg'
];

const errors = [];
for (const rel of required) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) errors.push(`Arquivo ausente: ${rel}`);
}

const htmlPath = path.join(root, 'index.html');
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const mustContain = [
    'Projeto de Compensação Ambiental e Social - PA Safra',
    'Sobre este site',
    'Memória e legado',
    'Vila do Banco Safra',
    'https://www.sema.mt.gov.br/',
    'https://mpmt.mp.br/',
    'https://www.gov.br/ibama/pt-br'
  ];
  for (const token of mustContain) {
    if (!html.includes(token)) errors.push(`Conteúdo obrigatório ausente: ${token}`);
  }
}

if (errors.length) {
  console.error('=== PA SAFRA / CHECK ===');
  for (const error of errors) console.error(`ERRO: ${error}`);
  process.exit(1);
}

console.log('=== PA SAFRA / CHECK ===');
console.log('RESULTADO: OK');