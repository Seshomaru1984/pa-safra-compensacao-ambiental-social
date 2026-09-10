import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

function fail(message) {
  errors.push(message);
}

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    fail(`Arquivo ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

const pages = read('.pages.yml');

const requiredSnippets = [
  'name: validate-content',
  'workflow: validate.yml',
  'ref: current',
  'name: site',
  'path: public/content/site.json',
  'name: highlights',
  'path: public/content/destaques.json',
  'name: gallery',
  'path: public/content/galeria.json',
  'name: news',
  'path: public/content/noticias.json',
  'name: videos',
  'path: public/content/videos.json',
  'name: pages',
  'path: public/content/paginas.json',
  'input: public/assets/img',
  'input: public/assets/uploads',
  'merge: true',
  'identity: user',
];

for (const token of requiredSnippets) {
  if (!pages.includes(token)) fail(`Contrato Pages CMS ausente: ${token}`);
}

if (/path:\s*public\/content\/publicacao\.json/.test(pages)) {
  fail('publicacao.json nao pode ser exposto como conteudo editavel no Pages CMS.');
}

const editableJson = [
  'public/content/site.json',
  'public/content/destaques.json',
  'public/content/galeria.json',
  'public/content/noticias.json',
  'public/content/videos.json',
  'public/content/paginas.json',
];

for (const rel of editableJson) {
  const raw = read(rel);
  if (!raw) continue;
  try {
    const data = JSON.parse(raw);
    const clone = structuredClone(data);

    // Simula o ciclo de edicao/salvamento do CMS em memoria, sem tocar no repositorio.
    const roundTrip = JSON.parse(JSON.stringify(clone, null, 2));
    if (JSON.stringify(roundTrip) !== JSON.stringify(clone)) {
      fail(`Round-trip JSON inconsistente: ${rel}`);
    }
  } catch (error) {
    fail(`JSON editavel invalido em ${rel}: ${error.message}`);
  }
}

const publicationRaw = read('public/content/publicacao.json');
if (publicationRaw) {
  try {
    const publication = JSON.parse(publicationRaw);
    if (publication.status !== 'pendente') {
      fail(`Estado de publicacao inesperado para teste operacional: ${publication.status}`);
    }
    const checks = publication.checks || {};
    const enabled = Object.entries(checks).filter(([, value]) => value === true).map(([key]) => key);
    if (enabled.length) {
      fail(`Checks de publicacao marcados como aprovados durante teste: ${enabled.join(', ')}`);
    }
  } catch (error) {
    fail(`publicacao.json invalido: ${error.message}`);
  }
}

for (const rel of ['public/assets/img', 'public/assets/uploads']) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) {
    fail(`Diretorio de media do CMS ausente: ${rel}`);
  }
}

if (errors.length) {
  console.error('PAGES CMS CONTRACT: FALHOU');
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('PAGES CMS CONTRACT: OK');
console.log('- configuracao .pages.yml localizada');
console.log('- seis colecoes editoriais vinculadas aos arquivos esperados');
console.log('- acao validate-content vinculada a validate.yml na branch corrente');
console.log('- publicacao.json fora do painel editorial');
console.log('- round-trip dos JSONs editaveis: OK');
console.log('- estado de publicacao continua pendente e bloqueado');
console.log('- diretorios de midia: OK');
