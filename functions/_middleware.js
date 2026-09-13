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

function buildCriticalCss(styles) {
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

function injectCriticalStyle(html, css) {
  if (!css || html.includes('id="pa-safra-title-first-paint"')) return html;
  if (!html.includes('</head>')) return html;
  return html.replace('</head>', `<style id="pa-safra-title-first-paint">${css}</style>\n</head>`);
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const isPublicDocument = request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html');
  if (!isPublicDocument) return context.next();

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.toLowerCase().includes('text/html')) return response;

  const styles = withPreviewOverride(await loadStyles(request, context.env || {}), request.url);
  const css = buildCriticalCss(styles);
  if (!css) return response;

  const html = injectCriticalStyle(await response.text(), css);
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
