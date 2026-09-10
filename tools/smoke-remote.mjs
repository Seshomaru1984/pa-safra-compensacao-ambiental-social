import assert from 'node:assert/strict';

const raw = process.env.PA_SAFRA_PREVIEW_URL?.trim();
if (!raw) {
  console.error('SMOKE REMOTO: FALHOU - defina PA_SAFRA_PREVIEW_URL.');
  process.exit(2);
}

let base;
try {
  base = new URL(raw);
} catch {
  console.error('SMOKE REMOTO: FALHOU - URL invalida.');
  process.exit(2);
}

if (base.protocol !== 'https:') {
  console.error('SMOKE REMOTO: FALHOU - somente HTTPS e permitido.');
  process.exit(2);
}

const explicitHost = process.env.PA_SAFRA_ALLOWED_HOST?.trim().toLowerCase();
const initialHost = base.hostname.toLowerCase();
const hostAllowed = (host) => {
  const normalized = host.toLowerCase();
  if (explicitHost) return normalized === explicitHost;
  return normalized.endsWith('.pages.dev');
};

if (!hostAllowed(initialHost)) {
  console.error('SMOKE REMOTO: FALHOU - host nao autorizado. Use *.pages.dev ou defina PA_SAFRA_ALLOWED_HOST.');
  process.exit(2);
}

base.pathname = '/';
base.search = '';
base.hash = '';

const errors = [];
const ok = (condition, message) => {
  if (!condition) errors.push(message);
};

async function fetchChecked(pathname) {
  const target = new URL(pathname, base);
  const response = await fetch(target, {
    redirect: 'follow',
    headers: { 'user-agent': 'pa-safra-remote-smoke/1.0' },
  });
  const finalUrl = new URL(response.url);
  ok(hostAllowed(finalUrl.hostname), `Redirecionamento para host nao autorizado: ${finalUrl.hostname}`);
  ok(response.ok, `${pathname}: HTTP ${response.status}`);
  return response;
}

try {
  const home = await fetchChecked('/');
  const html = await home.text();
  ok(html.includes('Projeto de Compensação Ambiental e Social - PA Safra'), 'Identidade PA Safra ausente no HTML remoto.');
  ok(!html.includes('\uFFFD'), 'HTML remoto contem caractere de substituicao UTF-8.');
  ok(!html.includes('contato@exemplo.com'), 'Placeholder proibido encontrado no HTML remoto.');

  const expectedHeaders = {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-frame-options': 'DENY',
  };
  for (const [name, expected] of Object.entries(expectedHeaders)) {
    ok(home.headers.get(name) === expected, `Cabecalho remoto invalido/ausente: ${name}`);
  }
  const csp = home.headers.get('content-security-policy') || '';
  ok(csp.includes("default-src 'self'"), 'Content-Security-Policy remoto ausente ou incompleto.');
  ok(csp.includes('frame-src https://www.youtube-nocookie.com'), 'CSP remoto nao libera apenas o frame esperado do YouTube.');

  const publicationResponse = await fetchChecked('/content/publicacao.json');
  const publication = await publicationResponse.json();
  ok(publication.production_branch === 'main', 'production_branch remota deve ser main.');
  ok(publication.status === 'pendente', 'Preview deve permanecer com status editorial pendente nesta etapa.');
  ok(Object.values(publication.checks || {}).some((value) => value === false), 'Preview nao pode indicar aprovacoes integrais nesta etapa.');

  const robotsResponse = await fetchChecked('/robots.txt');
  const robots = await robotsResponse.text();
  ok(/User-agent:\s*\*/i.test(robots) && /Disallow:\s*\/\s*$/im.test(robots), 'robots.txt remoto deve bloquear indexacao enquanto pendente.');

  for (const imagePath of [
    '/assets/img/solicitante-rio-cristalino.webp',
    '/assets/img/solicitante-cerrado.webp',
  ]) {
    const response = await fetchChecked(imagePath);
    const bytes = new Uint8Array(await response.arrayBuffer());
    ok(bytes.length > 1024, `Imagem remota pequena demais: ${imagePath}`);
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    ok(riff === 'RIFF' && webp === 'WEBP', `Assinatura WebP invalida: ${imagePath}`);
  }
} catch (error) {
  errors.push(`Falha de rede/parsing: ${error.message}`);
}

if (errors.length) {
  console.error('SMOKE REMOTO: FALHOU');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('SMOKE REMOTO: OK');
console.log(`URL validada: ${base.origin}`);
console.log('- identidade e UTF-8: OK');
console.log('- cabecalhos de seguranca: OK');
console.log('- publicacao pendente: OK');
console.log('- robots bloqueando indexacao: OK');
console.log('- WebPs do solicitante: OK');
