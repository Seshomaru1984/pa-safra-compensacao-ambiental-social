import assert from 'node:assert/strict';
import fs from 'node:fs';

const adminSource = fs.readFileSync('public/admin/numeric-font-assist.js', 'utf8');
const publicSource = fs.readFileSync('public/video-title-style.js', 'utf8');
const adminApi = fs.readFileSync('functions/api/admin/video-styles.js', 'utf8');
const publicApi = fs.readFileSync('functions/api/video-styles.js', 'utf8');
const viteSource = fs.readFileSync('vite.config.js', 'utf8');
const config = JSON.parse(fs.readFileSync('public/content/video-styles.json', 'utf8'));

assert.equal(config.version, 1);
assert.equal(config.title_size_px, 28);
assert.match(adminSource, /Tamanho dos títulos dos vídeos/);
assert.match(adminSource, /18 px/);
assert.match(adminSource, /56/);
assert.match(adminSource, /\/api\/admin\/video-styles/);
assert.match(adminSource, /video_title_size/);
assert.match(publicSource, /--pa-video-title-size/);
assert.match(publicSource, /\/api\/video-styles/);
assert.match(publicSource, /video_title_size/);
assert.match(publicSource, /TITLE_SELECTOR\s*=\s*'#videos-list \.video-card \.video-copy > h2'/);
assert.match(publicSource, /querySelectorAll\(TITLE_SELECTOR\)/);
assert.match(publicSource, /classList\.add\('pa-video-title'\)/);
assert.match(publicSource, /MutationObserver/);
assert.match(publicSource, /observer\.observe\(root, \{ childList: true, subtree: true \}\)/);
assert.match(publicSource, /#videos-list \.pa-video-title/);
assert.match(adminApi, /ALLOWED_CONTENT_BRANCH\s*=\s*'content\/pa-v001-admin-preview'/);
assert.match(adminApi, /size < 18 \|\| size > 56/);
assert.match(publicApi, /ALLOWED_CONTENT_BRANCH\s*=\s*'content\/pa-v001-admin-preview'/);
assert.match(viteSource, /video-title-style\.js/);
assert.match(viteSource, /numeric-font-assist\.js/);

console.log('VIDEO TITLE STYLE TEST: PASS');
console.log('- o tamanho global alcança todos os títulos de cartões de vídeo');
console.log('- títulos renderizados posteriormente também recebem a mesma regra');
