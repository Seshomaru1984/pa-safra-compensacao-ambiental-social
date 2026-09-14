import fs from 'node:fs';
import path from 'node:path';
import { validateLayout } from '../functions/api/admin/layout.js';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const layout = JSON.parse(read('public/content/layout.json'));
const publicJs = read('public/layout-assist.js');
const adminJs = read('public/admin/layout-assist.js');
const pageActions = read('public/admin/page-actions.js');
const writeQueue = read('public/admin/write-queue.js');
const publicApi = read('functions/api/layout.js');
const adminApi = read('functions/api/admin/layout.js');
const middleware = read('functions/api/admin/_middleware.js');
const viteConfig = read('vite.config.js');

const fail = (message) => { console.error(`LAYOUT ASSIST TEST: FAIL — ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };

const normalized = validateLayout(layout);
assert(normalized.blocks.home_hero === 'text-left', 'capa deve manter o layout atual como padrão');
assert(!Object.hasOwn(normalized.blocks, 'about_hero'), 'Sobre não deve mais possuir layout assistido');
assert(!Object.hasOwn(normalized.blocks, 'legacy_hero'), 'Legado não deve mais possuir layout assistido');

const inverted = structuredClone(layout);
inverted.blocks.home_hero = 'image-left';
assert(validateLayout(inverted).blocks.home_hero === 'image-left', 'inversão segura da Home não foi aceita');

for (const obsolete of ['about_hero', 'legacy_hero']) {
  const candidate = structuredClone(layout);
  candidate.blocks[obsolete] = 'image-left';
  let rejected = false;
  try { validateLayout(candidate); } catch { rejected = true; }
  assert(rejected, `layout obsoleto não rejeitado: ${obsolete}`);
}

for (const invalid of ['free', 'absolute', 'drag', 'stacked-random']) {
  const candidate = structuredClone(layout);
  candidate.blocks.home_hero = invalid;
  let rejected = false;
  try { validateLayout(candidate); } catch { rejected = true; }
  assert(rejected, `valor livre não rejeitado: ${invalid}`);
}

assert(publicJs.includes('@media (min-width: 981px)'), 'reordenação da Home deve ser limitada ao desktop');
assert(publicJs.includes('layout_home'), 'pré-visualização assistida da Home ausente');
assert(!publicJs.includes('layout_about') && !publicJs.includes('layout_legacy'), 'site público ainda contém layouts internos obsoletos');
assert(publicJs.includes("fetch('/api/layout'"), 'site público deve consultar layout editorial salvo no Preview');
assert(publicJs.includes('minmax(420px, .98fr) minmax(0, 1.02fr)'), 'capa invertida deve preservar proporção das colunas');
assert(publicApi.includes("content/pa-v001-admin-preview"), 'API pública de layout deve ler somente a branch editorial de Preview');
assert(publicApi.includes("public/content/layout.json"), 'API pública de layout deve ler apenas o arquivo de layout');
assert(publicApi.includes('_pa_fresh') && publicApi.includes("'cache-control': 'no-cache, no-store, max-age=0'"), 'API pública de layout deve impedir leitura stale da branch editorial');
assert(!publicApi.includes('onRequestPut'), 'API pública de layout não pode permitir escrita');
assert(adminApi.includes('_pa_fresh') && adminApi.includes("'cache-control': 'no-cache, no-store, max-age=0'"), 'API administrativa de layout deve ler SHA atual sem cache');
assert(adminJs.includes('Texto à esquerda') && adminJs.includes('Imagem à esquerda'), 'opções seguras da Home não aparecem no admin');
assert(adminJs.includes('saveSelected') && adminJs.includes('PASafraLayout'), 'layout não expõe integração com o salvamento único da página');
assert(!adminJs.includes('data-layout-preview') && !adminJs.includes('data-layout-save'), 'editor de layout voltou a criar botões próprios de preview/salvar');
assert(pageActions.includes("form.id !== 'home-form'") && pageActions.includes('saveSelected'), 'Salvar da Home não dispara a persistência complementar da disposição da capa');
assert(pageActions.includes('applyPreviewParams'), 'Pré-visualizar único da Home não inclui a disposição selecionada');
assert(!/event\.preventDefault\s*\(/.test(pageActions), 'page-actions não pode impedir o submit funcional da Página inicial');
assert(!/stopImmediatePropagation\s*\(/.test(pageActions), 'page-actions não pode bloquear o listener original do admin.js');
assert(!/\.requestSubmit\s*\(/.test(pageActions), 'page-actions não deve fabricar um segundo submit da Página inicial');
assert(!pageActions.includes('submitter.disabled'), 'page-actions não pode controlar o estado do botão Salvar da Página inicial');
assert(writeQueue.includes("'/api/admin/layout'"), 'layout não participa da fila serial de gravação editorial');
assert(!adminJs.includes('about_hero') && !adminJs.includes('legacy_hero'), 'admin ainda contém controles de layout das páginas internas');
assert(!adminJs.toLowerCase().includes('dragstart'), 'drag-and-drop livre não pode ser habilitado');
assert(middleware.includes("'/api/admin/layout'"), 'guard de branch não cobre escrita de layout');
assert(viteConfig.includes('/layout-assist.js') && viteConfig.includes('/admin/layout-assist.js'), 'injeção de runtime incompleta');

console.log('LAYOUT ASSIST TEST: PASS');
console.log('- somente text-left/image-left são aceitos para a Home');
console.log('- submit original da Página inicial não é interceptado nem recriado');
console.log('- disposição da capa é persistida como gravação complementar do mesmo submit');
console.log('- leitura pública e leitura do SHA administrativo ignoram cache stale');
console.log('- editor de disposição não possui botões próprios duplicados');
console.log('- Pré-visualizar único inclui a disposição atualmente selecionada');
console.log('- layout participa da fila serial de gravações do Admin');
console.log('- páginas internas não possuem mais controles de disposição com imagem');
