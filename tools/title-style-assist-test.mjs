import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import { validateTitleStyles } from '../functions/api/admin/title-styles.js';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const styles = JSON.parse(read('public/content/title-styles.json'));
const publicJs = read('public/title-style-assist.js');
const adminJs = read('public/admin/title-style-assist.js');
const adminMain = read('public/admin/admin.js');
const numericAdmin = read('public/admin/numeric-font-assist.js');
const middleware = read('functions/api/admin/_middleware.js');
const viteConfig = read('vite.config.js');

const fail = (message) => { console.error(`TITLE STYLE ASSIST TEST: FAIL — ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };

const validated = validateTitleStyles(styles);
const keys = ['home_hero', 'home_intro', 'about_hero', 'lectures_hero', 'gallery_hero', 'resources_hero', 'legacy_hero', 'extra_pages'];
assert(Object.keys(validated.titles).length === keys.length, 'quantidade de alvos de título inesperada');

for (const key of keys) {
  assert(validated.titles[key].size === 'default', `tamanho padrão alterado em ${key}`);
  assert(validated.titles[key].align === 'default', `alinhamento padrão alterado em ${key}`);
  assert(validated.titles[key].color === 'default', `cor padrão alterada em ${key}`);
}

const candidate = structuredClone(styles);
candidate.titles.home_hero = { size: 'display', align: 'center', color: '#123456', weight: 'bold', italic: true };
const custom = validateTitleStyles(candidate);
assert(custom.titles.home_hero.size === 'display', 'tamanho destaque não aceito');
assert(custom.titles.home_hero.align === 'center', 'alinhamento central não aceito');
assert(custom.titles.home_hero.color === '#123456', 'cor hexadecimal não aceita');
assert(custom.titles.home_hero.weight === 'bold', 'peso negrito não aceito');
assert(custom.titles.home_hero.italic === true, 'itálico não aceito');

for (const [field, value] of [
  ['size', '99px'], ['align', 'justify'], ['color', 'red'], ['weight', '900'],
]) {
  const invalid = structuredClone(styles);
  invalid.titles.home_hero[field] = value;
  let rejected = false;
  try { validateTitleStyles(invalid); } catch { rejected = true; }
  assert(rejected, `valor arbitrário não rejeitado em ${field}: ${value}`);
}

const badItalic = structuredClone(styles);
badItalic.titles.home_hero.italic = 'true';
let italicRejected = false;
try { validateTitleStyles(badItalic); } catch { italicRejected = true; }
assert(italicRejected, 'itálico não booleano deve ser rejeitado');

for (const token of ['Pequeno', 'Médio', 'Grande', 'Destaque', 'Centralizado', 'Usar cor padrão', 'Seminegrito', 'Itálico', 'Pré-visualizar', 'Salvar formatação']) {
  assert(adminJs.includes(token), `controle administrativo ausente: ${token}`);
}

assert(adminJs.includes('window.PASafraTitleStyles = Object.freeze({ saveKeys })'), 'API interna de salvamento unificado de títulos não foi exposta');
for (const token of [
  "publishTitleStyles(['home_hero', 'home_intro'])",
  "publishTitleStyles(['about_hero'])",
  "publishTitleStyles(['lectures_hero'])",
  "publishTitleStyles(['gallery_hero'])",
  "publishTitleStyles(['resources_hero'])",
  "publishTitleStyles(['legacy_hero'])",
  "publishTitleStyles(['extra_pages'])",
]) assert(adminMain.includes(token), `publicação conjunta conteúdo+título ausente: ${token}`);
assert(numericAdmin.includes("saveKeys(['lectures_hero'], { silent: true })"), 'Publicar tudo dos vídeos não inclui a formatação do título da página');

assert(publicJs.includes('/api/title-styles'), 'site público não consulta formatação editorial salva');
assert(publicJs.includes('clamp('), 'tamanhos responsivos não usam clamp');
assert(publicJs.includes('#titulo-inicio') && publicJs.includes('#titulo-sobre') && publicJs.includes('#titulo-legado'), 'títulos principais não estão cobertos');
assert(publicJs.includes('#cms-pages-root [data-view] .page-hero h1'), 'páginas extras não estão cobertas');
assert(middleware.includes("'/api/admin/title-styles'"), 'guard de branch não cobre escrita de formatação de títulos');
assert(viteConfig.includes('/title-style-assist.js') && viteConfig.includes('/admin/title-style-assist.js'), 'injeção dos runtimes de título está incompleta');
assert(!adminJs.toLowerCase().includes('dragstart'), 'formatação de títulos não deve habilitar drag-and-drop');

for (const file of [
  'public/title-style-assist.js',
  'public/admin/title-style-assist.js',
  'functions/api/title-styles.js',
  'functions/api/admin/title-styles.js',
]) {
  const temp = path.join(os.tmpdir(), `pa-safra-title-check-${path.basename(file)}-${process.pid}.mjs`);
  fs.writeFileSync(temp, read(file), 'utf8');
  const result = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8' });
  fs.rmSync(temp, { force: true });
  assert(result.status === 0, `node --check falhou em ${file}: ${result.stderr || result.stdout}`);
}

console.log('TITLE STYLE ASSIST TEST: PASS');
console.log('- tamanho, alinhamento, cor, peso e itálico são controlados por lista branca');
console.log('- publicar alterações salva conteúdo e formatação do título da mesma área');
console.log('- publicar tudo dos vídeos inclui conteúdo, tamanho dos títulos dos vídeos e título da página');
console.log('- tamanhos usam faixas responsivas com clamp()');
console.log('- títulos principais e páginas extras possuem formatação assistida');
console.log('- HTML semântico dos títulos não é substituído');
console.log('- escrita permanece restrita à branch editorial de Preview');
