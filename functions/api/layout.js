const REPOSITORY = 'Seshomaru1984/pa-safra-compensacao-ambiental-social';
const FILE_PATH = 'public/content/layout.json';
const ALLOWED_CONTENT_BRANCH = 'content/pa-v001-admin-preview';
const ALLOWED_LAYOUTS = new Set(['text-left', 'image-left']);
const BLOCK_KEYS = ['home_hero'];

const DEFAULT_LAYOUT = {
  version: 1,
  blocks: {
    home_hero: 'text-left',
  },
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, max-age=0',
    pragma: 'no-cache',
    expires: '0',
  },
});

function fromBase64Utf8(value) {
  const binary = atob(String(value || '').replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function normalizeLayout(data) {
  const normalized = structuredClone(DEFAULT_LAYOUT);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return normalized;
  const blocks = data.blocks && typeof data.blocks === 'object' && !Array.isArray(data.blocks) ? data.blocks : {};
  for (const key of BLOCK_KEYS) {
    if (ALLOWED_LAYOUTS.has(blocks[key])) normalized.blocks[key] = blocks[key];
  }
  return normalized;
}

async function githubRequest(path, token) {
  const url = new URL(`https://api.github.com/repos/${REPOSITORY}${path}`);
  url.searchParams.set('_pa_fresh', `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2026-03-10',
    'user-agent': 'pa-safra-layout-public-preview/2.0',
    'cache-control': 'no-cache, no-store, max-age=0',
    pragma: 'no-cache',
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(url.toString(), { method: 'GET', cache: 'no-store', headers });
}

export async function onRequestGet({ env }) {
  const branch = String(env.PA_SAFRA_CONTENT_BRANCH || '').trim();
  if (branch !== ALLOWED_CONTENT_BRANCH) {
    return json({ ok: false, error: 'Layout editorial remoto indisponível neste ambiente.' }, 404);
  }

  const token = String(env.GITHUB_CONTENT_TOKEN || '').trim();
  try {
    const response = await githubRequest(`/contents/${FILE_PATH}?ref=${encodeURIComponent(branch)}`, token);
    if (response.status === 404) return json({ ok: true, data: DEFAULT_LAYOUT });
    if (!response.ok) return json({ ok: false, error: `Falha ao carregar layout editorial (${response.status}).` }, 502);
    const payload = await response.json();
    if (!payload?.content) return json({ ok: true, data: DEFAULT_LAYOUT });
    const parsed = JSON.parse(fromBase64Utf8(payload.content));
    return json({ ok: true, data: normalizeLayout(parsed) });
  } catch {
    return json({ ok: false, error: 'Falha ao carregar layout editorial.' }, 502);
  }
}
