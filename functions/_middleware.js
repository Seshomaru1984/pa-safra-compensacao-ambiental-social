const ALLOWED_CONTENT_BRANCH = 'content/pa-v001-admin-preview';

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

const ALLOWED_SIZES = new Set(['default', 'small', 'medium', 'large', 'display']);
const ALLOWED_ALIGNS = new Set(['default', 'left', 'center', 'right']);
const ALLOWED_WEIGHTS = new Set(['default', 'regular', 'semibold', 'bold']);

const DEFAULT_ENTRY = Object.freeze({
  size: 'default',
  align: 'default',
  color: 'default',
  weight: 'default',
  italic: false,
});

const SIZE_DESKTOP = Object.freeze({
  small: 'clamp(1.35rem, 2.4vw, 1.9rem)',
  medium: 'clamp(1.75rem, 3.2vw, 2.6rem)',
  large: 'clamp(2.1rem, 4.4vw, 3.4rem)',
  display: 'clamp(2.45rem, 5.5vw, 4.2rem)',
});

const SIZE_MOBILE = Object.freeze({
  small: 'clamp(1.3rem, 6vw, 1.75rem)',
  medium: 'clamp(1.6rem, 7vw, 2.15rem)',
  large: 'clamp(1.85rem, 8vw, 2.6rem)',
  display: 'clamp(2.05rem, 9vw, 3rem)',
});

const LINE_HEIGHT = Object.freeze({ small: '1.12', medium: '1.10', large: '1.08', display: '1.04' });
const WEIGHT = Object.freeze({ regular: '500', semibold: '650', bold: '800' });

const LAYOUT_KEYS = Object.freeze(['home_hero', 'about_hero', 'legacy_hero']);
const ALLOWED_LAYOUTS = new Set(['text-left', 'image-left']);
const DEFAULT_LAYOUT = Object.freeze({
  version: 1,
  blocks: Object.freeze({
    home_hero: 'text-left',
    about_hero: 'text-left',
    legacy_hero: 'text-left',
  }),
});
const LAYOUT_PARAMS = Object.freeze({
  home_hero: 'layout_home',
  about_hero: 'layout_about',
  legacy_hero: 'layout_legacy',
});

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

function withPreviewOverride(styles, requestUrl) {
  const url = new URL(requestUrl);
  const key = url.searchParams.get('title_preview');
  if (!Object.hasOwn(TARGETS, key)) return styles;
  const next = structuredClone(styles);
  next.titles[key] = normalizeEntry({
    size: url.searchParams.get('title_size'),
    align: url.searchParams.get('title_align'),
    color: url.searchParams.get('title_color'),
    weight: url.searchParams.get('title_weight'),
    italic: url.searchParams.get('title_italic') === '1',
  });
  return next;
}

function normalizeLayout(raw) {
  const blocks = raw && typeof raw === 'object' && raw.blocks && typeof raw.blocks === 'object' ? raw.blocks : {};
  const normalized = { version: 1, blocks: {} };
  for (const key of LAYOUT_KEYS) {
    normalized.blocks[key] = ALLOWED_LAYOUTS.has(blocks[key]) ? blocks[key] : DEFAULT_LAYOUT.blocks[key];
  }
  return normalized;
}

function withLayoutPreviewOverride(layout, requestUrl) {
  const url = new URL(requestUrl);
  const next = structuredClone(layout);
  for (const [key, param] of Object.entries(LAYOUT_PARAMS)) {
    const value = url.searchParams.get(param);
    if (ALLOWED_LAYOUTS.has(value)) next.blocks[key] = value;
  }
  return next;
}

function declarations(entry, mobile = false) {
  const rules = [];
  const sizes = mobile ? SIZE_MOBILE : SIZE_DESKTOP;
  if (entry.size !== 'default' && sizes[entry.size]) {
    rules.push(`font-size:${sizes[entry.size]}!important`);
    if (!mobile && LINE_HEIGHT[entry.size]) rules.push(`line-height:${LINE_HEIGHT[entry.size]}!important`);
  }
  if (!mobile && entry.align !== 'default') rules.push(`text-align:${entry.align}!important`);
  if (!mobile && entry.color !== 'default') rules.push(`color:${entry.color}!important`);
  if (!mobile && entry.weight !== 'default') rules.push(`font-weight:${WEIGHT[entry.weight]}!important`);
  if (!mobile && entry.italic) rules.push('font-style:italic!important');
  return rules.join(';');
}

function buildTitleCriticalCss(styles) {
  const desktop = [];
  const mobile = [];
  for (const [key, selector] of Object.entries(TARGETS)) {
    const entry = styles.titles[key] || DEFAULT_ENTRY;
    const desktopRules = declarations(entry, false);
    if (desktopRules) desktop.push(`${selector}{${desktopRules}}`);
    const mobileRules = declarations(entry, true);
    if (mobileRules) mobile.push(`${selector}{${mobileRules}}`);
  }
  return `${desktop.join('')}${mobile.length ? `@media(max-width:680px){${mobile.join('')}}` : ''}`;
}

function buildLayoutCriticalCss(layout) {
  const rules = [];
  if (layout.blocks.home_hero === 'image-left') {
    rules.push('.hero-grid{grid-template-columns:minmax(420px,.98fr) minmax(0,1.02fr)}');
    rules.push('.hero-grid>.hero-copy{grid-column:2;grid-row:1}');
    rules.push('.hero-grid>.hero-media{grid-column:1;grid-row:1}');
  }
  if (layout.blocks.about_hero === 'image-left') {
    rules.push('[data-view="sobre"] .page-hero-grid{grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr)}');
    rules.push('[data-view="sobre"] .page-hero-grid>div{grid-column:2;grid-row:1}');
    rules.push('[data-view="sobre"] .page-hero-grid>img{grid-column:1;grid-row:1}');
  }
  if (layout.blocks.legacy_hero === 'image-left') {
    rules.push('[data-view="legado"] .legacy-grid{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr)}');
    rules.push('[data-view="legado"] .legacy-grid>div{grid-column:2;grid-row:1}');
    rules.push('[data-view="legado"] .legacy-grid>.legacy-photo{grid-column:1;grid-row:1;justify-self:start}');
  }
  return rules.length ? `@media(min-width:981px){${rules.join('')}}` : '';
}

async function readJson(url) {
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function loadStyles(request, env) {
  const branch = String(env.PA_SAFRA_CONTENT_BRANCH || '').trim();
  if (branch === ALLOWED_CONTENT_BRANCH) {
    const remote = await readJson(new URL('/api/title-styles', request.url));
    if (remote?.ok && remote.data) return normalizeStyles(remote.data);
  }

  const local = await readJson(new URL('/content/title-styles.json', request.url));
  return normalizeStyles(local || {});
}

async function loadLayout(request, env) {
  const branch = String(env.PA_SAFRA_CONTENT_BRANCH || '').trim();
  if (branch === ALLOWED_CONTENT_BRANCH) {
    const remote = await readJson(new URL('/api/layout', request.url));
    if (remote?.ok && remote.data) return normalizeLayout(remote.data);
  }

  const local = await readJson(new URL('/content/layout.json', request.url));
  return normalizeLayout(local || DEFAULT_LAYOUT);
}

function injectCriticalStyle(html, id, css) {
  if (!css || html.includes(`id="${id}"`)) return html;
  if (!html.includes('</head>')) return html;
  return html.replace('</head>', `<style id="${id}">${css}</style>\n</head>`);
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const isPublicDocument = request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html');
  if (!isPublicDocument) return context.next();

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.toLowerCase().includes('text/html')) return response;

  const [stylesRaw, layoutRaw] = await Promise.all([
    loadStyles(request, context.env || {}),
    loadLayout(request, context.env || {}),
  ]);
  const styles = withPreviewOverride(stylesRaw, request.url);
  const layout = withLayoutPreviewOverride(layoutRaw, request.url);
  const titleCss = buildTitleCriticalCss(styles);
  const layoutCss = buildLayoutCriticalCss(layout);

  let html = await response.text();
  html = injectCriticalStyle(html, 'pa-safra-title-first-paint', titleCss);
  html = injectCriticalStyle(html, 'pa-safra-layout-first-paint', layoutCss);

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('cache-control', 'no-store, max-age=0');

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
