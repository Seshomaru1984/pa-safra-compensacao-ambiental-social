const DEFAULT_HEADERS = Object.freeze({
  version: 1,
  headers: Object.freeze({
    about: Object.freeze({ color: '#285f52', size: 'normal' }),
    lectures: Object.freeze({ color: '#725a3d', size: 'compact' }),
    gallery: Object.freeze({ color: '#315f69', size: 'normal' }),
    resources: Object.freeze({ color: '#234d63', size: 'compact' }),
    legacy: Object.freeze({ color: '#3f524a', size: 'wide' }),
    extra_pages: Object.freeze({ color: '#49665d', size: 'normal' }),
  }),
});

const DEFINITIONS = Object.freeze([
  { key: 'about', field: '#about-title', title: 'Fundo de Sobre o Projeto', anchor: 'sobre' },
  { key: 'lectures', panel: '#panel-videos', title: 'Fundo de Palestras', anchor: 'palestras' },
  { key: 'gallery', panel: '#panel-galeria', title: 'Fundo da Galeria', anchor: 'galeria' },
  { key: 'resources', panel: '#panel-links', title: 'Fundo de Links úteis', anchor: 'recursos' },
  { key: 'legacy', field: '#legacy-title', title: 'Fundo de Memória e legado', anchor: 'legado' },
  { key: 'extra_pages', panel: '#panel-paginas', title: 'Fundo das páginas extras', anchor: 'inicio' },
]);

const ALLOWED_SIZES = new Set(['compact', 'normal', 'wide']);
let headerState = structuredClone(DEFAULT_HEADERS);
let loading = null;
let writeEnabled = false;

function normalizeEntry(raw, fallback) {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const color = typeof value.color === 'string' && /^#[0-9a-f]{6}$/i.test(value.color) ? value.color.toLowerCase() : fallback.color;
  const size = ALLOWED_SIZES.has(value.size) ? value.size : fallback.size;
  return { color, size };
}

function normalizeHeaders(raw) {
  const headers = raw && typeof raw === 'object' && raw.headers && typeof raw.headers === 'object' ? raw.headers : {};
  return {
    version: 1,
    headers: Object.fromEntries(DEFINITIONS.map(({ key }) => [key, normalizeEntry(headers[key], DEFAULT_HEADERS.headers[key])])),
  };
}

function installStyles() {
  if (document.getElementById('pa-safra-page-header-admin-styles')) return;
  const style = document.createElement('style');
  style.id = 'pa-safra-page-header-admin-styles';
  style.textContent = `
.page-header-assist-card { grid-column: 1 / -1; border-style: dashed; }
.page-header-assist-card h3 { margin: 0 0 5px; font-size: 1.02rem; }
.page-header-assist-card > p { margin: 0 0 14px; color: var(--ink-600); font-size: .88rem; }
.page-header-assist-grid { display: grid; grid-template-columns: minmax(180px, .6fr) minmax(220px, 1fr); gap: 12px; align-items: end; }
.page-header-assist-grid label { margin: 0; }
.page-header-color { width: 100%; min-height: 42px; padding: 4px; }
.page-header-assist-actions { display: flex; gap: 9px; flex-wrap: wrap; align-items: center; margin-top: 14px; }
.page-header-assist-status { margin: 0; color: var(--ink-600); font-size: .84rem; }
@media (max-width: 780px) { .page-header-assist-grid { grid-template-columns: 1fr; } }
`;
  document.head.appendChild(style);
}

async function loadState() {
  if (loading) return loading;
  loading = (async () => {
    try {
      const [headersResponse, statusResponse] = await Promise.all([
        fetch('/api/admin/page-headers', { cache: 'no-store', credentials: 'same-origin' }),
        fetch('/api/admin/status', { cache: 'no-store', credentials: 'same-origin' }),
      ]);
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        writeEnabled = Boolean(status?.write_enabled);
      }
      if (headersResponse.ok) {
        const result = await headersResponse.json();
        if (result?.ok && result.data) return normalizeHeaders(result.data);
      }
    } catch {}

    try {
      const fallback = await fetch('/content/page-headers.json', { cache: 'no-store', credentials: 'same-origin' });
      if (fallback.ok) return normalizeHeaders(await fallback.json());
    } catch {}
    return normalizeHeaders(DEFAULT_HEADERS);
  })();
  headerState = await loading;
  return headerState;
}

function cardMarkup(definition) {
  const entry = headerState.headers[definition.key] || DEFAULT_HEADERS.headers[definition.key];
  return `
    <h3>${definition.title}</h3>
    <p>A estrutura do cabeçalho é padronizada. Aqui você altera apenas a cor de fundo e a altura dentro de três tamanhos seguros.</p>
    <div class="page-header-assist-grid">
      <label>Cor de fundo
        <input class="page-header-color" type="color" data-header-role="color" value="${entry.color}">
      </label>
      <label>Tamanho da faixa
        <select data-header-role="size">
          <option value="compact"${entry.size === 'compact' ? ' selected' : ''}>Compacto</option>
          <option value="normal"${entry.size === 'normal' ? ' selected' : ''}>Normal</option>
          <option value="wide"${entry.size === 'wide' ? ' selected' : ''}>Amplo</option>
        </select>
      </label>
    </div>
    <div class="page-header-assist-actions">
      <button class="button secondary" type="button" data-header-preview>Pré-visualizar</button>
      <button class="button primary write-action" type="button" data-header-save${writeEnabled ? '' : ' disabled'}>Salvar aparência</button>
      <p class="page-header-assist-status" role="status" aria-live="polite"></p>
    </div>`;
}

function readCard(card, fallback) {
  return normalizeEntry({
    color: card.querySelector('[data-header-role="color"]').value,
    size: card.querySelector('[data-header-role="size"]').value,
  }, fallback);
}

function normalizedSlug(value) {
  return String(value || '')
    .trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function previewUrl(definition, entry) {
  const url = new URL('/', window.location.origin);
  url.searchParams.set('header_preview', definition.key);
  url.searchParams.set('header_color', entry.color);
  url.searchParams.set('header_size', entry.size);
  if (definition.key === 'extra_pages') {
    const firstSlug = normalizedSlug(document.querySelector('#pages-editor [data-role="slug"]')?.value);
    url.hash = firstSlug || 'inicio';
  } else {
    url.hash = definition.anchor;
  }
  return url;
}

async function saveHeader(definition, card) {
  const status = card.querySelector('.page-header-assist-status');
  const save = card.querySelector('[data-header-save]');
  const next = structuredClone(headerState);
  next.headers[definition.key] = readCard(card, DEFAULT_HEADERS.headers[definition.key]);
  save.disabled = true;
  status.textContent = 'Salvando aparência…';
  try {
    const response = await fetch('/api/admin/page-headers', {
      method: 'PUT', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: next }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || `Falha ao salvar (${response.status}).`);
    headerState = normalizeHeaders(result.data || next);
    status.textContent = 'Aparência salva. O Preview público já usará essa configuração.';
  } catch (error) {
    status.textContent = error.message || 'Não foi possível salvar a aparência.';
  } finally {
    save.disabled = !writeEnabled;
  }
}

function wireCard(definition, card) {
  card.querySelector('[data-header-preview]').addEventListener('click', () => {
    const entry = readCard(card, DEFAULT_HEADERS.headers[definition.key]);
    window.open(previewUrl(definition, entry).toString(), '_blank', 'noopener');
  });
  card.querySelector('[data-header-save]').addEventListener('click', () => saveHeader(definition, card));
}

function injectControl(definition) {
  if (document.querySelector(`[data-page-header-control="${definition.key}"]`)) return;
  let anchor = null;
  if (definition.field) {
    const field = document.querySelector(definition.field);
    if (!field) return;
    anchor = field.closest('label');
  } else if (definition.panel) {
    const panel = document.querySelector(definition.panel);
    if (!panel) return;
    anchor = panel.querySelector('.panel-heading');
  }
  if (!anchor) return;

  const card = document.createElement('div');
  card.className = 'form-card page-header-assist-card';
  card.dataset.pageHeaderControl = definition.key;
  card.innerHTML = cardMarkup(definition);
  wireCard(definition, card);
  anchor.insertAdjacentElement('afterend', card);
}

async function ensureControls() {
  const app = document.getElementById('admin-app');
  if (!app || app.hidden) return;
  await loadState();
  DEFINITIONS.forEach(injectControl);
}

installStyles();
const app = document.getElementById('admin-app');
if (app) {
  const observer = new MutationObserver(() => { void ensureControls(); });
  observer.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
}
void ensureControls();
