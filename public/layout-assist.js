const DEFAULT_LAYOUT = Object.freeze({
  version: 1,
  blocks: Object.freeze({
    home_hero: 'text-left',
    about_hero: 'text-left',
    legacy_hero: 'text-left',
  }),
});

const ALLOWED_LAYOUTS = new Set(['text-left', 'image-left']);
const PARAMS = {
  home_hero: 'layout_home',
  about_hero: 'layout_about',
  legacy_hero: 'layout_legacy',
};

function normalizeLayout(raw) {
  const blocks = raw && typeof raw === 'object' && raw.blocks && typeof raw.blocks === 'object' ? raw.blocks : {};
  const normalized = { version: 1, blocks: {} };
  for (const key of Object.keys(DEFAULT_LAYOUT.blocks)) {
    normalized.blocks[key] = ALLOWED_LAYOUTS.has(blocks[key]) ? blocks[key] : DEFAULT_LAYOUT.blocks[key];
  }
  return normalized;
}

function applyPreviewOverrides(layout) {
  const params = new URLSearchParams(window.location.search);
  const next = structuredClone(layout);
  for (const [key, param] of Object.entries(PARAMS)) {
    const value = params.get(param);
    if (ALLOWED_LAYOUTS.has(value)) next.blocks[key] = value;
  }
  return next;
}

function applyBlock(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.dataset.assistedLayout = ALLOWED_LAYOUTS.has(value) ? value : 'text-left';
}

function installStyles() {
  if (document.getElementById('pa-safra-assisted-layout-styles')) return;
  const style = document.createElement('style');
  style.id = 'pa-safra-assisted-layout-styles';
  style.textContent = `
@media (min-width: 981px) {
  .hero-grid[data-assisted-layout="image-left"] > .hero-copy {
    grid-column: 2;
    grid-row: 1;
  }
  .hero-grid[data-assisted-layout="image-left"] > .hero-media {
    grid-column: 1;
    grid-row: 1;
  }
  [data-view="sobre"] .page-hero-grid[data-assisted-layout="image-left"] > div {
    grid-column: 2;
    grid-row: 1;
  }
  [data-view="sobre"] .page-hero-grid[data-assisted-layout="image-left"] > img {
    grid-column: 1;
    grid-row: 1;
  }
  [data-view="legado"] .legacy-grid[data-assisted-layout="image-left"] > div {
    grid-column: 2;
    grid-row: 1;
  }
  [data-view="legado"] .legacy-grid[data-assisted-layout="image-left"] > .legacy-photo {
    grid-column: 1;
    grid-row: 1;
    justify-self: start;
  }
}`;
  document.head.appendChild(style);
}

function applyLayout(layout) {
  installStyles();
  applyBlock('.hero-grid', layout.blocks.home_hero);
  applyBlock('[data-view="sobre"] .page-hero-grid', layout.blocks.about_hero);
  applyBlock('[data-view="legado"] .legacy-grid', layout.blocks.legacy_hero);
}

async function loadLayout() {
  try {
    const response = await fetch('/content/layout.json', { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) throw new Error(`layout ${response.status}`);
    return normalizeLayout(await response.json());
  } catch {
    return normalizeLayout(DEFAULT_LAYOUT);
  }
}

const layout = applyPreviewOverrides(await loadLayout());
applyLayout(layout);
