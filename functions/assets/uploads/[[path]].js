const REPOSITORY = 'Seshomaru1984/pa-safra-compensacao-ambiental-social';
const EDITORIAL_BRANCH = 'content/pa-v001-admin-preview';

function normalizedPath(value) {
  const raw = Array.isArray(value) ? value.join('/') : String(value || '');
  if (!raw || raw.includes('..') || raw.includes('\\') || !/^[a-zA-Z0-9._\-/]+$/.test(raw)) return '';
  if (!/\.(?:jpe?g|png|webp)$/i.test(raw)) return '';
  return raw.replace(/^\/+/, '');
}

function mimeFor(path) {
  if (/\.png$/i.test(path)) return 'image/png';
  if (/\.webp$/i.test(path)) return 'image/webp';
  return 'image/jpeg';
}

export async function onRequestGet({ params, env }) {
  const path = normalizedPath(params.path);
  if (!path) return new Response('Imagem não encontrada.', { status: 404 });

  const configured = String(env.PA_SAFRA_CONTENT_BRANCH || '').trim();
  const branch = configured === EDITORIAL_BRANCH ? EDITORIAL_BRANCH : 'main';
  const repoPath = `public/assets/uploads/${path}`;
  const endpoint = `https://api.github.com/repos/${REPOSITORY}/contents/${repoPath}?ref=${encodeURIComponent(branch)}`;
  const token = String(env.GITHUB_CONTENT_TOKEN || '').trim();
  const headers = {
    Accept: 'application/vnd.github.raw+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'PA-Safra-Media',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(endpoint, { headers });
  if (!response.ok) return new Response('Imagem não encontrada.', { status: response.status === 404 ? 404 : 502 });

  return new Response(response.body, {
    status: 200,
    headers: {
      'content-type': mimeFor(path),
      'cache-control': branch === EDITORIAL_BRANCH ? 'no-store, max-age=0' : 'public, max-age=86400',
      'x-content-type-options': 'nosniff',
    },
  });
}
