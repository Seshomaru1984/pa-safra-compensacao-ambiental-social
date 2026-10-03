import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');
const site = JSON.parse(read('public/content/site.json'));
const adminAssist = read('public/admin/legacy-summary-assist.js');
const publicAssist = read('public/internal-header-body-media.js');
const contentApi = read('functions/api/admin/content.js');
const vite = read('vite.config.js');

assert.equal(typeof site?.legacy?.summary, 'string', 'legacy.summary deve existir como texto no conteúdo editorial');
assert(adminAssist.includes("const FIELD_ID = 'legacy-summary'"), 'Admin não possui campo de Resumo de Memória e legado');
assert(adminAssist.includes('payload.data.legacy.summary = currentSummary()'), 'salvamento do Admin não preserva legacy.summary');
assert(adminAssist.includes("label.append(document.createTextNode('Resumo'))"), 'campo não está identificado como Resumo');
assert(contentApi.includes("'eyebrow', 'title', 'summary', 'body'"), 'API não autoriza legacy.summary');
assert(contentApi.includes("ensureString(site.legacy.summary, 'Resumo do legado', 1200)"), 'API não valida legacy.summary');
assert(publicAssist.includes('configuredSummary'), 'site público não lê o resumo de Memória e legado');
assert(publicAssist.includes("summary.id = 'legacy-summary'"), 'site público não cria o resumo abaixo do título');
assert(publicAssist.includes('summary.hidden = !configuredSummary'), 'resumo vazio deve permanecer oculto');
assert(vite.includes('ADMIN_LEGACY_SUMMARY_TAG'), 'build não injeta o assistente de Resumo no Admin');

console.log('LEGACY SUMMARY ADMIN TEST: PASS');
