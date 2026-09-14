const DEFAULT_LAYOUT = {
  version: 1,
  blocks: {
    home_hero: 'text-left',
  },
};

const ALLOWED_LAYOUTS = new Set(['text-left', 'image-left']);
const BLOCKS = [
  { key: 'home_hero', form: '#home-form', title: 'Disposição da capa' },
];

let layoutState = structuredClone(DEFAULT_LAYOUT);
let loading = null;

function normalizeLayout(raw) {
  const next = structuredClone(DEFAULT_LAYOUT);
  const blocks = raw && typeof raw === 'object' && raw.blocks && typeof raw.blocks === 'object' ? raw.blocks : {};
  for (const key of Object.keys(next.blocks)) {
    if (ALLOWED_LAYOUTS.has(blocks[key])) next.blocks[key] = blocks[key];
  }
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
.layout-assist-status { margin: 14px 0 0; color: var(--ink-600); font-size: .84rem; }
@media (max-width: 680px) { .layout-choice-grid { grid-template-columns: 1fr; } }
`;
  document.head.appendChild(style);
}

async function loadLayout() {
  if (loading) return loading;
  loading = (async () => {
    try {
      const api = await fetch('/api/admin/layout', { cache: 'no-store', credentials: 'same-origin' });
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

function choiceMarkup(key, value, label, description, imageLeft) {
  const id = `layout-${key}-${value}`;
  const checked = layoutState.blocks[key] === value ? ' checked' : '';
  return `
    <label class="layout-choice" for="${id}">
      <input id="${id}" type="radio" name="layout-${key}" value="${value}"${checked}>
      <span class="layout-mini${imageLeft ? ' image-left' : ''}" aria-hidden="true"><span class="text"></span><span class="image"></span></span>
      <span><strong>${label}</strong><small>${description}</small></span>
    </label>`;
}

function controlFor(key) {
  return document.querySelector(`[data-layout-control="${key}"]`);
}

function selectedLayout(key) {
  const card = controlFor(key);
  const selected = card?.querySelector(`input[name="layout-${key}"]:checked`)?.value;
  return ALLOWED_LAYOUTS.has(selected) ? selected : layoutState.blocks[key];
}

function setStatus(key, message, isError = false) {
  const status = controlFor(key)?.querySelector('.layout-assist-status');
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? '#8a2f2f' : '';
}

async function saveSelected({ silent = false } = {}) {
  await loadLayout();
  const key = 'home_hero';
  const selected = selectedLayout(key);
  if (!ALLOWED_LAYOUTS.has(selected)) throw new Error('Disposição da capa inválida.');

  if (selected === layoutState.blocks[key]) {
    if (!silent) setStatus(key, 'Disposição já está salva.');
    return { ok: true, data: structuredClone(layoutState), unchanged: true };
  }

  const next = structuredClone(layoutState);
  next.blocks[key] = selected;
  if (!silent) setStatus(key, 'Salvando disposição junto com a página…');

  const response = await fetch('/api/admin/layout', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: next }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    const error = new Error(result.error || `Falha ao salvar a disposição (${response.status}).`);
    if (!silent) setStatus(key, error.message, true);
    throw error;
  }

  layoutState = normalizeLayout(result.data || next);
  if (!silent) setStatus(key, 'Disposição salva junto com a página.');
  return result;
}

function applyPreviewParams(url) {
  const target = url instanceof URL ? url : new URL(String(url), window.location.origin);
  const selected = selectedLayout('home_hero');
  if (ALLOWED_LAYOUTS.has(selected)) target.searchParams.set('layout_home', selected);
  return target;
}

function injectControl(definition) {
  const form = document.querySelector(definition.form);
  if (!form || form.querySelector(`[data-layout-control="${definition.key}"]`)) return;
  if (!form.children.length) return;

  const card = document.createElement('div');
  card.className = 'form-card layout-assist-card';
  card.dataset.layoutControl = definition.key;
  card.innerHTML = `
    <h3>${definition.title}</h3>
    <p>Escolha apenas entre composições seguras. No celular, o conteúdo continua em uma coluna para preservar a leitura.</p>
    <div class="layout-choice-grid" role="radiogroup" aria-label="${definition.title}">
      ${choiceMarkup(definition.key, 'text-left', 'Texto à esquerda', 'Imagem à direita', false)}
      ${choiceMarkup(definition.key, 'image-left', 'Imagem à esquerda', 'Texto à direita', true)}
    </div>
    <p class="layout-assist-status" role="status" aria-live="polite">A disposição é salva pelo botão Salvar no final desta página.</p>`;

  card.addEventListener('change', (event) => {
    if (event.target?.matches(`input[name="layout-${definition.key}"]`)) {
      setStatus(definition.key, 'Alteração de disposição pendente. Use Salvar no final da página.');
    }
  });

  const actions = form.querySelector('.form-actions');
  if (actions) actions.before(card);
  else form.appendChild(card);
}

async function ensureControls() {
  const app = document.getElementById('admin-app');
  if (!app || app.hidden) return;
  await loadLayout();
  for (const definition of BLOCKS) injectControl(definition);
}

window.PASafraLayout = Object.freeze({
  saveSelected,
  getSelected: () => selectedLayout('home_hero'),
  applyPreviewParams,
});

installStyles();
const adminApp = document.getElementById('admin-app');
if (adminApp) {
  const observer = new MutationObserver(() => { void ensureControls(); });
  observer.observe(adminApp, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
}
void ensureControls();
