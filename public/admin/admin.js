const state = {
  status: null,
  site: null,
  videos: [],
  pages: [],
  highlights: [],
  gallery: [],
  links: { official: [], sources: [] },
};

const paths = {
  site: '/content/site.json',
  videos: '/content/videos.json',
  pages: '/content/paginas.json',
  highlights: '/content/destaques.json',
  gallery: '/content/galeria.json',
  links: '/content/links.json',
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function showMessage(message, type = 'ok') {
  const toast = $('#admin-message');
  toast.textContent = message;
  toast.classList.toggle('error', type === 'error');
  toast.hidden = false;
  window.clearTimeout(showMessage.timer);
  showMessage.timer = window.setTimeout(() => { toast.hidden = true; }, 5000);
}

async function readJson(url, fallback = null) {
  const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
  if (response.status === 404 && fallback !== null) return structuredClone(fallback);
  if (!response.ok) throw new Error(`Falha ao carregar dados (${response.status}).`);
  return response.json();
}

function showLogin(message = '') {
  $('#login-panel').hidden = false;
  $('#admin-app').hidden = true;
  $('#logout-button').hidden = true;
  $('#login-message').textContent = message;
  $('#login-password').value = '';
}

function showAdmin() {
  $('#login-panel').hidden = true;
  $('#admin-app').hidden = false;
  $('#logout-button').hidden = false;
}

function setWriteAvailability() {
  const enabled = Boolean(state.status?.write_enabled);
  $$('.write-action').forEach((button) => { button.disabled = !enabled; });
  const dot = $('#admin-status-dot');
  const title = $('#admin-status-title');
  const message = $('#admin-status-message');
  dot.classList.remove('ready', 'blocked');
  if (enabled) {
    dot.classList.add('ready');
    title.textContent = 'Administração pronta';
  } else {
    dot.classList.add('blocked');
    title.textContent = 'Publicação administrativa bloqueada';
  }
  message.textContent = state.status?.message || 'Configuração administrativa indisponível.';
}

function makeElement(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function fieldInput(root, labelText, id, value = '', options = {}) {
  const label = makeElement('label', options.full ? 'full' : '');
  label.append(document.createTextNode(labelText));
  const input = document.createElement(options.multiline ? 'textarea' : 'input');
  input.id = id;
  input.value = value ?? '';
  if (options.type) input.type = options.type;
  if (options.placeholder) input.placeholder = options.placeholder;
  if (options.maxlength) input.maxLength = options.maxlength;
  if (options.rows && input.tagName === 'TEXTAREA') input.rows = options.rows;
  if (options.required) input.required = true;
  label.appendChild(input);
  root.appendChild(label);
  return input;
}

function fieldSelect(root, labelText, id, value, options, full = false) {
  const label = makeElement('label', full ? 'full' : '');
  label.append(document.createTextNode(labelText));
  const select = document.createElement('select');
  select.id = id;
  options.forEach(([optionValue, text]) => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = text;
    option.selected = optionValue === value;
    select.appendChild(option);
  });
  label.appendChild(select);
  root.appendChild(label);
  return select;
}

function command(editor, name, value = null) {
  editor.focus();
  document.execCommand('styleWithCSS', false, true);
  document.execCommand(name, false, value);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

function richField(root, labelText, id, value = '', options = {}) {
  const wrap = makeElement('div', `rich-field${options.full ? ' full' : ''}`);
  const label = makeElement('div', 'rich-field-label', labelText);
  const toolbar = makeElement('div', 'rich-toolbar');
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', `Formatação de ${labelText}`);
  const editor = makeElement('div', 'rich-editor');
  editor.id = id;
  editor.contentEditable = 'true';
  editor.setAttribute('role', 'textbox');
  editor.setAttribute('aria-multiline', 'true');
  editor.dataset.placeholder = options.placeholder || 'Digite o texto aqui…';
  editor.innerHTML = value || '';

  const buttons = [
    ['B', 'bold', 'Negrito'], ['I', 'italic', 'Itálico'], ['U', 'underline', 'Sublinhado'],
    ['• Lista', 'insertUnorderedList', 'Lista com marcadores'], ['1. Lista', 'insertOrderedList', 'Lista numerada'],
    ['←', 'justifyLeft', 'Alinhar à esquerda'], ['↔', 'justifyCenter', 'Centralizar'], ['→', 'justifyRight', 'Alinhar à direita'], ['☰', 'justifyFull', 'Justificar'],
  ];

  buttons.forEach(([text, cmd, title]) => {
    const button = makeElement('button', '', text);
    button.type = 'button';
    button.title = title;
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => command(editor, cmd));
    toolbar.appendChild(button);
  });

  const separator = makeElement('span', 'separator');
  toolbar.appendChild(separator);

  const size = document.createElement('select');
  size.title = 'Tamanho do texto';
  [['3', 'Normal'], ['2', 'Pequeno'], ['4', 'Grande'], ['5', 'Maior']].forEach(([v, text]) => {
    const option = document.createElement('option');
    option.value = v;
    option.textContent = text;
    size.appendChild(option);
  });
  size.addEventListener('change', () => { command(editor, 'fontSize', size.value); size.value = '3'; });
  toolbar.appendChild(size);

  const color = document.createElement('input');
  color.type = 'color';
  color.value = '#18211e';
  color.title = 'Cor do texto';
  color.addEventListener('input', () => command(editor, 'foreColor', color.value));
  toolbar.appendChild(color);

  const link = makeElement('button', '', 'Link');
  link.type = 'button';
  link.title = 'Adicionar link';
  link.addEventListener('mousedown', (event) => event.preventDefault());
  link.addEventListener('click', () => {
    const url = window.prompt('Endereço do link (https://...)');
    if (url) command(editor, 'createLink', url.trim());
  });
  toolbar.appendChild(link);

  const clear = makeElement('button', '', 'Limpar formato');
  clear.type = 'button';
  clear.addEventListener('mousedown', (event) => event.preventDefault());
  clear.addEventListener('click', () => command(editor, 'removeFormat'));
  toolbar.appendChild(clear);

  wrap.append(label, toolbar, editor);
  root.appendChild(wrap);
  return editor;
}

function checkboxField(root, labelText, checked = true, role = 'published') {
  const label = makeElement('label', 'checkbox-row');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.dataset.role = role;
  label.append(input, document.createTextNode(labelText));
  root.appendChild(label);
  return input;
}

function cardHead(root, title, onRemove) {
  const head = makeElement('div', 'editor-card-head');
  head.appendChild(makeElement('strong', '', title));
  const remove = makeElement('button', 'link-button', 'Remover');
  remove.type = 'button';
  remove.addEventListener('click', onRemove);
  head.appendChild(remove);
  root.appendChild(head);
}

function formActions(form, buttonId) {
  const actions = makeElement('div', 'form-actions align-end');
  const button = makeElement('button', 'button primary write-action', 'Publicar alterações');
  button.id = buttonId;
  button.type = 'submit';
  button.disabled = true;
  actions.appendChild(button);
  form.appendChild(actions);
}

function richValue(id) {
  return $(`#${id}`)?.innerHTML.trim() || '';
}

async function refreshStatus() {
  state.status = await readJson('/api/admin/status').catch(() => ({
    enabled: false, authenticated: false, write_enabled: false,
    message: 'Administração ainda não disponível neste ambiente.',
  }));
  return state.status;
}

async function publish(resource, data) {
  if (!state.status?.write_enabled) throw new Error('A publicação ainda não está habilitada neste ambiente.');
  const response = await fetch('/api/admin/content', {
    method: 'PUT', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ resource, data }),
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 401) {
    state.status = { ...state.status, authenticated: false, write_enabled: false };
    showLogin('Sua sessão expirou. Entre novamente.');
  }
  if (!response.ok || !result.ok) throw new Error(result.error || `Falha ao publicar (${response.status}).`);
  return result;
}

async function publishTitleStyles(keys) {
  const api = window.PASafraTitleStyles;
  if (!api || typeof api.saveKeys !== 'function') return null;
  return api.saveKeys(keys, { silent: true });
}

async function withButton(button, work, successMessage) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Publicando…';
  try {
    await work();
    showMessage(successMessage);
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    button.textContent = original;
    setWriteAvailability();
  }
}

function renderHome() {
  const form = $('#home-form');
  form.replaceChildren();
  const card = makeElement('div', 'form-card');
  const grid = makeElement('div', 'field-grid');
  const site = state.site;
  fieldInput(grid, 'Complemento no cabeçalho', 'home-brand-tagline', site.brand_tagline || '', { maxlength: 160 });
  fieldInput(grid, 'Identificação acima do título', 'home-hero-eyebrow', site.hero?.eyebrow || '', { maxlength: 120 });
  fieldInput(grid, 'Título principal', 'home-hero-title', site.hero?.title || '', { full: true, maxlength: 220, required: true });
  fieldSelect(grid, 'Alinhamento do título', 'home-title-alignment', site.hero?.title_alignment || 'left', [['left', 'Esquerda'], ['center', 'Centralizado'], ['right', 'Direita']]);
  fieldSelect(grid, 'Tamanho do título', 'home-title-size', site.hero?.title_size || 'standard', [['standard', 'Padrão'], ['compact', 'Compacto'], ['small', 'Menor']]);
  richField(grid, 'Texto de apoio', 'home-hero-lead', site.hero?.lead || '', { full: true });
  fieldInput(grid, 'Imagem principal', 'home-hero-image', site.hero?.image || '', { full: true, maxlength: 500 });
  fieldInput(grid, 'Descrição acessível da imagem', 'home-hero-alt', site.hero?.image_alt || '', { full: true, maxlength: 300 });
  fieldInput(grid, 'Rótulo da seção de abertura', 'home-intro-eyebrow', site.home?.intro_eyebrow || '', { maxlength: 120 });
  fieldInput(grid, 'Título da seção de abertura', 'home-intro-title', site.home?.intro_title || '', { maxlength: 220 });
  richField(grid, 'Texto da seção de abertura', 'home-intro-text', site.home?.intro_text || '', { full: true });
  card.appendChild(grid);
  form.appendChild(card);
  formActions(form, 'save-home');
  form.addEventListener('submit', saveHome);
}

async function saveHome(event) {
  event.preventDefault();
  const next = structuredClone(state.site);
  next.brand_tagline = $('#home-brand-tagline').value.trim();
  next.hero = next.hero || {};
  next.hero.eyebrow = $('#home-hero-eyebrow').value.trim();
  next.hero.title = $('#home-hero-title').value.trim();
  next.hero.lead = richValue('home-hero-lead');
  next.hero.title_alignment = $('#home-title-alignment').value;
  next.hero.title_size = $('#home-title-size').value;
  next.hero.image = $('#home-hero-image').value.trim();
  next.hero.image_alt = $('#home-hero-alt').value.trim();
  next.home = next.home || {};
  next.home.intro_eyebrow = $('#home-intro-eyebrow').value.trim();
  next.home.intro_title = $('#home-intro-title').value.trim();
  next.home.intro_text = richValue('home-intro-text');
  const button = $('#save-home');
  await withButton(button, async () => {
    await Promise.all([publish('site', next), publishTitleStyles(['home_hero', 'home_intro'])]);
    state.site = next;
    renderHome();
  }, 'Página inicial enviada para publicação.');
}

function renderAbout() {
  const form = $('#about-form');
  form.replaceChildren();
  const card = makeElement('div', 'form-card');
  const grid = makeElement('div', 'field-grid');
  fieldInput(grid, 'Título', 'about-title', state.site.about?.title || '', { full: true, maxlength: 180 });
  richField(grid, 'Resumo', 'about-summary', state.site.about?.summary || '', { full: true });
  richField(grid, 'Texto completo', 'about-body-editor', state.site.about?.body || '', { full: true });
  card.appendChild(grid);
  form.appendChild(card);
  formActions(form, 'save-about');
  form.addEventListener('submit', saveAbout);
}

async function saveAbout(event) {
  event.preventDefault();
  const next = structuredClone(state.site);
  next.about = next.about || {};
  next.about.title = $('#about-title').value.trim();
  next.about.summary = richValue('about-summary');
  next.about.body = richValue('about-body-editor');
  const button = $('#save-about');
  await withButton(button, async () => {
    await Promise.all([publish('site', next), publishTitleStyles(['about_hero'])]);
    state.site = next;
    renderAbout();
  }, 'Texto institucional enviado para publicação.');
}

function highlightCard(item = {}, index = 0) {
  const card = makeElement('article', 'editor-card');
  cardHead(card, `Destaque ${index + 1}`, () => { card.remove(); renumberCards('#highlights-editor', 'Destaque'); });
  const grid = makeElement('div', 'field-grid');
  fieldInput(grid, 'Número', `highlight-number-${index}`, item.number || '', { maxlength: 12 });
  fieldInput(grid, 'Título', `highlight-title-${index}`, item.title || '', { maxlength: 220, required: true });
  const rich = richField(grid, 'Texto', `highlight-text-${index}`, item.text || '', { full: true });
  rich.dataset.role = 'text';
  grid.querySelector(`#highlight-number-${index}`).dataset.role = 'number';
  grid.querySelector(`#highlight-title-${index}`).dataset.role = 'title';
  card.appendChild(grid);
  checkboxField(card, 'Mostrar no site', item.published !== false);
  return card;
}

function videoCard(item = {}, index = 0) {
  const card = makeElement('article', 'editor-card');
  cardHead(card, `Palestra ${index + 1}`, () => { card.remove(); renumberCards('#videos-editor', 'Palestra'); });
  const grid = makeElement('div', 'field-grid');
  const title = fieldInput(grid, 'Título', `video-title-${index}`, item.title || '', { maxlength: 220, required: true });
  title.dataset.role = 'title';
  const url = fieldInput(grid, 'Link do YouTube', `video-url-${index}`, item.youtube_url || '', { type: 'url', maxlength: 500, required: true });
  url.dataset.role = 'url';
  const rich = richField(grid, 'Descrição', `video-description-${index}`, item.description || '', { full: true });
  rich.dataset.role = 'description';
  card.appendChild(grid);
  checkboxField(card, 'Mostrar no site', item.published !== false);
  return card;
}

function galleryCard(item = {}, index = 0) {
  const card = makeElement('article', 'editor-card');
  cardHead(card, `Imagem ${index + 1}`, () => { card.remove(); renumberCards('#gallery-editor', 'Imagem'); });
  const grid = makeElement('div', 'field-grid');
  const image = fieldInput(grid, 'Arquivo da imagem', `gallery-image-${index}`, item.image || '', { full: true, maxlength: 500 }); image.dataset.role = 'image';
  const alt = fieldInput(grid, 'Descrição acessível', `gallery-alt-${index}`, item.image_alt || '', { full: true, maxlength: 500 }); alt.dataset.role = 'alt';
  const caption = fieldInput(grid, 'Legenda', `gallery-caption-${index}`, item.caption || '', { full: true, multiline: true, rows: 2, maxlength: 1000 }); caption.dataset.role = 'caption';
  const credit = fieldInput(grid, 'Crédito/licença', `gallery-credit-${index}`, item.credit || '', { full: true, multiline: true, rows: 2, maxlength: 1200 }); credit.dataset.role = 'credit';
  card.appendChild(grid);
  checkboxField(card, 'Mostrar no site', item.published !== false);
  return card;
}

function officialLinkCard(item = {}, index = 0) {
  const card = makeElement('article', 'editor-card');
  cardHead(card, `Link ${index + 1}`, () => card.remove());
  const grid = makeElement('div', 'field-grid');
  const acronym = fieldInput(grid, 'Sigla', `official-acronym-${index}`, item.acronym || '', { maxlength: 40 }); acronym.dataset.role = 'acronym';
  const title = fieldInput(grid, 'Nome', `official-title-${index}`, item.title || '', { maxlength: 260, required: true }); title.dataset.role = 'title';
  const url = fieldInput(grid, 'Endereço', `official-url-${index}`, item.url || '', { full: true, type: 'url', maxlength: 800, required: true }); url.dataset.role = 'url';
  const rich = richField(grid, 'Descrição', `official-description-${index}`, item.description || '', { full: true }); rich.dataset.role = 'description';
  card.appendChild(grid);
  checkboxField(card, 'Mostrar no site', item.published !== false);
  return card;
}

function sourceLinkCard(item = {}, index = 0) {
  const card = makeElement('article', 'editor-card');
  cardHead(card, `Fonte ${index + 1}`, () => card.remove());
  const grid = makeElement('div', 'field-grid');
  const label = fieldInput(grid, 'Nome da fonte', `source-label-${index}`, item.label || '', { maxlength: 260, required: true }); label.dataset.role = 'label';
  const url = fieldInput(grid, 'Endereço', `source-url-${index}`, item.url || '', { type: 'url', maxlength: 800, required: true }); url.dataset.role = 'url';
  card.appendChild(grid);
  checkboxField(card, 'Mostrar no site', item.published !== false);
  return card;
}

function pageCard(item = {}, index = 0) {
  const card = makeElement('article', 'editor-card');
  cardHead(card, `Página ${index + 1}`, () => { card.remove(); renumberCards('#pages-editor', 'Página'); });
  const grid = makeElement('div', 'field-grid');
  const slug = fieldInput(grid, 'Identificador curto', `page-slug-${index}`, item.slug || '', { maxlength: 80, required: true }); slug.dataset.role = 'slug';
  const nav = fieldInput(grid, 'Nome no menu', `page-nav-${index}`, item.nav_label || '', { maxlength: 80, required: true }); nav.dataset.role = 'nav';
  const eyebrow = fieldInput(grid, 'Rótulo', `page-eyebrow-${index}`, item.eyebrow || '', { maxlength: 120 }); eyebrow.dataset.role = 'eyebrow';
  const title = fieldInput(grid, 'Título', `page-title-${index}`, item.title || '', { maxlength: 220, required: true }); title.dataset.role = 'title';
  const summary = richField(grid, 'Resumo', `page-summary-${index}`, item.summary || '', { full: true }); summary.dataset.role = 'summary';
  const body = richField(grid, 'Conteúdo', `page-body-${index}`, item.body || '', { full: true }); body.dataset.role = 'body';
  card.appendChild(grid);
  checkboxField(card, 'Mostrar no site', item.published !== false);
  return card;
}

function renumberCards(rootSelector, prefix) {
  $$('.editor-card', $(rootSelector)).forEach((card, index) => {
    const title = $('.editor-card-head strong', card);
    if (title) title.textContent = `${prefix} ${index + 1}`;
  });
}

function renderLists() {
  const highlights = $('#highlights-editor'); highlights.replaceChildren();
  state.highlights.forEach((item, index) => highlights.appendChild(highlightCard(item, index)));
  if (!state.highlights.length) highlights.appendChild(makeElement('p', 'empty-editor-state', 'Nenhum destaque cadastrado.'));

  const videos = $('#videos-editor'); videos.replaceChildren();
  state.videos.forEach((item, index) => videos.appendChild(videoCard(item, index)));
  if (!state.videos.length) videos.appendChild(makeElement('p', 'empty-editor-state', 'Nenhuma palestra cadastrada.'));

  const gallery = $('#gallery-editor'); gallery.replaceChildren();
  state.gallery.forEach((item, index) => gallery.appendChild(galleryCard(item, index)));
  if (!state.gallery.length) gallery.appendChild(makeElement('p', 'empty-editor-state', 'Nenhuma imagem cadastrada.'));

  const official = $('#official-links-editor'); official.replaceChildren();
  state.links.official.forEach((item, index) => official.appendChild(officialLinkCard(item, index)));
  if (!state.links.official.length) official.appendChild(makeElement('p', 'empty-editor-state', 'Nenhum link cadastrado.'));

  const sources = $('#source-links-editor'); sources.replaceChildren();
  state.links.sources.forEach((item, index) => sources.appendChild(sourceLinkCard(item, index)));
  if (!state.links.sources.length) sources.appendChild(makeElement('p', 'empty-editor-state', 'Nenhuma fonte cadastrada.'));

  const pages = $('#pages-editor'); pages.replaceChildren();
  state.pages.forEach((item, index) => pages.appendChild(pageCard(item, index)));
  if (!state.pages.length) pages.appendChild(makeElement('p', 'empty-editor-state', 'Nenhuma página extra cadastrada.'));
}

function removeEmptyState(root) {
  $('.empty-editor-state', root)?.remove();
}

function renderLegacy() {
  const form = $('#legacy-form'); form.replaceChildren();
  const card = makeElement('div', 'form-card');
  const grid = makeElement('div', 'field-grid');
  const legacy = state.site.legacy || {};
  fieldInput(grid, 'Rótulo', 'legacy-eyebrow', legacy.eyebrow || '', { maxlength: 120 });
  fieldInput(grid, 'Título', 'legacy-title', legacy.title || '', { maxlength: 220 });
  richField(grid, 'Texto principal', 'legacy-body', legacy.body || '', { full: true });
  fieldInput(grid, 'Frase de encerramento', 'legacy-closing', legacy.closing_quote || '', { full: true, multiline: true, rows: 3, maxlength: 2000 });
  fieldInput(grid, 'Imagem', 'legacy-image', legacy.image || '', { full: true, maxlength: 500 });
  fieldInput(grid, 'Descrição acessível da imagem', 'legacy-image-alt', legacy.image_alt || '', { full: true, maxlength: 500 });
  fieldInput(grid, 'Crédito da imagem', 'legacy-image-credit', legacy.image_credit || '', { full: true, maxlength: 1000 });
  fieldInput(grid, 'Rótulo da referência', 'legacy-source-eyebrow', legacy.source_eyebrow || '', { maxlength: 120 });
  fieldInput(grid, 'Título da referência', 'legacy-source-title', legacy.source_title || '', { maxlength: 220 });
  fieldInput(grid, 'Texto da referência', 'legacy-source-body', legacy.source_body || '', { full: true, multiline: true, rows: 4, maxlength: 5000 });
  fieldInput(grid, 'Endereço da referência', 'legacy-source-url', legacy.source_url || '', { full: true, type: 'url', maxlength: 800 });
  fieldInput(grid, 'Texto do botão', 'legacy-source-label', legacy.source_link_label || '', { maxlength: 180 });
  fieldInput(grid, 'Nota de validação', 'legacy-validation-note', legacy.validation_note || '', { full: true, multiline: true, rows: 4, maxlength: 5000 });
  card.appendChild(grid); form.appendChild(card); formActions(form, 'save-legacy');
  form.addEventListener('submit', saveLegacy);
}

async function saveLegacy(event) {
  event.preventDefault();
  const next = structuredClone(state.site);
  next.legacy = {
    eyebrow: $('#legacy-eyebrow').value.trim(), title: $('#legacy-title').value.trim(), body: richValue('legacy-body'),
    closing_quote: $('#legacy-closing').value.trim(), image: $('#legacy-image').value.trim(), image_alt: $('#legacy-image-alt').value.trim(),
    image_credit: $('#legacy-image-credit').value.trim(), source_eyebrow: $('#legacy-source-eyebrow').value.trim(),
    source_title: $('#legacy-source-title').value.trim(), source_body: $('#legacy-source-body').value.trim(), source_url: $('#legacy-source-url').value.trim(),
    source_link_label: $('#legacy-source-label').value.trim(), validation_note: $('#legacy-validation-note').value.trim(),
  };
  const button = $('#save-legacy');
  await withButton(button, async () => {
    await Promise.all([publish('site', next), publishTitleStyles(['legacy_hero'])]);
    state.site = next;
    renderLegacy();
  }, 'Memória e legado enviados para publicação.');
}

function renderAppearance() {
  const form = $('#appearance-form'); form.replaceChildren();
  const card = makeElement('div', 'form-card');
  const grid = makeElement('div', 'field-grid');
  fieldInput(grid, 'Nome do portal', 'appearance-brand-name', state.site.brand_name || '', { maxlength: 80 });
  fieldInput(grid, 'Título da aba do navegador', 'appearance-page-title', state.site.page_title || '', { maxlength: 180 });
  fieldInput(grid, 'Descrição do portal', 'appearance-description', state.site.description || '', { full: true, multiline: true, rows: 3, maxlength: 500 });
  fieldInput(grid, 'Cor principal', 'appearance-primary', state.site.theme?.primary || '#1f5949', { type: 'color' });
  fieldInput(grid, 'Cor de destaque', 'appearance-accent', state.site.theme?.accent || '#b46d3f', { type: 'color' });
  richField(grid, 'Homenagem do rodapé', 'appearance-dedication', state.site.footer?.dedication || '', { full: true });
  richField(grid, 'Nota institucional', 'appearance-note', state.site.footer?.institutional_note || '', { full: true });
  card.appendChild(grid); form.appendChild(card); formActions(form, 'save-appearance');
  form.addEventListener('submit', saveAppearance);
}

async function saveAppearance(event) {
  event.preventDefault();
  const next = structuredClone(state.site);
  next.brand_name = $('#appearance-brand-name').value.trim();
  next.page_title = $('#appearance-page-title').value.trim();
  next.description = $('#appearance-description').value.trim();
  next.theme = { primary: $('#appearance-primary').value, accent: $('#appearance-accent').value };
  next.footer = { dedication: richValue('appearance-dedication'), institutional_note: richValue('appearance-note') };
  const button = $('#save-appearance');
  await withButton(button, async () => { await publish('site', next); state.site = next; renderAppearance(); }, 'Aparência e rodapé enviados para publicação.');
}

function collectCards(rootSelector, mapper) {
  return $$('.editor-card', $(rootSelector)).map(mapper);
}

async function saveHighlights() {
  const next = collectCards('#highlights-editor', (card) => ({
    number: $('[data-role="number"]', card).value.trim(), title: $('[data-role="title"]', card).value.trim(),
    text: $('[data-role="text"]', card).innerHTML.trim(), published: $('[data-role="published"]', card).checked,
  }));
  if (next.some((item) => !item.title)) return showMessage('Preencha o título de todos os destaques.', 'error');
  await withButton($('#save-highlights'), async () => { await publish('highlights', next); state.highlights = next; renderLists(); }, 'Destaques enviados para publicação.');
}

async function saveVideos() {
  const next = collectCards('#videos-editor', (card) => ({
    title: $('[data-role="title"]', card).value.trim(), youtube_url: $('[data-role="url"]', card).value.trim(),
    description: $('[data-role="description"]', card).innerHTML.trim(), published: $('[data-role="published"]', card).checked,
  }));
  if (next.some((item) => !item.title || !item.youtube_url)) return showMessage('Preencha título e link em todas as palestras.', 'error');
  await withButton($('#save-videos'), async () => {
    await Promise.all([publish('videos', next), publishTitleStyles(['lectures_hero'])]);
    state.videos = next;
    renderLists();
  }, 'Palestras enviadas para publicação.');
}

async function saveGallery() {
  const next = collectCards('#gallery-editor', (card) => ({
    image: $('[data-role="image"]', card).value.trim(), image_alt: $('[data-role="alt"]', card).value.trim(),
    caption: $('[data-role="caption"]', card).value.trim(), credit: $('[data-role="credit"]', card).value.trim(),
    published: $('[data-role="published"]', card).checked,
  }));
  if (next.some((item) => !item.image)) return showMessage('Informe o arquivo de todas as imagens.', 'error');
  await withButton($('#save-gallery'), async () => {
    await Promise.all([publish('gallery', next), publishTitleStyles(['gallery_hero'])]);
    state.gallery = next;
    renderLists();
  }, 'Galeria enviada para publicação.');
}

async function saveLinks() {
  const next = {
    official: collectCards('#official-links-editor', (card) => ({
      acronym: $('[data-role="acronym"]', card).value.trim(), title: $('[data-role="title"]', card).value.trim(),
      description: $('[data-role="description"]', card).innerHTML.trim(), url: $('[data-role="url"]', card).value.trim(),
      published: $('[data-role="published"]', card).checked,
    })),
    sources: collectCards('#source-links-editor', (card) => ({
      label: $('[data-role="label"]', card).value.trim(), url: $('[data-role="url"]', card).value.trim(),
      published: $('[data-role="published"]', card).checked,
    })),
  };
  if (next.official.some((item) => !item.title || !item.url) || next.sources.some((item) => !item.label || !item.url)) return showMessage('Preencha nome e endereço de todos os links.', 'error');
  await withButton($('#save-links'), async () => {
    await Promise.all([publish('links', next), publishTitleStyles(['resources_hero'])]);
    state.links = next;
    renderLists();
  }, 'Links úteis enviados para publicação.');
}

async function savePages() {
  const next = collectCards('#pages-editor', (card) => ({
    slug: $('[data-role="slug"]', card).value.trim().toLowerCase(), nav_label: $('[data-role="nav"]', card).value.trim(),
    eyebrow: $('[data-role="eyebrow"]', card).value.trim(), title: $('[data-role="title"]', card).value.trim(),
    summary: $('[data-role="summary"]', card).innerHTML.trim(), body: $('[data-role="body"]', card).innerHTML.trim(),
    published: $('[data-role="published"]', card).checked,
  }));
  if (next.some((item) => !item.slug || !item.nav_label || !item.title)) return showMessage('Preencha identificador, nome no menu e título de todas as páginas.', 'error');
  await withButton($('#save-pages'), async () => {
    await Promise.all([publish('pages', next), publishTitleStyles(['extra_pages'])]);
    state.pages = next;
    renderLists();
  }, 'Páginas extras enviadas para publicação.');
}

async function loadEditableContent() {
  const [site, videos, pages, highlights, gallery, links] = await Promise.all([
    readJson(paths.site), readJson(paths.videos, []), readJson(paths.pages, []),
    readJson(paths.highlights, []), readJson(paths.gallery, []), readJson(paths.links, { official: [], sources: [] }),
  ]);
  state.site = site;
  state.videos = Array.isArray(videos) ? videos : [];
  state.pages = Array.isArray(pages) ? pages : [];
  state.highlights = Array.isArray(highlights) ? highlights : [];
  state.gallery = Array.isArray(gallery) ? gallery : [];
  state.links = links && typeof links === 'object' ? links : { official: [], sources: [] };
  state.links.official = Array.isArray(state.links.official) ? state.links.official : [];
  state.links.sources = Array.isArray(state.links.sources) ? state.links.sources : [];
  renderHome(); renderAbout(); renderLists(); renderLegacy(); renderAppearance();
  setWriteAvailability();
}

async function login(event) {
  event.preventDefault();
  const button = $('#login-button');
  const username = $('#login-user').value.trim();
  const password = $('#login-password').value;
  $('#login-message').textContent = '';
  button.disabled = true; button.textContent = 'Entrando…';
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível entrar.');
    $('#login-password').value = '';
    await refreshStatus();
    if (!state.status?.authenticated) throw new Error('Sessão não confirmada pelo servidor.');
    await loadEditableContent();
    showAdmin(); setWriteAvailability();
  } catch (error) { showLogin(error.message); }
  finally { button.disabled = false; button.textContent = 'Entrar'; }
}

async function logout() {
  const button = $('#logout-button');
  button.disabled = true;
  try {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: '{}' });
  } finally {
    Object.assign(state, { status: null, site: null, videos: [], pages: [], highlights: [], gallery: [], links: { official: [], sources: [] } });
    showLogin('Sessão encerrada.');
    button.disabled = false;
  }
}

function bindTabs() {
  $$('.tab').forEach((tab) => tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    $$('.tab').forEach((node) => node.classList.toggle('is-active', node === tab));
    $$('[data-panel]').forEach((panel) => {
      const active = panel.dataset.panel === target;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
  }));
}

function bindListActions() {
  $('#add-highlight').addEventListener('click', () => { const root = $('#highlights-editor'); removeEmptyState(root); root.appendChild(highlightCard({}, $$('.editor-card', root).length)); });
  $('#add-video').addEventListener('click', () => { const root = $('#videos-editor'); removeEmptyState(root); root.appendChild(videoCard({}, $$('.editor-card', root).length)); });
  $('#add-gallery').addEventListener('click', () => { const root = $('#gallery-editor'); removeEmptyState(root); root.appendChild(galleryCard({}, $$('.editor-card', root).length)); });
  $('#add-official-link').addEventListener('click', () => { const root = $('#official-links-editor'); removeEmptyState(root); root.appendChild(officialLinkCard({}, $$('.editor-card', root).length)); });
  $('#add-source-link').addEventListener('click', () => { const root = $('#source-links-editor'); removeEmptyState(root); root.appendChild(sourceLinkCard({}, $$('.editor-card', root).length)); });
  $('#add-page').addEventListener('click', () => { const root = $('#pages-editor'); removeEmptyState(root); root.appendChild(pageCard({}, $$('.editor-card', root).length)); });
  $('#save-highlights').addEventListener('click', saveHighlights);
  $('#save-videos').addEventListener('click', saveVideos);
  $('#save-gallery').addEventListener('click', saveGallery);
  $('#save-links').addEventListener('click', saveLinks);
  $('#save-pages').addEventListener('click', savePages);
}

async function boot() {
  bindTabs(); bindListActions();
  $('#login-form').addEventListener('submit', login);
  $('#logout-button').addEventListener('click', logout);
  try {
    await refreshStatus();
    if (state.status?.authenticated) {
      await loadEditableContent();
      showAdmin(); setWriteAvailability();
      return;
    }
    showLogin(state.status?.message || 'Informe usuário e senha para acessar.');
  } catch (error) { showLogin(error.message); }
}

boot();
