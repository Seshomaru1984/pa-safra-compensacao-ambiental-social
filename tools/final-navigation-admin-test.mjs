import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => {
  console.error(`FINAL NAVIGATION/ADMIN TEST: FAIL - ${message}`);
  process.exit(1);
};
const assert = (condition, message) => { if (!condition) fail(message); };

const assist = read('public/admin/access-assist.js');
const navOrder = read('public/navigation-order.js');
const vite = read('vite.config.js');
const pages = JSON.parse(read('public/content/paginas.json'));
const site = JSON.parse(read('public/content/site.json'));
const app = read('app.js');
const indexHtml = read('index.html');

for (const token of [
  "const ACCESS_SLUG = 'acesso-localizacao'",
  "const CONTACT_SLUG = 'contato'",
  "tabLabel: 'Mapas e acessos'",
  "tabLabel: 'Contato'",
  'dataset.pageMode',
]) {
  assert(assist.includes(token), `assistente do Admin sem contrato esperado: ${token}`);
}

assert(assist.includes("makeModeTab('access')"), 'Admin deve criar aba explícita de Mapas e acessos.');
assert(assist.includes("makeModeTab('contact')"), 'Admin deve criar aba explícita de Contato.');
assert(assist.includes("card.hidden = Boolean(config && slug !== config.slug)"), 'abas especiais devem isolar apenas a página correspondente.');

const expectedOrder = [
  "'inicio'",
  "'sobre'",
  "'palestras'",
  "'galeria'",
  "'acesso-localizacao'",
  "'contato'",
  "'recursos'",
  "'legado'",
];
let lastIndex = -1;
for (const token of expectedOrder) {
  const index = navOrder.indexOf(token);
  assert(index > lastIndex, `ordem pública incorreta ou ausente em navigation-order.js: ${token}`);
  lastIndex = index;
}
assert(vite.includes('PUBLIC_NAV_ORDER_TAG'), 'build deve injetar o controlador de ordem do menu.');
assert(vite.includes('PUBLIC_NAV_ORDER_TAG,'), 'controlador de ordem deve ser incluído no HTML final.');

const access = pages.find((page) => page?.slug === 'acesso-localizacao');
const contact = pages.find((page) => page?.slug === 'contato');
assert(access?.published !== false, 'Mapas e acessos deve permanecer publicado.');
assert(contact?.published !== false, 'Contato deve permanecer publicado.');
assert(access?.nav_label === 'Mapas e acessos', 'rótulo público de Mapas e acessos deve permanecer sincronizado.');
assert(contact?.nav_label === 'Contato', 'rótulo público de Contato deve permanecer sincronizado.');

assert(site.brand_name === 'Compensação Social e Ambiental', 'marca superior deve usar somente Compensação Social e Ambiental.');
assert(site.brand_tagline === '', 'complemento antigo da marca deve permanecer vazio.');
assert(indexHtml.includes('<strong id="brand-name">Compensação Social e Ambiental</strong>'), 'primeiro paint não deve exibir PA Safra na marca superior.');
assert(!indexHtml.includes('id="brand-tagline"'), 'cabeçalho não deve renderizar subtítulo redundante.');
assert(!app.includes("getElementById('brand-tagline')"), 'frontend não deve recriar subtítulo da marca.');
assert(!app.includes('site.brand_name'), 'conteúdo editorial não deve sobrescrever a marca superior.');
assert(read('styles.css').includes('#brand-tagline { display: none !important; }'), 'CSS deve impedir reaparecimento visual do subtítulo.');
assert(read('styles.css').includes('white-space: nowrap;'), 'menu deve impedir quebra indevida dos rótulos.');
const headerCss = read('styles.css');
assert(headerCss.includes('.brand strong { display: block; color: rgba(255,255,255,.78); font-size: .92rem; font-weight: 650; line-height: 1.2; letter-spacing: 0; white-space: nowrap; }'), 'identificação superior deve usar o mesmo tratamento tipográfico do menu.');
assert(!read('public/admin/admin.js').includes('home-brand-tagline'), 'Admin não deve oferecer campo para subtítulo removido.');
assert(!read('public/admin/admin.js').includes('appearance-brand-name'), 'Admin não deve permitir reintroduzir PA Safra na marca superior.');
const adminApi = read('functions/api/admin/content.js');
assert(adminApi.includes("body.data.brand_name = 'Compensação Social e Ambiental'"), 'API deve normalizar a marca superior em toda gravação de site.');
assert(adminApi.includes("body.data.brand_tagline = ''"), 'API deve eliminar o subtítulo em toda gravação de site.');

const legacyPublicName = /P\.?\s*A\.?\s+Safra/i;
for (const publicFile of [
  'index.html',
  'app.js',
  'public/access-map.js',
  'public/admin/index.html',
  'public/links-intro-public.js',
  'public/content/site.json',
  'public/content/destaques.json',
  'public/content/paginas.json',
]) {
  assert(!legacyPublicName.test(read(publicFile)), `referência pública antiga ainda presente em ${publicFile}`);
}
assert(indexHtml.includes('Projeto de Compensação Ambiental e Social - Fazenda Matrinchã'), 'rodapé e identidade institucional devem usar Fazenda Matrinchã.');
assert(indexHtml.includes('© 2026 Fazenda Matrinchã'), 'copyright do rodapé deve usar © 2026 Fazenda Matrinchã.');

console.log('FINAL NAVIGATION/ADMIN TEST: PASS');
console.log('- Contato e Mapas e acessos têm abas próprias no Admin');
console.log('- ordem pública restaurada: Início > Sobre > Palestras > Galeria > Mapas e acessos > Contato > Links Úteis > Memória e legado');
console.log('- cabeçalho superior: somente Compensação Social e Ambiental, sem linha inferior');
console.log('- referências públicas PA Safra/P.A. Safra removidas; rodapé usa Fazenda Matrinchã');