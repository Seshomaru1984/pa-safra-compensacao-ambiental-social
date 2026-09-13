const REPOSITORY = 'Seshomaru1984/pa-safra-compensacao-ambiental-social';
const ALLOWED_CONTENT_BRANCH = 'content/pa-v001-admin-preview';
const RESOURCES = Object.freeze({
  site: 'public/content/site.json',
  videos: 'public/content/videos.json',
  pages: 'public/content/paginas.json',
  highlights: 'public/content/destaques.json',
  gallery: 'public/content/galeria.json',
  links: 'public/content/links.json',
});

const json = (data, status = 200, extraHeaders = {}) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, max-age=0',
    ...extraHeaders,
  },
});

function fromBase64Utf8(value) {
  const binary = atob(String(value || '').replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function githubRequest(path, token) {
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2026-03-10',
    'user-agent': 'pa-safra-public-content-preview/1.0',
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(`https://api.github.com/repos/${REPOSITORY}${path}`, { headers });
}

export async function onRequestGet({ request, env }) {
  const branch = String(env.PA_SAFRA_CONTENT_BRANCH || '').trim();
  if (branch !== ALLOWED_CONTENT_BRANCH) {
    return json({ ok: false, error: 'Conteúdo editorial remoto indisponível neste ambiente.' }, 404);
  }

  const url = new URL(request.url);
  const resource = String(url.searchParams.get('resource') || '').trim();
  const filePath = RESOURCES[resource];
  if (!filePath) return json({ ok: false, error: 'Recurso editorial inválido.' }, 400);

  const token = String(env.GITHUB_CONTENT_TOKEN || '').trim();
  try {
    const response = await githubRequest(`/contents/${filePath}?ref=${encodeURIComponent(branch)}`, token);
    if (response.status === 404) return json({ ok: false, error: 'Conteúdo editorial não encontrado.' }, 404);
    if (!response.ok) return json({ ok: false, error: `Falha ao carregar conteúdo editorial (${response.status}).` }, 502);

    const payload = await response.json();
    if (!payload?.content) return json({ ok: false, error: 'Conteúdo editorial vazio.' }, 502);

    const data = JSON.parse(fromBase64Utf8(payload.content));
    return json(data, 200, {
      'x-pa-content-source': 'editorial-preview',
      'x-pa-content-resource': resource,
    });
  } catch {
    return json({ ok: false, error: 'Falha ao carregar conteúdo editorial.' }, 502);
  }
}
