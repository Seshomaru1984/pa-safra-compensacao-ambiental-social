import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const fail = (message) => {
  console.error(`EDITORIAL DEMAND TEST: FAIL - ${message}`);
  process.exit(1);
};
const assert = (condition, message) => { if (!condition) fail(message); };
const visibleText = (html = '') => String(html)
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const pages = readJson('public/content/paginas.json');
const site = readJson('public/content/site.json');
const publication = readJson('public/content/publicacao.json');

assert(Array.isArray(pages), 'paginas.json deve ser uma lista');

const access = pages.find((page) => page?.slug === 'acesso-localizacao');
assert(access && access.published !== false, 'página Acesso deve existir e estar publicada');
const accessText = visibleText(`${access.summary || ''} ${access.body || ''}`);
for (const expected of ['Nova Xavantina', 'PA Safra', 'BR-158', 'MT-251', 'MT-110']) {
  assert(accessText.includes(expected), `página Acesso deve mencionar ${expected}`);
}
assert(/estradas vicinais/i.test(accessText), 'página Acesso deve contextualizar o acesso rural por vias vicinais');
assert(/confirmar a rota local atualizada/i.test(accessText), 'página Acesso deve orientar confirmação da rota local');

const contact = pages.find((page) => page?.slug === 'contato');
assert(contact && contact.published !== false, 'página Contato deve existir e estar publicada');
const contactText = visibleText(`${contact.summary || ''} ${contact.body || ''}`);
const email = 'gustavomzfranco@hotmail.com';
assert(contactText.includes(email), 'página Contato deve exibir o e-mail confirmado');
assert(contactText.split(email).length - 1 === 1, 'e-mail deve aparecer uma única vez no texto visível da página');
assert(/por este canal de contato/i.test(contactText), 'texto deve evitar repetir o endereço de e-mail');
assert(/correções, atualizações ou esclarecimentos/i.test(contactText), 'texto aprovado de manifestações e correções deve estar presente');

assert(!/dados de contato serão publicados/i.test(site.footer?.institutional_note || ''), 'rodapé não pode dizer que o contato ainda aguarda publicação');
assert(publication.checks?.dados_contato_confirmados === true, 'gate de dados de contato deve estar confirmado');
for (const pending of ['redacao_juridica_confirmada', 'creditos_imagens_confirmados', 'afirmacoes_historicas_confirmadas', 'revisao_visual_confirmada']) {
  assert(publication.checks?.[pending] === false, `${pending} deve permanecer pendente`);
}

console.log('EDITORIAL DEMAND TEST: PASS');
