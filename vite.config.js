import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const PUBLIC_LAYOUT_TAG = '<script type="module" src="/layout-assist.js"></script>';
const ADMIN_LAYOUT_TAG = '<script type="module" src="/admin/layout-assist.js"></script>';
const PUBLIC_TITLE_TAG = '<script type="module" src="/title-style-assist.js"></script>';
const ADMIN_TITLE_TAG = '<script type="module" src="/admin/title-style-assist.js"></script>';
const PUBLIC_VIDEO_TITLE_TAG = '<script type="module" src="/video-title-style.js"></script>';
const ADMIN_NUMERIC_FONT_TAG = '<script type="module" src="/admin/numeric-font-assist.js"></script>';
const PREVIEW_CONTENT_BRIDGE_TAG = '<script src="/content-preview-bridge.js"></script>';
const PUBLIC_ROUTE_STYLE_TAG = '<link rel="stylesheet" href="/first-paint-route.css" />';
const PUBLIC_ROUTE_SCRIPT_TAG = '<script src="/first-paint-route.js"></script>';
const PUBLIC_INTERNAL_HEADER_STYLE_TAG = '<link rel="stylesheet" href="/internal-header-uniform.css" />';
const PUBLIC_A30_VISUAL_STYLE_TAG = '<link rel="stylesheet" href="/a30-visual-polish.css" />';
const PUBLIC_IMAGE_FALLBACK_TAG = '<script src="/image-fallback.js" defer></script>';
const SITE_CONFIG_PATH = path.resolve('public', 'content', 'site.json');

function injectBeforeBody(html, tag) {
  if (html.includes(tag)) return html;
  if (!html.includes('</body>')) throw new Error('HTML sem fechamento de body para injeção assistida.');
  return html.replace('</body>', `  ${tag}\n</body>`);
}

function injectBeforeHeadEnd(html, tag) {
  if (html.includes(tag)) return html;
  if (!html.includes('</head>')) throw new Error('HTML sem fechamento de head para sincronização do primeiro paint.');
  return html.replace('</head>', `  ${tag}\n</head>`);
}

function injectAll(html, tags) {
  return tags.reduce((current, tag) => injectBeforeBody(current, tag), html);
}

function escapeAttribute(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function setAttribute(tag, name, value) {
  const escaped = escapeAttribute(value);
  const pattern = new RegExp(`\\s${name}=(?:"[^"]*"|'[^']*')`, 'i');
  if (pattern.test(tag)) return tag.replace(pattern, ` ${name}="${escaped}"`);
  return tag.replace(/\s*\/$|>$/, (ending) => ` ${name}="${escaped}"${ending}`);
}

function readSiteConfig() {
  if (!fs.existsSync(SITE_CONFIG_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(SITE_CONFIG_PATH, 'utf8'));
  } catch (error) {
    throw new Error(`site.json inválido para sincronização do primeiro paint: ${error.message}`);
  }
}

function syncStaticAssetPaths(html) {
  return html.replaceAll(
    '/assets/img/solicitante-cerrado.jpg',
    '/assets/img/solicitante-cerrado.webp',
  );
}

function syncPublicHero(html) {
  const site = readSiteConfig();
  const hero = site?.hero && typeof site.hero === 'object' ? site.hero : {};

  const heroClasses = ['hero-copy'];
  if (hero.title_alignment === 'right') heroClasses.push('align-right');
  if (hero.title_alignment === 'center') heroClasses.push('align-center');
  if (hero.title_size === 'compact') heroClasses.push('title-compact');
  if (hero.title_size === 'small') heroClasses.push('title-small');

  let next = html.replace(/class="hero-copy(?:\s+[^"]*)?"/, `class="${heroClasses.join(' ')}"`);

  const imagePath = typeof hero.image === 'string' && /^\/assets\//.test(hero.image.trim())
    ? hero.image.trim()
    : '';
  const imageAlt = typeof hero.image_alt === 'string' ? hero.image_alt.trim() : '';

  next = next.replace(/<img\b[^>]*\bid="hero-image"[^>]*>/i, (tag) => {
    let updated = tag;
    if (imagePath) updated = setAttribute(updated, 'src', imagePath);
    if (imageAlt) updated = setAttribute(updated, 'alt', imageAlt);
    updated = setAttribute(updated, 'loading', 'eager');
    updated = setAttribute(updated, 'fetchpriority', 'high');
    updated = setAttribute(updated, 'decoding', 'sync');
    return updated;
  });

  if (imagePath) {
    next = injectBeforeHeadEnd(
      next,
      `<link rel="preload" as="image" href="${escapeAttribute(imagePath)}" fetchpriority="high" />`,
    );
  }

  return next;
}

function installFirstPaintRoute(html) {
  let next = injectBeforeHeadEnd(html, PREVIEW_CONTENT_BRIDGE_TAG);
  next = injectBeforeHeadEnd(next, PUBLIC_ROUTE_STYLE_TAG);
  next = injectBeforeHeadEnd(next, PUBLIC_INTERNAL_HEADER_STYLE_TAG);
  next = injectBeforeHeadEnd(next, PUBLIC_A30_VISUAL_STYLE_TAG);
  next = injectBeforeHeadEnd(next, PUBLIC_ROUTE_SCRIPT_TAG);
  return next;
}

export default defineConfig({
  plugins: [
    {
      name: 'pa-safra-edicao-assistida',
      enforce: 'post',
      transformIndexHtml(html) {
        const normalizedHtml = syncStaticAssetPaths(html);
        const publicHtml = installFirstPaintRoute(syncPublicHero(normalizedHtml));
        return injectAll(publicHtml, [PUBLIC_LAYOUT_TAG, PUBLIC_TITLE_TAG, PUBLIC_VIDEO_TITLE_TAG, PUBLIC_IMAGE_FALLBACK_TAG]);
      },
      closeBundle() {
        const adminPath = path.resolve('dist', 'admin', 'index.html');
        if (!fs.existsSync(adminPath)) throw new Error('Build do admin não encontrado para injeção assistida.');
        const html = fs.readFileSync(adminPath, 'utf8');
        const bridgedAdmin = injectBeforeHeadEnd(html, PREVIEW_CONTENT_BRIDGE_TAG);
        fs.writeFileSync(adminPath, injectAll(bridgedAdmin, [ADMIN_LAYOUT_TAG, ADMIN_TITLE_TAG, ADMIN_NUMERIC_FONT_TAG]), 'utf8');
      },
    },
  ],
});
