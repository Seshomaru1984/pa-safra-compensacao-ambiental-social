import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const PUBLIC_TAG = '<script type="module" src="/layout-assist.js"></script>';
const ADMIN_TAG = '<script type="module" src="/admin/layout-assist.js"></script>';

function injectBeforeBody(html, tag) {
  if (html.includes(tag)) return html;
  if (!html.includes('</body>')) throw new Error('HTML sem fechamento de body para injeção do layout assistido.');
  return html.replace('</body>', `  ${tag}\n</body>`);
}

export default defineConfig({
  plugins: [
    {
      name: 'pa-safra-layout-assistido',
      enforce: 'post',
      transformIndexHtml(html) {
        return injectBeforeBody(html, PUBLIC_TAG);
      },
      closeBundle() {
        const adminPath = path.resolve('dist', 'admin', 'index.html');
        if (!fs.existsSync(adminPath)) throw new Error('Build do admin não encontrado para injeção do layout assistido.');
        const html = fs.readFileSync(adminPath, 'utf8');
        fs.writeFileSync(adminPath, injectBeforeBody(html, ADMIN_TAG), 'utf8');
      },
    },
  ],
});
