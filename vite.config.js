import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const PUBLIC_LAYOUT_TAG = '<script type="module" src="/layout-assist.js"></script>';
const ADMIN_LAYOUT_TAG = '<script type="module" src="/admin/layout-assist.js"></script>';
const PUBLIC_TITLE_TAG = '<script type="module" src="/title-style-assist.js"></script>';
const ADMIN_TITLE_TAG = '<script type="module" src="/admin/title-style-assist.js"></script>';

function injectBeforeBody(html, tag) {
  if (html.includes(tag)) return html;
  if (!html.includes('</body>')) throw new Error('HTML sem fechamento de body para injeção assistida.');
  return html.replace('</body>', `  ${tag}\n</body>`);
}

function injectAll(html, tags) {
  return tags.reduce((current, tag) => injectBeforeBody(current, tag), html);
}

export default defineConfig({
  plugins: [
    {
      name: 'pa-safra-edicao-assistida',
      enforce: 'post',
      transformIndexHtml(html) {
        return injectAll(html, [PUBLIC_LAYOUT_TAG, PUBLIC_TITLE_TAG]);
      },
      closeBundle() {
        const adminPath = path.resolve('dist', 'admin', 'index.html');
        if (!fs.existsSync(adminPath)) throw new Error('Build do admin não encontrado para injeção assistida.');
        const html = fs.readFileSync(adminPath, 'utf8');
        fs.writeFileSync(adminPath, injectAll(html, [ADMIN_LAYOUT_TAG, ADMIN_TITLE_TAG]), 'utf8');
      },
    },
  ],
});
