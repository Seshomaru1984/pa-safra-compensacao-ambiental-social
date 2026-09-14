import fs from 'node:fs';
import path from 'node:path';
import { validateLayout } from '../functions/api/admin/layout.js';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const layout = JSON.parse(read('public/content/layout.json'));
const publicJs = read('public/layout-assist.js');
const homeEditor = read('public/admin/home-editor.js');
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
assert(!Object.hasOwn(normalized.blocks, 'about_hero'), 'Sobre não deve possuir layout assistido');
assert(!Object.hasOwn(normalized.blocks, 'legacy_hero'), 'Legado não deve possuir layout assistido');

const inverted = structuredClone(layout);
inverted.blocks.home_hero = 'image-left';
assert(validateLayout(inverted).blocks.home_hero === 'image-left', 'inversão segura da Home não foi aceita');

for (const invalid of ['free', 'absolute', 'drag', 'stacked-random']) {
  const candidate = structuredClone(layout);
  candidate.blocks.home_hero = invalid;
  let rejected = false;
  try { validateLayout(candidate); } catch { rejected = true; }
  assert(rejected, `valor livre não rejeitado: ${invalid}`);
}

assert(publicJs.includes('@media (min-width: 981px)'), 'reordenação da Home deve ser limitada ao desktop');
assert(publicJs.includes('layout_home'), 'override de pré-visualização da Home ausente');
assert(publicJs.includes("fetch('/api/layout'"), 'site público deve consultar o layout editorial');
assert(publicJs.includes('minmax(420px, .98fr) minmax(0, 1.02fr)'), 'capa invertida deve preservar proporção das colunas');

assert(homeEditor.includes('Texto à esquerda') && homeEditor.includes('Imagem à esquerda'), 'novo editor não expõe as duas disposições seguras');
assert(homeEditor.includes("url?.pathname === CONTENT_API") && homeEditor.includes("payload?.resource === 'site'"), 'novo editor não integra a disposição ao salvamento normal da Home');
assert(homeEditor.includes('await saveSelectedLayout()'), 'layout deve ser concluído antes de liberar a gravação do conteúdo da Home');
assert(homeEditor.includes("name=\"home-hero-layout\""), 'rádios de disposição da Home ausentes');
assert(!homeEditor.includes('data-layout-save') && !homeEditor.includes('data-layout-preview'), 'novo editor não pode criar botões próprios de salvar ou pré-visualizar');
assert(homeEditor.includes('PASafraHomeEditor'), 'API de pré-visualização do novo editor não foi exposta');

assert(pageActions.includes('PASafraHomeEditor?.applyPreviewParams'), 'Pré-visualizar único não considera a disposição selecionada');
assert(!pageActions.includes('requestSubmit') && !pageActions.includes('stopImmediatePropagation'), 'ações de página não podem recriar/interceptar o submit da Home');
assert(pageActions.includes("preview.textContent = 'Pré-visualizar'") && pageActions.includes("save.textContent = 'Salvar'"), 'padrão único Salvar/Pré-visualizar ausente');

assert(writeQueue.includes("'/api/admin/layout'"), 'layout deve participar da fila serial de gravações');
assert(publicApi.includes('_pa_fresh') && publicApi.includes("'cache-control': 'no-cache, no-store, max-age=0'"), 'API pública de layout deve impedir leitura stale');
assert(adminApi.includes('_pa_fresh') && adminApi.includes("'cache-control': 'no-cache, no-store, max-age=0'"), 'API administrativa deve ler o SHA atual sem cache');
assert(!publicApi.includes('onRequestPut'), 'API pública de layout não pode permitir escrita');
assert(middleware.includes("'/api/admin/layout'"), 'guard da branch deve cobrir escrita do layout');

assert(viteConfig.includes('/admin/home-editor.js'), 'novo controlador da Home não é injetado no build');
assert(viteConfig.includes('/admin/home-editor.css'), 'estilo do novo controlador da Home não é injetado no build');
assert(!viteConfig.includes('/admin/layout-assist.js'), 'build ainda injeta o controlador antigo de layout');
assert(!fs.existsSync(path.join(root, 'public/admin/layout-assist.js')), 'controlador antigo de layout ainda existe no projeto');

console.log('LAYOUT ASSIST TEST: PASS');
console.log('- Home usa um único controlador reconstruído sobre a versão funcional');
console.log('- nenhum botão próprio de salvar/preview é criado pela disposição da capa');
console.log('- o submit original do admin.js não é interceptado por page-actions');
console.log('- layout, conteúdo e estilos continuam serializados pelo pipeline de escrita');
console.log('- leitura pública e administrativa do layout ignora cache stale');
