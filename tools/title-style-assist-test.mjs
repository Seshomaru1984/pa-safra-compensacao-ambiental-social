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
const layoutAdmin = read('public/admin/layout-assist.js');
const pageActions = read('public/admin/page-actions.js');
const middleware = read('functions/api/admin/_middleware.js');
const viteConfig = read('vite.config.js');

const fail = (message) => { console.error(`TITLE STYLE ASSIST TEST: FAIL — ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };

const validated = validateTitleStyles(styles);
const expectedSizes = {
  home_hero: 'medium',
  home_intro: 'default',
  about_hero: 'medium',
  lectures_hero: 'medium',
  gallery_hero: 'medium',
  resources_hero: 'medium',
  legacy_hero: 'medium',
  extra_pages: 'default',
};
assert(Object.keys(validated.titles).length === Object.keys(expectedSizes).length, 'quantidade de alvos de título inesperada');

for (const [key, expectedSize] of Object.entries(expectedSizes)) {
  assert(validated.titles[key].size === expectedSize, `tamanho editorial atual não preservado em ${key}`);
  assert(validated.titles[key].align === 'default', `alinhamento padrão alterado em ${key}`);
  assert(validated.titles[key].color === 'default', `cor padrão alterada em ${key}`);
  assert(validated.titles[key].weight === 'default', `peso padrão alterado em ${key}`);
  assert(validated.titles[key].italic === false, `itálico inesperado em ${key}`);
}

const candidate = structuredClone(styles);
candidate.titles.home_hero = { size: 'display', align: 'center', color: '#123456', weight: 'bold', italic: true };
const custom = validateTitleStyles(candidate);
assert(custom.titles.home_hero.size === 'display', 'tamanho destaque não aceito');
assert(custom.titles.home_hero.align === 'center', 'alinhamento central não aceito');
assert(custom.titles.home_hero.color === '#123456', 'cor hexadecimal não aceita');
assert(custom.titles.home_hero.weight === 'bold', 'peso negrito não aceito');
assert(custom.titles.home_hero.italic === true, 'itálico não aceito');

for (const [field, value] of [['size', '99px'], ['align', 'justify'], ['color', 'red'], ['weight', '900']]) {
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

for (const token of ['Pequeno', 'Médio', 'Grande', 'Destaque', 'Centralizado', 'Usar cor padrão', 'Seminegrito', 'Itálico']) {
  assert(adminJs.includes(token), `controle administrativo ausente: ${token}`);
}
assert(!adminJs.includes('data-title-preview'), 'cartões de título não podem ter botão próprio de pré-visualização');
assert(!adminJs.includes('data-title-save'), 'cartões de título não podem ter botão próprio de salvamento');
assert(pageActions.includes("preview.textContent = 'Pré-visualizar'"), 'ação única de pré-visualização por página ausente');
assert(pageActions.includes("save.textContent = 'Salvar'"), 'ação única de salvamento por página ausente');
for (const saveId of ['save-home', 'save-about', 'save-highlights', 'save-videos', 'save-gallery', 'save-links', 'save-legacy', 'save-pages', 'save-appearance']) {
  assert(pageActions.includes(`saveId: '${saveId}'`), `página sem barra única de ações: ${saveId}`);
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
assert(numericAdmin.includes("requested.includes('lectures_hero')") && numericAdmin.includes('await saveVideoStyle(options)'), 'tamanho dos títulos dos vídeos não participa do salvamento unificado');
assert(layoutAdmin.includes("requested.includes('home_hero')") && layoutAdmin.includes('await saveLayout(options)'), 'disposição da Home não participa do salvamento unificado');

assert(publicJs.includes('/api/title-styles'), 'site público não consulta formatação editorial salva');
assert(publicJs.includes('clamp('), 'tamanhos responsivos não usam clamp');
assert(publicJs.includes('#titulo-inicio') && publicJs.includes('#titulo-sobre') && publicJs.includes('#titulo-legado'), 'títulos principais não estão cobertos');
assert(publicJs.includes('#cms-pages-root [data-view] .page-hero h1'), 'páginas extras não estão cobertas');
assert(middleware.includes("'/api/admin/title-styles'"), 'guard de branch não cobre escrita de formatação de títulos');
assert(viteConfig.includes('/title-style-assist.js') && viteConfig.includes('/admin/title-style-assist.js') && viteConfig.includes('/admin/page-actions.js'), 'runtimes administrativos estão incompletos');
assert(!adminJs.toLowerCase().includes('dragstart'), 'formatação de títulos não deve habilitar drag-and-drop');

for (const file of [
  'public/title-style-assist.js',
  'public/admin/title-style-assist.js',
  'public/admin/page-actions.js',
  'public/admin/numeric-font-assist.js',
  'public/admin/layout-assist.js',
  'public/admin/image-upload.js',
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
console.log('- estado editorial atual dos tamanhos de título é preservado');
console.log('- tamanho, alinhamento, cor, peso e itálico continuam limitados por lista branca');
console.log('- cada página administrativa expõe somente Salvar e Pré-visualizar no rodapé');
console.log('- conteúdo, título, disposição da Home e tamanho dos vídeos participam do salvamento da página');
console.log('- títulos principais e páginas extras possuem formatação assistida');
console.log('- escrita permanece restrita à branch editorial de Preview');
