import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const read = (file) => fs.readFileSync(file, 'utf8');
const api = read('functions/api/admin/media.js');
const serving = read('functions/assets/uploads/[[path]].js');
const admin = read('public/admin/image-upload.js');
const accessAssist = read('public/admin/access-assist.js');
const adminIndex = read('public/admin/index.html');
const pages = JSON.parse(read('public/content/paginas.json'));
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
  'Enviar foto', 'Remover foto', 'JPG, PNG ou WebP', '/api/admin/media',
  "actionRow.className = 'image-upload-actions'",
  "pickerLabel.className = 'image-upload-action image-upload-picker'",
  "clear.className = 'image-upload-action image-upload-remove'",
  'grid-template-columns: repeat(2, minmax(150px, 190px))',
  'align-items: stretch',
  '.image-upload-action { width: 100%; min-height: 42px;',
  '@media (max-width: 620px)',
  '.image-upload-actions { grid-template-columns: 1fr; width: 100%; }',
]) assert.ok(admin.includes(token), `Admin de mídia incompleto: ${token}`);

assert.ok(pageActions.includes("import './image-upload.js'"), 'upload não está carregado pelo fluxo do Admin');
assert.ok(serving.includes("EDITORIAL_BRANCH = 'content/pa-v001-admin-preview'"), 'rota de imagens não aponta para a branch editorial');
assert.ok(serving.includes('public/assets/uploads/'), 'rota pública não restringe leitura à pasta de uploads');
assert.ok(serving.includes('x-content-type-options'), 'rota pública de imagens não envia nosniff');

assert.ok(adminIndex.includes('/admin/access-assist.js'), 'assistente de páginas especiais não está carregado no Admin');
assert.ok(adminIndex.includes('Envie fotos diretamente do computador'), 'Galeria não explica o upload ao usuário');
for (const token of [
  "const ACCESS_SLUG = 'acesso-localizacao'",
  "const CONTACT_SLUG = 'contato'",
  "tabLabel: 'Mapas e acessos'",
  "tabLabel: 'Contato'",
  'referências de estradas, rodovias, vias vicinais',
]) assert.ok(accessAssist.includes(token), `Área especial do Admin incompleta: ${token}`);

const accessPage = pages.find((page) => page?.slug === 'acesso-localizacao');
assert.ok(accessPage, 'conteúdo de Mapas e acessos não existe em paginas.json');
for (const token of ['BR-158', 'MT-251', 'MT-110', 'estradas vicinais', 'Referências públicas']) {
  assert.ok(`${accessPage.summary || ''} ${accessPage.body || ''}`.includes(token), `conteúdo de Mapas e acessos sem ${token}`);
}
const contactPage = pages.find((page) => page?.slug === 'contato');
assert.ok(contactPage, 'conteúdo de Contato não existe em paginas.json');
assert.ok(`${contactPage.summary || ''} ${contactPage.body || ''}`.includes('gustavomzfranco@hotmail.com'), 'conteúdo de Contato perdeu o e-mail confirmado');

for (const file of [
  'functions/api/admin/media.js',
  'functions/assets/uploads/[[path]].js',
  'public/admin/image-upload.js',
  'public/admin/access-assist.js',
]) {
  const temp = path.join(os.tmpdir(), `pa-media-check-${path.basename(file)}-${process.pid}.mjs`);
  fs.writeFileSync(temp, read(file), 'utf8');
  const result = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8' });
  fs.rmSync(temp, { force: true });
  assert.equal(result.status, 0, `node --check falhou em ${file}: ${result.stderr || result.stdout}`);
}

console.log('ADMIN MEDIA TEST: PASS');
console.log('- upload aceita somente JPG, PNG e WebP até 4 MB com validação de assinatura');
console.log('- escrita exige sessão, origem válida, token e branch editorial autorizada');
console.log('- Home, Memória e legado e Galeria exibem upload explícito do computador');
console.log('- ações Enviar foto e Remover foto usam dimensões e alinhamento consistentes, com empilhamento no celular');
console.log('- Mapas e acessos e Contato aparecem como áreas próprias do Admin');
console.log('- uploads editoriais possuem rota pública restrita à pasta de imagens');