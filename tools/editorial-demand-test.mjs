import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const readText = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
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
const gallery = readJson('public/content/galeria.json');
const publication = readJson('public/content/publicacao.json');
const imageFallbackScript = readText('public/image-fallback.js');
const legacyMediaScript = readText('public/internal-header-body-media.js');

assert(Array.isArray(pages), 'paginas.json deve ser uma lista');

const access = pages.find((page) => page?.slug === 'acesso-localizacao');
assert(access && access.published !== false, 'página Acesso deve existir e estar publicada');
const accessText = visibleText(`${access.summary || ''} ${access.body || ''}`);
for (const expected of ['Nova Xavantina', 'BR-158', 'MT-251', 'MT-110']) {
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

assert(Array.isArray(gallery), 'galeria.json deve ser uma lista');
assert(!gallery.some((item) => /a confirmar|em conferência/i.test(String(item?.credit || ''))), 'crédito/licença vazio não pode ser substituído por aviso de pendência no conteúdo público');
assert(imageFallbackScript.includes('pendingInfoPattern'), 'higiene pública de informações de imagem deve reconhecer placeholders pendentes');
assert(imageFallbackScript.includes('stripPendingSuffix'), 'legenda estática deve remover somente o sufixo pendente, preservando informação válida');
assert(imageFallbackScript.includes("caption.textContent = cleaned"), 'legenda estática limpa deve manter o texto válido remanescente');
assert(imageFallbackScript.includes("[data-view=\"galeria\"] .status-banner.editorial-warning"), 'aviso editorial de créditos pendentes deve ser removido da Galeria pública');
assert(imageFallbackScript.includes("main?.textContent.trim() === 'Registro do projeto'"), 'galeria deve remover legenda padrão quando não há legenda informada');
assert(imageFallbackScript.includes('if (!caption.textContent.trim()) caption.remove()'), 'galeria deve remover o bloco de informações quando ficar vazio');
assert(legacyMediaScript.includes("site?.legacy?.image_credit || ''"), 'legado deve usar o crédito configurado no conteúdo editorial');
assert(legacyMediaScript.includes('sourceCaption.hidden = !configuredCredit'), 'legado deve ocultar crédito quando o campo estiver vazio');
assert(legacyMediaScript.includes('caption.hidden = !captionHtml'), 'cópia da imagem no corpo deve ocultar a legenda quando não houver informação');
assert((legacyMediaScript.match(/configuredCredit = null;/g) || []).length >= 2, 'falha ao carregar site.json deve preservar estado desconhecido e atribuição estática de fallback');

assert(!/dados de contato serão publicados/i.test(site.footer?.institutional_note || ''), 'rodapé não pode dizer que o contato ainda aguarda publicação');
assert(publication.checks?.dados_contato_confirmados === true, 'gate de dados de contato deve estar confirmado');
for (const pending of ['redacao_juridica_confirmada', 'creditos_imagens_confirmados', 'afirmacoes_historicas_confirmadas', 'revisao_visual_confirmada']) {
  assert(publication.checks?.[pending] === false, `${pending} deve permanecer pendente`);
}

console.log('EDITORIAL DEMAND TEST: PASS');
