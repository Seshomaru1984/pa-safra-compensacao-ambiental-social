import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'public/content/publicacao.json');
const explicitStrict = process.argv.includes('--strict');

function fail(message) {
  console.error(`PREPUBLICACAO: FALHOU - ${message}`);
  process.exit(1);
}

if (!fs.existsSync(file)) {
  fail('public/content/publicacao.json ausente.');
}

let config;
try {
  config = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (error) {
  fail(`publicacao.json invalido: ${error.message}`);
}

const productionBranch = String(config.production_branch || 'main').trim() || 'main';
const branch = String(
  process.env.CF_PAGES_BRANCH ||
  process.env.GITHUB_HEAD_REF ||
  process.env.GITHUB_REF_NAME ||
  ''
).trim();

const isCloudflareProduction = process.env.CF_PAGES === '1' && branch === productionBranch;
const strict = explicitStrict || isCloudflareProduction;
const checks = config.checks && typeof config.checks === 'object' ? config.checks : null;

if (!checks) {
  fail('objeto checks ausente em publicacao.json.');
}

const entries = Object.entries(checks);
if (!entries.length) {
  fail('nenhuma validacao de publicacao foi definida.');
}

const invalidTypes = entries.filter(([, value]) => typeof value !== 'boolean');
if (invalidTypes.length) {
  fail(`validacoes devem ser booleanas: ${invalidTypes.map(([key]) => key).join(', ')}`);
}

const pending = entries.filter(([, value]) => value !== true).map(([key]) => key);

console.log(`PREPUBLICACAO: branch=${branch || '(nao informada)'} production_branch=${productionBranch}`);
console.log(`PREPUBLICACAO: modo=${strict ? 'BLOQUEANTE' : 'ADVISORY'}`);

if (pending.length) {
  console.warn('PREPUBLICACAO: pendencias:');
  pending.forEach((item) => console.warn(`- ${item}`));

  if (strict) {
    fail('publicacao em producao bloqueada enquanto houver pendencias editoriais.');
  }

  console.log('PREPUBLICACAO: OK em modo advisory; nenhuma producao foi autorizada.');
  process.exit(0);
}

if (String(config.status || '').trim().toLowerCase() !== 'aprovado') {
  if (strict) {
    fail('todas as validacoes estao verdadeiras, mas status ainda nao e "aprovado".');
  }
  console.warn('PREPUBLICACAO: validacoes concluidas, mas status ainda nao e "aprovado".');
  process.exit(0);
}

console.log('PREPUBLICACAO: APROVADO');
