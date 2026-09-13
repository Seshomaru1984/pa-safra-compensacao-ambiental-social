const DEFAULT_ENTRY = Object.freeze({
  size: 'default',
  align: 'default',
  color: 'default',
  weight: 'default',
  italic: false,
});

const TARGETS = Object.freeze([
  { key: 'home_hero', field: '#home-hero-title', title: 'Formatação do título principal', anchor: '#inicio' },
  { key: 'home_intro', field: '#home-intro-title', title: 'Formatação do título da seção de abertura', anchor: '#inicio' },
  { key: 'about_hero', field: '#about-title', title: 'Formatação do título de Sobre o Projeto', anchor: '#sobre' },
  { key: 'lectures_hero', panel: '#panel-videos', title: 'Formatação do título da página Palestras', anchor: '#palestras' },
  { key: 'gallery_hero', panel: '#panel-galeria', title: 'Formatação do título da Galeria', anchor: '#galeria' },
  { key: 'resources_hero', panel: '#panel-links', title: 'Formatação do título de Links úteis', anchor: '#recursos' },
  { key: 'legacy_hero', field: '#legacy-title', title: 'Formatação do título de Memória e legado', anchor: '#legado' },
  { key: 'extra_pages', panel: '#panel-paginas', title: 'Formatação dos títulos das páginas extras', anchor: '#inicio' },
]);

const ALLOWED_SIZES = new Set(['default', 'small', 'medium', 'large', 'display']);
const ALLOWED_ALIGNS = new Set(['default', 'left', 'center', 'right']);
const ALLOWED_WEIGHTS = new Set(['default', 'regular', 'semibold', 'bold']);

let titleState = {
  version: 1,
  titles: Object.fromEntries(TARGETS.map(({ key }) => [key, structuredClone(DEFAULT_ENTRY)])),
};
let loading = null;
let writeEnabled = false;

function validColor(value) {
  return value === 'default' || (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value));
}

function normalizeEntry(raw) {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    size: ALLOWED_SIZES.has(value.size) ? value.size : DEFAULT_ENTRY.size,
    align: ALLOWED_ALIGNS.has(value.align) ? value.align : DEFAULT_ENTRY.align,
    color: validColor(value.color) ? value.color.toLowerCase() : DEFAULT_ENTRY.color,
    weight: ALLOWED_WEIGHTS.has(value.weight) ? value.weight : DEFAULT_ENTRY.weight,
    italic: value.italic === true,
  };
}

function normalizeStyles(raw) {
  const titles = raw && typeof raw === 'object' && raw.titles && typeof raw.titles === 'object' ? raw.titles : {};
  return {
    version: 1,
    titles: Object.fromEntries(TARGETS.map(({ key }) => [key, normalizeEntry(titles[key])])),
  };
}

function installStyles() {
  if (document.getElementById('pa-safra-title-admin-styles')) return;
  const style = document.createElement('style');
  style.id = 'pa-safra-title-admin-styles';
  style.textContent = `
.title-assist-card { grid-column: 1 / -1; border-style: dashed; }
.title-assist-card h3 { margin: 0 0 5px; font-size: 1.02rem; }
.title-assist-card > p { margin: 0 0 14px; color: var(--ink-600); font-size: .88rem; }
.title-assist-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.title-assist-grid label { margin: 0; }
.title-color-row { display: flex; gap: 10px; align-items: center; min-height: 42px; }
.title-color-row input[type="checkbox"] { width: auto; margin: 0; }
.title-color-row input[type="color"] { width: 54px; min-height: 38px; padding: 3px; }
.title-style-check { display: flex; gap: 8px; align-items: center; min-height: 42px; }
.title-style-check input { width: auto; margin: 0; }
.title-assist-actions { display: flex; gap: 9px; flex-wrap: wrap; align-items: center; margin-top: 14px; }
.title-assist-status { margin: 0; color: var(--ink-600); font-size: .84rem; }
@media (max-width: 780px) { .title-assist-grid { grid-template-columns: 1fr; } }
`;
  document.head.appendChild(style);
}

async function loadState() {
  if (loading) return loading;
  loading = (async () => {
    try {
      const [stylesResponse, statusResponse] = await Promise.all([
        fetch('/api/admin/title-styles', { cache: 'no-store', credentials: 'same-origin' }),
        fetch('/api/admin/status', { cache: 'no-store', credentials: 'same-origin' }),
      ]);
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        writeEnabled = Boolean(status?.write_enabled);
      }
      if (stylesResponse.ok) {
        const result = await stylesResponse.json();
        if (result?.ok && result.data) return normalizeStyles(result.data);
      }
    } catch {}

    try {
      const fallback = await fetch('/content/title-styles.json', { cache: 'no-store', credentials: 'same-origin' });
      if (fallback.ok) return normalizeStyles(await fallback.json());
    } catch {}
    return normalizeStyles({});
  })();
  titleState = await loading;
  return titleState;
}

function selectMarkup(role, value, options) {
  return `<select data-title-role="${role}">${options.map(([v, label]) => `<option value="${v}"${v === value ? ' selected' : ''}>${label}</option>`).join('')}</select>`;
}

function cardMarkup(definition) {
  const entry = titleState.titles[definition.key] || DEFAULT_ENTRY;
  const customColor = entry.color !== 'default';
  const color = customColor ? entry.color : '#1f5949';
  return `
    <h3>${definition.title}</h3>
    <p>O título continua sendo um título semântico do site. Aqui você altera somente a apresentação visual, dentro de limites responsivos.</p>
    <div class="title-assist-grid">
      <label>Tamanho
        ${selectMarkup('size', entry.size, [
          ['default', 'Padrão atual'], ['small', 'Pequeno'], ['medium', 'Médio'], ['large', 'Grande'], ['display', 'Destaque']
        ])}
      </label>
      <label>Alinhamento
        ${selectMarkup('align', entry.align, [
          ['default', 'Padrão atual'], ['left', 'Esquerda'], ['center', 'Centralizado'], ['right', 'Direita']
        ])}
      </label>
      <label>Peso
        ${selectMarkup('weight', entry.weight, [
          ['default', 'Padrão atual'], ['regular', 'Normal'], ['semibold', 'Seminegrito'], ['bold', 'Negrito']
        ])}
      </label>
      <label>Cor
        <span class="title-color-row">
          <input type="checkbox" data-title-role="default-color"${customColor ? '' : ' checked'}>
          <span>Usar cor padrão</span>
          <input type="color" data-title-role="color" value="${color}"${customColor ? '' : ' disabled'}>
        </span>
      </label>
      <label class="title-style-check">
        <input type="checkbox" data-title-role="italic"${entry.italic ? ' checked' : ''}>
        <span>Itálico</span>
      </label>
    </div>
    <div class="title-assist-actions">
      <button class="button secondary" type="button" data-title-preview>Pré-visualizar</button>
      <button class="button primary write-action" type="button" data-title-save${writeEnabled ? '' : ' disabled'}>Salvar formatação</button>
      <p class="title-assist-status" role="status" aria-live="polite"></p>
    </div>`;
}

function readCard(card) {
  const defaultColor = card.querySelector('[data-title-role="default-color"]').checked;
  return normalizeEntry({
    size: card.querySelector('[data-title-role="size"]').value,
    align: card.querySelector('[data-title-role="align"]').value,
    color: defaultColor ? 'default' : card.querySelector('[data-title-role="color"]').value,
    weight: card.querySelector('[data-title-role="weight"]').value,
    italic: card.querySelector('[data-title-role="italic"]').checked,
  });
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
  url.searchParams.set('title_preview', definition.key);
  url.searchParams.set('title_size', entry.size);
  url.searchParams.set('title_align', entry.align);
  url.searchParams.set('title_color', entry.color);
  url.searchParams.set('title_weight', entry.weight);
  url.searchParams.set('title_italic', entry.italic ? '1' : '0');

  if (definition.key === 'extra_pages') {
    const firstSlug = normalizedSlug(document.querySelector('#pages-editor [data-role="slug"]')?.value);
    url.hash = firstSlug || 'inicio';
  } else {
    url.hash = definition.anchor.replace(/^#/, '');
  }
  return url;
}

async function saveStyle(definition, card) {
  const status = card.querySelector('.title-assist-status');
  const save = card.querySelector('[data-title-save]');
  const next = structuredClone(titleState);
  next.titles[definition.key] = readCard(card);
  save.disabled = true;
  status.textContent = 'Salvando formatação…';
  try {
    const response = await fetch('/api/admin/title-styles', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: next }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || `Falha ao salvar (${response.status}).`);
    titleState = normalizeStyles(result.data || next);
    status.textContent = 'Formatação salva. Ao abrir o site de Preview, o título já usará essa configuração.';
  } catch (error) {
    status.textContent = error.message || 'Não foi possível salvar a formatação.';
  } finally {
    save.disabled = !writeEnabled;
  }
}

function wireCard(definition, card) {
  const defaultColor = card.querySelector('[data-title-role="default-color"]');
  const color = card.querySelector('[data-title-role="color"]');
  defaultColor.addEventListener('change', () => { color.disabled = defaultColor.checked; });

  card.querySelector('[data-title-preview]').addEventListener('click', () => {
    const entry = readCard(card);
    window.open(previewUrl(definition, entry).toString(), '_blank', 'noopener');
  });

  card.querySelector('[data-title-save]').addEventListener('click', () => saveStyle(definition, card));
}

function injectControl(definition) {
  if (document.querySelector(`[data-title-control="${definition.key}"]`)) return;

  let anchor = null;
  if (definition.field) {
    const field = document.querySelector(definition.field);
    if (!field) return;
    anchor = field.closest('label');
    if (!anchor) return;
  } else if (definition.panel) {
    const panel = document.querySelector(definition.panel);
    if (!panel) return;
    anchor = panel.querySelector('.panel-heading');
    if (!anchor) return;
  }

  const card = document.createElement('div');
  card.className = 'form-card title-assist-card';
  card.dataset.titleControl = definition.key;
  card.innerHTML = cardMarkup(definition);
  wireCard(definition, card);
  anchor.insertAdjacentElement('afterend', card);

  if (definition.key === 'home_hero') {
    document.querySelector('#home-title-alignment')?.closest('label')?.setAttribute('hidden', '');
    document.querySelector('#home-title-size')?.closest('label')?.setAttribute('hidden', '');
  }
}

async function ensureControls() {
  const app = document.getElementById('admin-app');
  if (!app || app.hidden) return;
  await loadState();
  TARGETS.forEach(injectControl);
}

installStyles();
const app = document.getElementById('admin-app');
if (app) {
  const observer = new MutationObserver(() => { void ensureControls(); });
  observer.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
}
void ensureControls();
