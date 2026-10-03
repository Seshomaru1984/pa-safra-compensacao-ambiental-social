const TARGETS = Object.freeze({
  home_hero: '#titulo-inicio',
  home_intro: '#eixos-titulo',
  about_hero: '#titulo-sobre',
  lectures_hero: '#titulo-palestras',
  gallery_hero: '#titulo-galeria',
  resources_hero: '#titulo-recursos',
  legacy_hero: '#titulo-legado',
  extra_pages: '#cms-pages-root [data-view] .page-hero h1',
});

const DEFAULT_ENTRY = Object.freeze({
  size: 'default',
  align: 'default',
  color: 'default',
  weight: 'default',
  italic: false,
});

const ALLOWED_SIZES = new Set(['default', 'small', 'medium', 'large', 'display']);
const ALLOWED_ALIGNS = new Set(['default', 'left', 'center', 'right']);
const ALLOWED_WEIGHTS = new Set(['default', 'regular', 'semibold', 'bold']);

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
    titles: Object.fromEntries(Object.keys(TARGETS).map((key) => [key, normalizeEntry(titles[key])])),
  };
}

function installStyles() {
  if (document.getElementById('pa-safra-title-assist-styles')) return;
  const style = document.createElement('style');
  style.id = 'pa-safra-title-assist-styles';
  style.textContent = `
[data-title-assist][data-title-size="small"] { font-size: clamp(1.35rem, 2.4vw, 1.9rem) !important; line-height: 1.12 !important; }
[data-title-assist][data-title-size="medium"] { font-size: clamp(1.75rem, 3.2vw, 2.6rem) !important; line-height: 1.10 !important; }
[data-title-assist][data-title-size="large"] { font-size: clamp(2.1rem, 4.4vw, 3.4rem) !important; line-height: 1.08 !important; }
[data-title-assist][data-title-size="display"] { font-size: clamp(2.45rem, 5.5vw, 4.2rem) !important; line-height: 1.04 !important; }
[data-title-assist][data-title-align="left"] { text-align: left !important; }
[data-title-assist][data-title-align="center"] { text-align: center !important; }
[data-title-assist][data-title-align="right"] { text-align: right !important; }
[data-title-assist][data-title-color="custom"] { color: var(--pa-title-color) !important; }
[data-title-assist][data-title-weight="regular"] { font-weight: 500 !important; }
[data-title-assist][data-title-weight="semibold"] { font-weight: 650 !important; }
[data-title-assist][data-title-weight="bold"] { font-weight: 800 !important; }
[data-title-assist][data-title-italic="true"] { font-style: italic !important; }
@media (max-width: 680px) {
  [data-title-assist][data-title-size="small"] { font-size: clamp(1.3rem, 6vw, 1.75rem) !important; }
  [data-title-assist][data-title-size="medium"] { font-size: clamp(1.6rem, 7vw, 2.15rem) !important; }
  [data-title-assist][data-title-size="large"] { font-size: clamp(1.85rem, 8vw, 2.6rem) !important; }
  [data-title-assist][data-title-size="display"] { font-size: clamp(2.05rem, 9vw, 3rem) !important; }
}`;
  document.head.appendChild(style);
}

function clearAssistedState(node) {
  delete node.dataset.titleSize;
  delete node.dataset.titleAlign;
  delete node.dataset.titleColor;
  delete node.dataset.titleWeight;
  delete node.dataset.titleItalic;
  node.style.removeProperty('--pa-title-color');
}

function applyEntry(node, key, entry) {
  if (!node) return;
  clearAssistedState(node);
  node.dataset.titleAssist = key;
  if (entry.size !== 'default') node.dataset.titleSize = entry.size;
  if (entry.align !== 'default') node.dataset.titleAlign = entry.align;
  if (entry.color !== 'default') {
    node.dataset.titleColor = 'custom';
    node.style.setProperty('--pa-title-color', entry.color);
  }
  if (entry.weight !== 'default') node.dataset.titleWeight = entry.weight;
  if (entry.italic) node.dataset.titleItalic = 'true';
}

function applyStyles(styles) {
  installStyles();
  for (const [key, selector] of Object.entries(TARGETS)) {
    document.querySelectorAll(selector).forEach((node) => applyEntry(node, key, styles.titles[key]));
  }
}

function previewOverride(styles) {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('title_preview');
  if (!Object.hasOwn(TARGETS, key)) return styles;
  const next = structuredClone(styles);
  next.titles[key] = normalizeEntry({
    size: params.get('title_size'),
    align: params.get('title_align'),
    color: params.get('title_color'),
    weight: params.get('title_weight'),
    italic: params.get('title_italic') === '1',
  });
  return next;
}

async function loadStyles() {
  try {
    const response = await fetch('/api/title-styles', { cache: 'no-store', credentials: 'same-origin' });
    if (response.ok) {
      const result = await response.json();
      if (result?.ok && result.data) return normalizeStyles(result.data);
    }
  } catch {}

  try {
    const response = await fetch('/content/title-styles.json', { cache: 'no-store', credentials: 'same-origin' });
    if (response.ok) return normalizeStyles(await response.json());
  } catch {}

  return normalizeStyles({});
}

const titleStyles = previewOverride(await loadStyles());
applyStyles(titleStyles);

const observer = new MutationObserver(() => applyStyles(titleStyles));
observer.observe(document.body, { childList: true, subtree: true });
