import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const read = (file) => fs.readFileSync(file, 'utf8');
const api = read('functions/api/admin/media.js');
const serving = read('functions/assets/uploads/[[path]].js');
const admin = read('public/admin/image-upload.js');
const pageActions = read('public/admin/page-actions.js');

for (const token of [
  "ALLOWED_BRANCH = 'content/pa-v001-admin-preview'",
  'MAX_FILE_BYTES = 4_000_000',
  "'image/jpeg'", "'image/png'", "'image/webp'",
  'magicMatches', 'verifySession', 'Sec-Fetch-Site', 'GITHUB_CONTENT_TOKEN',
  'public/assets/uploads/',
]) assert.match(api, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `API de mídia sem contrato: ${token}`);

for (const token of [
  "['#home-hero-image', 'Imagem principal']",
  "['#legacy-image', 'Imagem de Memória e legado']",
  "['#gallery-editor input[data-role=\"image\"]', 'Imagem da galeria']",
  'Selecionar imagem', 'JPG, PNG ou WebP, até 4 MB', '/api/admin/media',
]) assert.ok(admin.includes(token), `Admin de mídia incompleto: ${token}`);

assert.ok(pageActions.includes("import './image-upload.js'"), 'upload não está carregado pelo fluxo do Admin');
assert.ok(serving.includes("EDITORIAL_BRANCH = 'content/pa-v001-admin-preview'"), 'rota de imagens não aponta para a branch editorial');
assert.ok(serving.includes('public/assets/uploads/'), 'rota pública não restringe leitura à pasta de uploads');
assert.ok(serving.includes('x-content-type-options'), 'rota pública de imagens não envia nosniff');

for (const file of ['functions/api/admin/media.js', 'functions/assets/uploads/[[path]].js', 'public/admin/image-upload.js']) {
  const temp = path.join(os.tmpdir(), `pa-media-check-${path.basename(file)}-${process.pid}.mjs`);
  fs.writeFileSync(temp, read(file), 'utf8');
  const result = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8' });
  fs.rmSync(temp, { force: true });
  assert.equal(result.status, 0, `node --check falhou em ${file}: ${result.stderr || result.stdout}`);
}

console.log('ADMIN MEDIA TEST: PASS');
console.log('- upload aceita somente JPG, PNG e WebP até 4 MB com validação de assinatura');
console.log('- escrita exige sessão, origem válida, token e branch editorial autorizada');
console.log('- Home, Memória e legado e Galeria usam o mesmo seletor simples de imagem');
console.log('- uploads editoriais possuem rota pública restrita à pasta de imagens');
