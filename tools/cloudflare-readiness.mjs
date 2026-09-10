import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const notes = [];

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

for (const rel of ['public/_headers', 'public/robots.txt', 'public/content/publicacao.json']) {
  if (!exists(rel)) errors.push(`Arquivo obrigatorio ausente: ${rel}`);
}

if (exists('public/_headers')) {
  const headers = read('public/_headers');
  const requiredHeaderTokens = [
    'Content-Security-Policy:',
    "default-src 'self'",
    "frame-src https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'Permissions-Policy:',
    '/content/*',
    '/assets/*',
  ];

  for (const token of requiredHeaderTokens) {
    if (!headers.includes(token)) errors.push(`Regra Cloudflare ausente em public/_headers: ${token}`);
  }
}

let publication = null;
if (exists('public/content/publicacao.json')) {
  try {
    publication = JSON.parse(read('public/content/publicacao.json'));
  } catch (error) {
    errors.push(`publicacao.json invalido: ${error.message}`);
  }
}

if (exists('public/robots.txt')) {
  const robots = read('public/robots.txt');
  const blocked = /User-agent:\s*\*[^]*Disallow:\s*\/\s*$/im.test(robots);
  const approved = publication?.status === 'aprovado' && Object.values(publication?.checks || {}).every(Boolean);

  if (!approved && !blocked) {
    errors.push('robots.txt deve bloquear indexacao enquanto a publicacao estiver pendente.');
  }

  if (approved && blocked) {
    errors.push('robots.txt continua bloqueando indexacao mesmo com publicacao aprovada.');
  }

  notes.push(`robots.txt: ${blocked ? 'indexacao bloqueada' : 'indexacao liberada'}`);
}

if (publication) {
  const branch = publication.production_branch;
  if (branch !== 'main') errors.push(`Branch de producao inesperada: ${branch}`);
  notes.push(`status editorial: ${publication.status}`);
}

if (errors.length) {
  console.error('CLOUDFLARE READINESS: FALHOU');
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('CLOUDFLARE READINESS: OK');
for (const note of notes) console.log(`- ${note}`);
