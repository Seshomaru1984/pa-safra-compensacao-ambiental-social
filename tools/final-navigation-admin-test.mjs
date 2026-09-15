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

for (const token of [
  "slug: 'acesso-localizacao'",
  "tabLabel: 'Mapas e acessos'",
  "slug: 'contato'",
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
  "'acesso-localizacao'",
  "'palestras'",
  "'galeria'",
  "'legado'",
  "'recursos'",
  "'contato'",
];
let lastIndex = -1;
for (const token of expectedOrder) {
  const index = navOrder.indexOf(token);
  assert(index > lastIndex, `ordem pública incorreta ou ausente em navigation-order.js: ${token}`);
  lastIndex = index;
}
assert(navOrder.includes("menu.appendChild(contactNode)"), 'Contato deve permanecer como última ação do menu.');
assert(vite.includes('PUBLIC_NAV_ORDER_TAG'), 'build deve injetar o controlador de ordem do menu.');
assert(vite.includes('PUBLIC_NAV_ORDER_TAG,'), 'controlador de ordem deve ser incluído no HTML final.');

const access = pages.find((page) => page?.slug === 'acesso-localizacao');
const contact = pages.find((page) => page?.slug === 'contato');
assert(access?.published !== false, 'Mapas e acessos deve permanecer publicado.');
assert(contact?.published !== false, 'Contato deve permanecer publicado.');
assert(access?.nav_label === 'Mapas e acessos', 'rótulo público de Mapas e acessos deve permanecer sincronizado.');
assert(contact?.nav_label === 'Contato', 'rótulo público de Contato deve permanecer sincronizado.');

console.log('FINAL NAVIGATION/ADMIN TEST: PASS');
console.log('- Contato e Mapas e acessos têm abas próprias no Admin');
console.log('- ordem pública: Início > Sobre > Mapas e acessos > Palestras > Galeria > Memória e legado > Links Úteis > Contato');