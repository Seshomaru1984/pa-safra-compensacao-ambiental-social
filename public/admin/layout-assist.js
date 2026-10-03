const DEFAULT_LAYOUT = {
  version: 1,
  blocks: {
    home_hero: 'image-left',
  },
};

const ALLOWED_LAYOUTS = new Set(['text-left', 'image-left']);
let layoutState = structuredClone(DEFAULT_LAYOUT);
let loading = null;
let writeEnabled = false;
let wrappedTitleApi = false;

function normalizeLayout(raw) {
  const next = structuredClone(DEFAULT_LAYOUT);
  const blocks = raw && typeof raw === 'object' && raw.blocks && typeof raw.blocks === 'object' ? raw.blocks : {};
  if (ALLOWED_LAYOUTS.has(blocks.home_hero)) next.blocks.home_hero = blocks.home_hero;
  return next;
}

function installStyles() {
  if (document.getElementById('pa-safra-layout-admin-styles')) return;
  const style = document.createElement('style');
  style.id = 'pa-safra-layout-admin-styles';
  style.textContent = `
.layout-assist-card { border-style: dashed; }
.layout-assist-card h3 { margin: 0 0 6px; font-size: 1.05rem; }
.layout-assist-card > p { margin: 0 0 16px; color: var(--ink-600); font-size: .9rem; }
.layout-choice-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.layout-choice { position: relative; display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: center; margin: 0; padding: 14px; border: 1px solid var(--line); border-radius: 12px; background: #fff; cursor: pointer; }
.layout-choice:has(input:checked) { border-color: var(--forest-700); box-shadow: 0 0 0 3px rgba(31,89,73,.10); }
.layout-choice input { width: auto; margin: 0; }
.layout-mini { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; width: 62px; height: 38px; padding: 5px; border-radius: 8px; background: var(--sand-100); }
.layout-mini span { border-radius: 4px; background: rgba(31,89,73,.26); }
.layout-mini .image { background: rgba(180,109,63,.42); }
.layout-mini.image-left .image { order: -1; }
.layout-choice strong { display: block; font-size: .9rem; }
.layout-choice small { display: block; margin-top: 2px; color: var(--ink-600); font-weight: 500; }
.layout-assist-status { margin: 12px 0 0; color: var(--ink-600); font-size: .84rem; }
@media (max-width: 680px) { .layout-choice-grid { grid-template-columns: 1fr; } }
`;
  document.head.appendChild(style);
}

async function loadLayout() {
  if (loading) return loading;
  loading = (async () => {
    try {
      const [api, statusResponse] = await Promise.all([
        fetch('/api/admin/layout', { cache: 'no-store', credentials: 'same-origin' }),
        fetch('/api/admin/status', { cache: 'no-store', credentials: 'same-origin' }),
      ]);
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        writeEnabled = Boolean(status?.write_enabled);
      }
      if (api.ok) {
        const result = await api.json();
        if (result?.ok && result.data) return normalizeLayout(result.data);
      }
    } catch {}

    try {
      const fallback = await fetch('/content/layout.json', { cache: 'no-store', credentials: 'same-origin' });
      if (fallback.ok) return normalizeLayout(await fallback.json());
    } catch {}
    return structuredClone(DEFAULT_LAYOUT);
  })();
  layoutState = await loading;
  return layoutState;
}

function selectedLayout() {
  const selected = document.querySelector('input[name="layout-home_hero"]:checked')?.value;
  if (!ALLOWED_LAYOUTS.has(selected)) throw new Error('Escolha uma disposição válida para a capa.');
  return selected;
}

function setStatus(message) {
  const status = document.querySelector('.layout-assist-status');
  if (status) status.textContent = message;
}

async function saveLayout(options = {}) {
  if (!writeEnabled) throw new Error('A publicação da disposição está bloqueada neste ambiente.');
  const next = structuredClone(layoutState);
  next.blocks.home_hero = selectedLayout();
  if (!options.silent) setStatus('Salvando disposição...');

  const response = await fetch('/api/admin/layout', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: next }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || `Falha ao salvar disposição (${response.status}).`);
  layoutState = normalizeLayout(result.data || next);
  if (!options.silent) setStatus('Disposição salva.');
  return layoutState;
}

function choiceMarkup(value, label, description, imageLeft) {
  const id = `layout-home_hero-${value}`;
  const checked = layoutState.blocks.home_hero === value ? ' checked' : '';
  return `
    <label class="layout-choice" for="${id}">
      <input id="${id}" type="radio" name="layout-home_hero" value="${value}"${checked}>
      <span class="layout-mini${imageLeft ? ' image-left' : ''}" aria-hidden="true"><span class="text"></span><span class="image"></span></span>
      <span><strong>${label}</strong><small>${description}</small></span>
    </label>`;
}

function injectControl() {
  const form = document.querySelector('#home-form');
  if (!form || form.querySelector('[data-layout-control="home_hero"]') || !form.children.length) return;
  const card = document.createElement('div');
  card.className = 'form-card layout-assist-card';
  card.dataset.layoutControl = 'home_hero';
  card.innerHTML = `
    <h3>Disposição da capa</h3>
    <p>Escolha a composição. No celular, o conteúdo permanece em uma coluna. A disposição é salva pelo mesmo botão Salvar da página.</p>
    <div class="layout-choice-grid" role="radiogroup" aria-label="Disposição da capa">
      ${choiceMarkup('text-left', 'Texto à esquerda', 'Imagem à direita', false)}
      ${choiceMarkup('image-left', 'Imagem à esquerda', 'Texto à direita', true)}
    </div>
    <p class="layout-assist-status" role="status" aria-live="polite"></p>`;
  const actions = form.querySelector('.form-actions');
  if (actions) actions.before(card);
  else form.appendChild(card);
}

function installTitleApiBridge() {
  if (wrappedTitleApi) return;
  const api = window.PASafraTitleStyles;
  if (!api || typeof api.saveKeys !== 'function') return;
  const originalSaveKeys = api.saveKeys.bind(api);
  window.PASafraTitleStyles = Object.freeze({
    ...api,
    async saveKeys(keys, options = {}) {
      const requested = Array.isArray(keys) ? keys : [keys];
      const titleResult = await originalSaveKeys(keys, options);
      if (requested.includes('home_hero')) await saveLayout(options);
      return titleResult;
    },
  });
  wrappedTitleApi = true;
}

async function ensureControls() {
  const app = document.getElementById('admin-app');
  installTitleApiBridge();
  if (!app || app.hidden) return;
  await loadLayout();
  installTitleApiBridge();
  injectControl();
}

installStyles();
const adminApp = document.getElementById('admin-app');
if (adminApp) {
  const observer = new MutationObserver(() => { void ensureControls(); });
  observer.observe(adminApp, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
}
void ensureControls();
