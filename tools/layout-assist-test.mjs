import fs from 'node:fs';
import path from 'node:path';
import { validateLayout } from '../functions/api/admin/layout.js';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const layout = JSON.parse(read('public/content/layout.json'));
const publicJs = read('public/layout-assist.js');
const adminJs = read('public/admin/layout-assist.js');
const publicApi = read('functions/api/layout.js');
const middleware = read('functions/api/admin/_middleware.js');
const viteConfig = read('vite.config.js');

const fail = (message) => { console.error(`LAYOUT ASSIST TEST: FAIL — ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };

const normalized = validateLayout(layout);
assert(normalized.blocks.home_hero === 'text-left', 'capa deve manter o layout atual como padrão');
assert(normalized.blocks.about_hero === 'text-left', 'Sobre deve manter o layout atual como padrão');
assert(normalized.blocks.legacy_hero === 'text-left', 'Legado deve manter o layout atual como padrão');

for (const key of ['home_hero', 'about_hero', 'legacy_hero']) {
  const candidate = structuredClone(layout);
  candidate.blocks[key] = 'image-left';
  assert(validateLayout(candidate).blocks[key] === 'image-left', `inversão segura não aceita em ${key}`);
}

for (const invalid of ['free', 'absolute', 'drag', 'stacked-random']) {
  const candidate = structuredClone(layout);
  candidate.blocks.home_hero = invalid;
  let rejected = false;
  try { validateLayout(candidate); } catch { rejected = true; }
  assert(rejected, `valor livre não rejeitado: ${invalid}`);
}

assert(publicJs.includes('@media (min-width: 981px)'), 'reordenação deve ser limitada ao desktop');
assert(publicJs.includes('layout_home') && publicJs.includes('layout_about') && publicJs.includes('layout_legacy'), 'pré-visualização assistida incompleta');
assert(publicJs.includes("fetch('/api/layout'"), 'site público deve consultar layout editorial salvo no Preview');
assert(publicJs.includes('minmax(420px, .98fr) minmax(0, 1.02fr)'), 'capa invertida deve preservar proporção das colunas');
assert(publicJs.includes('minmax(0, .8fr) minmax(0, 1.2fr)'), 'Sobre invertido deve preservar proporção das colunas');
assert(publicJs.includes('minmax(0, 1.1fr) minmax(0, .9fr)'), 'Legado invertido deve preservar proporção das colunas');
assert(publicApi.includes("content/pa-v001-admin-preview"), 'API pública de layout deve ler somente a branch editorial de Preview');
assert(publicApi.includes("public/content/layout.json"), 'API pública de layout deve ler apenas o arquivo de layout');
assert(!publicApi.includes('onRequestPut'), 'API pública de layout não pode permitir escrita');
assert(adminJs.includes('Texto à esquerda') && adminJs.includes('Imagem à esquerda'), 'opções seguras não aparecem no admin');
assert(adminJs.includes('Pré-visualizar') && adminJs.includes('Salvar disposição'), 'ações do editor de layout ausentes');
assert(!adminJs.toLowerCase().includes('dragstart'), 'drag-and-drop livre não pode ser habilitado');
assert(middleware.includes("'/api/admin/layout'"), 'guard de branch não cobre escrita de layout');
assert(viteConfig.includes('/layout-assist.js') && viteConfig.includes('/admin/layout-assist.js'), 'injeção de runtime incompleta');

console.log('LAYOUT ASSIST TEST: PASS');
console.log('- somente text-left/image-left são aceitos');
console.log('- mobile não recebe reordenação forçada');
console.log('- Preview público lê a disposição editorial salva dinamicamente');
console.log('- inversão preserva as proporções originais de texto e imagem');
console.log('- capa, Sobre e Memória/legado possuem controles assistidos');
console.log('- escrita permanece guardada na branch editorial de Preview');
