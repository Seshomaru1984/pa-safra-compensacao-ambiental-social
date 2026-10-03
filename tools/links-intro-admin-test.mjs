import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => {
  console.error(`LINKS INTRO ADMIN TEST: FAIL - ${message}`);
  process.exit(1);
};
const assert = (condition, message) => { if (!condition) fail(message); };

const links = JSON.parse(read('public/content/links.json'));
const contentApi = read('functions/api/admin/content.js');
const adminHtml = read('public/admin/index.html');
const adminAssist = read('public/admin/links-intro-assist.js');
const publicAssist = read('public/links-intro-public.js');
const vite = read('vite.config.js');

assert(typeof links.intro === 'string', 'links.json deve possuir o campo intro');
assert(links.intro.includes('Links institucionais para consulta'), 'texto atual deve ser preservado como valor inicial editável');

assert(contentApi.includes("rejectUnknown(data, ['intro', 'official', 'sources'], 'links')"), 'API deve permitir intro no recurso links');
assert(contentApi.includes("ensureString(data.intro, 'Texto de apresentação de Links úteis', 1000)"), 'API deve validar intro como texto opcional');

const assistTag = '<script src="/admin/links-intro-assist.js"></script>';
const adminTag = '<script type="module" src="/admin/admin.js"></script>';
assert(adminHtml.includes(assistTag), 'Admin deve carregar o assistente da apresentação');
assert(adminHtml.indexOf(assistTag) < adminHtml.indexOf(adminTag), 'assistente deve interceptar o salvamento antes do módulo principal');

for (const token of [
  "const FIELD_ID = 'links-page-intro'",
  "payload?.resource !== 'links'",
  'payload.data.intro = currentIntro()',
  'Deixe vazio para não exibir texto abaixo do título da página.',
  "nativeFetch('/content/links.json'",
]) assert(adminAssist.includes(token), `assistente do Admin sem contrato esperado: ${token}`);

for (const token of [
  "[data-view=\"recursos\"] .page-hero .shell > p:not(.eyebrow)",
  "typeof data?.intro === 'string'",
  'node.hidden = !intro',
]) assert(publicAssist.includes(token), `renderização pública sem contrato esperado: ${token}`);

assert(vite.includes('PUBLIC_LINKS_INTRO_TAG'), 'build deve carregar o controlador público do texto de Links úteis');
assert(vite.includes('PUBLIC_LINKS_INTRO_TAG,'), 'controlador público deve ser injetado no HTML final');

console.log('LINKS INTRO ADMIN TEST: PASS');
console.log('- apresentação de Links úteis é editável no mesmo Salvar da área');
console.log('- campo vazio oculta o parágrafo público');
console.log('- API preserva e valida o novo campo intro');
