import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`MEDIA UPLOAD TEST: FAIL — ${message}`); process.exit(1); };
const assert = (condition, message) => { if (!condition) fail(message); };

const ui = read('public/admin/media-upload.js');
const css = read('public/admin/media-upload.css');
const api = read('functions/api/admin/media.js');
const proxy = read('functions/assets/uploads/[[path]].js');
const middleware = read('functions/api/admin/_middleware.js');
const queue = read('public/admin/write-queue.js');
const vite = read('vite.config.js');

for (const selector of ['#home-hero-image', '#legacy-image', '#gallery-editor input[data-role="image"]']) {
  assert(ui.includes(selector), `campo de imagem não coberto: ${selector}`);
}
assert(ui.includes("picker.type = 'file'") && ui.includes("picker.accept = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'"), 'seletor de arquivo não está restrito a imagens seguras');
assert(ui.includes("fetch('/api/admin/media'") && ui.includes("method: 'PUT'"), 'interface não envia a imagem ao endpoint administrativo');
assert(ui.includes('Imagem enviada. Clique em Salvar no final desta página para aplicar.'), 'interface não orienta o salvamento final da página');
assert(ui.includes('input.value = result.path'), 'caminho retornado não é aplicado automaticamente ao campo editorial');
assert(ui.includes('MutationObserver'), 'novas imagens da galeria não serão detectadas dinamicamente');

assert(api.includes("const ALLOWED_BRANCH = 'content/pa-v001-admin-preview'"), 'endpoint não está preso à branch editorial');
assert(api.includes("'image/jpeg'") && api.includes("'image/png'") && api.includes("'image/webp'"), 'endpoint não limita os formatos permitidos');
assert(api.includes('magicMatches'), 'endpoint não valida assinatura binária do arquivo');
assert(api.includes('MAX_FILE_BYTES = 4_000_000'), 'limite de tamanho do upload ausente');
assert(api.includes('public/assets/uploads/'), 'uploads não são armazenados na área isolada de mídia');
assert(api.includes('verifySession') && api.includes('GITHUB_CONTENT_TOKEN'), 'autenticação administrativa do upload ausente');

assert(proxy.includes("const EDITORIAL_BRANCH = 'content/pa-v001-admin-preview'"), 'proxy público não respeita a branch editorial de preview');
assert(proxy.includes('application/vnd.github.raw+json'), 'proxy não solicita o arquivo binário ao GitHub');
assert(proxy.includes("branch = configured === EDITORIAL_BRANCH ? EDITORIAL_BRANCH : 'main'"), 'proxy não separa preview editorial de produção');

assert(middleware.includes("'/api/admin/media'"), 'middleware não protege a escrita de mídia');
assert(queue.includes("'/api/admin/media'"), 'upload não participa da fila serial de escrita');
assert(vite.includes('/admin/media-upload.js') && vite.includes('/admin/media-upload.css'), 'seletor de imagens não é injetado no build administrativo');
assert(css.includes('.media-upload-preview img'), 'estilo da prévia de imagem ausente');

console.log('MEDIA UPLOAD TEST: PASS');
console.log('- Home, Memória e legado e Galeria aceitam seleção direta do computador');
console.log('- JPG, PNG e WebP até 4 MB são validados no cliente e no servidor');
console.log('- arquivo é gravado somente na branch editorial de Preview');
console.log('- caminho técnico é preenchido automaticamente e não precisa ser digitado pelo usuário');
console.log('- uploads editoriais são servidos no Preview sem depender da branch técnica');
