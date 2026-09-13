const DEFINITIONS = Object.freeze({
  about: { selector: '[data-view="sobre"] .page-hero', anchor: 'sobre' },
  lectures: { selector: '[data-view="palestras"] .page-hero', anchor: 'palestras' },
  gallery: { selector: '[data-view="galeria"] .page-hero', anchor: 'galeria' },
  resources: { selector: '[data-view="recursos"] .page-hero', anchor: 'recursos' },
  legacy: { selector: '[data-view="legado"] .page-hero', anchor: 'legado' },
  extra_pages: { selector: '#cms-pages-root [data-view] .page-hero', anchor: 'inicio' },
});

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

const ALLOWED_SIZES = new Set(['compact', 'normal', 'wide']);

function validColor(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim());
}

function normalizeEntry(raw, fallback) {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    color: validColor(value.color) ? value.color.toLowerCase() : fallback.color,
    size: ALLOWED_SIZES.has(value.size) ? value.size : fallback.size,
  };
}

function normalizeHeaders(raw) {
  const headers = raw && typeof raw === 'object' && raw.headers && typeof raw.headers === 'object' ? raw.headers : {};
  return {
    version: 1,
    headers: Object.fromEntries(Object.keys(DEFINITIONS).map((key) => [
      key,
      normalizeEntry(headers[key], DEFAULT_HEADERS.headers[key]),
    ])),
  };
}

function installStyles() {
  if (document.getElementById('pa-safra-page-header-styles')) return;
  const style = document.createElement('style');
  style.id = 'pa-safra-page-header-styles';
  style.textContent = `
.page-hero[data-page-header] {
  --pa-page-header-color: #285f52;
  --pa-page-header-pad: 64px;
  --pa-page-header-min: 235px;
  min-height: var(--pa-page-header-min) !important;
  padding: var(--pa-page-header-pad) 0 !important;
  display: flex;
  align-items: center;
  background:
    linear-gradient(135deg, rgba(6, 28, 24, .24), rgba(255, 255, 255, .035)),
    var(--pa-page-header-color) !important;
  color: var(--white);
}
.page-hero[data-page-header][data-page-header-size="compact"] {
  --pa-page-header-pad: 46px;
  --pa-page-header-min: 180px;
}
.page-hero[data-page-header][data-page-header-size="normal"] {
  --pa-page-header-pad: 64px;
  --pa-page-header-min: 235px;
}
.page-hero[data-page-header][data-page-header-size="wide"] {
  --pa-page-header-pad: 82px;
  --pa-page-header-min: 300px;
}
.page-hero[data-page-header] > .shell {
  width: var(--shell);
}
.page-hero[data-page-header] .page-hero-grid,
.page-hero[data-page-header] .legacy-grid {
  width: 100%;
  align-items: center;
}
.page-hero[data-page-header] h1 {
  margin-bottom: 14px;
}
.page-hero[data-page-header] .legacy-grid h1 {
  margin-bottom: 14px !important;
}
.page-hero[data-page-header] .page-hero-grid img,
.page-hero[data-page-header] .legacy-photo img {
  width: 100%;
  max-height: 270px;
  object-fit: cover;
}
.page-hero[data-page-header] .page-hero-grid img,
.page-hero[data-page-header] .legacy-photo {
  border-radius: var(--radius-md);
  box-shadow: 0 18px 50px rgba(0, 0, 0, .22);
}
.page-hero[data-page-header] .legacy-photo {
  max-width: 580px;
  overflow: hidden;
  align-self: center;
}
.page-hero[data-page-header] p:not(.eyebrow) {
  max-width: 780px;
}
@media (max-width: 980px) {
  .page-hero[data-page-header],
  .page-hero[data-page-header][data-page-header-size="compact"],
  .page-hero[data-page-header][data-page-header-size="normal"],
  .page-hero[data-page-header][data-page-header-size="wide"] {
    --pa-page-header-pad: 48px;
    --pa-page-header-min: 0px;
  }
  .page-hero[data-page-header] .page-hero-grid img,
  .page-hero[data-page-header] .legacy-photo img {
    max-height: 340px;
  }
  .page-hero[data-page-header] .legacy-photo {
    max-width: none;
    justify-self: stretch;
  }
}
`;
  document.head.appendChild(style);
}

function applyEntry(node, key, entry) {
  if (!node) return;
  node.dataset.pageHeader = key;
  node.dataset.pageHeaderSize = entry.size;
  node.style.setProperty('--pa-page-header-color', entry.color);
}

function applyHeaders(config) {
  installStyles();
  for (const [key, definition] of Object.entries(DEFINITIONS)) {
    document.querySelectorAll(definition.selector).forEach((node) => applyEntry(node, key, config.headers[key]));
  }
}

function previewOverride(config) {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('header_preview');
  if (!Object.hasOwn(DEFINITIONS, key)) return config;
  const next = structuredClone(config);
  next.headers[key] = normalizeEntry({
    color: params.get('header_color'),
    size: params.get('header_size'),
  }, next.headers[key]);
  return next;
}

async function loadHeaders() {
  try {
    const response = await fetch('/api/page-headers', { cache: 'no-store', credentials: 'same-origin' });
    if (response.ok) {
      const result = await response.json();
      if (result?.ok && result.data) return normalizeHeaders(result.data);
    }
  } catch {}

  try {
    const response = await fetch('/content/page-headers.json', { cache: 'no-store', credentials: 'same-origin' });
    if (response.ok) return normalizeHeaders(await response.json());
  } catch {}

  return normalizeHeaders(DEFAULT_HEADERS);
}

const headerConfig = previewOverride(await loadHeaders());
applyHeaders(headerConfig);

const observer = new MutationObserver(() => applyHeaders(headerConfig));
observer.observe(document.body, { childList: true, subtree: true });
