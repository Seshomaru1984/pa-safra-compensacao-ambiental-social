const REPOSITORY = 'Seshomaru1984/pa-safra-compensacao-ambiental-social';
const FILE_PATH = 'public/content/page-headers.json';
const ALLOWED_CONTENT_BRANCH = 'content/pa-v001-admin-preview';
const HEADER_KEYS = ['about', 'lectures', 'gallery', 'resources', 'legacy', 'extra_pages'];
const ALLOWED_SIZES = new Set(['compact', 'normal', 'wide']);
const DEFAULT_HEADERS = {
  version: 1,
  headers: {
    about: { color: '#285f52', size: 'normal' },
    lectures: { color: '#725a3d', size: 'compact' },
    gallery: { color: '#315f69', size: 'normal' },
    resources: { color: '#234d63', size: 'compact' },
    legacy: { color: '#3f524a', size: 'wide' },
    extra_pages: { color: '#49665d', size: 'normal' },
  },
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store, max-age=0' },
});

function fromBase64Utf8(value) {
  const binary = atob(String(value || '').replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function normalizeEntry(raw, fallback) {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const color = typeof value.color === 'string' && /^#[0-9a-f]{6}$/i.test(value.color) ? value.color.toLowerCase() : fallback.color;
  const size = ALLOWED_SIZES.has(value.size) ? value.size : fallback.size;
  return { color, size };
}

function normalizeHeaders(data) {
  const headers = data && typeof data === 'object' && data.headers && typeof data.headers === 'object' ? data.headers : {};
  return {
    version: 1,
    headers: Object.fromEntries(HEADER_KEYS.map((key) => [key, normalizeEntry(headers[key], DEFAULT_HEADERS.headers[key])])),
  };
}

async function githubRequest(path, token) {
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2026-03-10',
    'user-agent': 'pa-safra-page-header-public-preview/1.0',
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(`https://api.github.com/repos/${REPOSITORY}${path}`, { headers });
}

export async function onRequestGet({ env }) {
  const branch = String(env.PA_SAFRA_CONTENT_BRANCH || '').trim();
  if (branch !== ALLOWED_CONTENT_BRANCH) {
    return json({ ok: false, error: 'Cabeçalhos editoriais remotos indisponíveis neste ambiente.' }, 404);
  }

  const token = String(env.GITHUB_CONTENT_TOKEN || '').trim();
  try {
    const response = await githubRequest(`/contents/${FILE_PATH}?ref=${encodeURIComponent(branch)}`, token);
    if (response.status === 404) return json({ ok: true, data: DEFAULT_HEADERS });
    if (!response.ok) return json({ ok: false, error: `Falha ao carregar cabeçalhos editoriais (${response.status}).` }, 502);
    const payload = await response.json();
    if (!payload?.content) return json({ ok: true, data: DEFAULT_HEADERS });
    return json({ ok: true, data: normalizeHeaders(JSON.parse(fromBase64Utf8(payload.content))) });
  } catch {
    return json({ ok: false, error: 'Falha ao carregar cabeçalhos editoriais.' }, 502);
  }
}
