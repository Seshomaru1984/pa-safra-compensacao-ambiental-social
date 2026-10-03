const REPOSITORY = 'Seshomaru1984/pa-safra-compensacao-ambiental-social';
const FILE_PATH = 'public/content/title-styles.json';
const ALLOWED_CONTENT_BRANCH = 'content/pa-v001-admin-preview';
const TITLE_KEYS = ['home_hero', 'home_intro', 'about_hero', 'lectures_hero', 'gallery_hero', 'resources_hero', 'legacy_hero', 'extra_pages'];
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

const DEFAULT_STYLES = {
  version: 1,
  titles: Object.fromEntries(TITLE_KEYS.map((key) => [key, structuredClone(DEFAULT_ENTRY)])),
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, max-age=0',
  },
});

function fromBase64Utf8(value) {
  const binary = atob(String(value || '').replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function validColor(value) {
  return value === 'default' || (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value));
}

function normalizeEntry(raw) {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    size: ALLOWED_SIZES.has(value.size) ? value.size : 'default',
    align: ALLOWED_ALIGNS.has(value.align) ? value.align : 'default',
    color: validColor(value.color) ? value.color.toLowerCase() : 'default',
    weight: ALLOWED_WEIGHTS.has(value.weight) ? value.weight : 'default',
    italic: value.italic === true,
  };
}

function normalizeStyles(data) {
  const titles = data && typeof data === 'object' && data.titles && typeof data.titles === 'object' ? data.titles : {};
  return {
    version: 1,
    titles: Object.fromEntries(TITLE_KEYS.map((key) => [key, normalizeEntry(titles[key])])),
  };
}

async function githubRequest(path, token) {
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2026-03-10',
    'user-agent': 'pa-safra-title-style-public-preview/1.0',
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(`https://api.github.com/repos/${REPOSITORY}${path}`, { headers });
}

export async function onRequestGet({ env }) {
  const branch = String(env.PA_SAFRA_CONTENT_BRANCH || '').trim();
  if (branch !== ALLOWED_CONTENT_BRANCH) {
    return json({ ok: false, error: 'Formatação editorial remota indisponível neste ambiente.' }, 404);
  }

  const token = String(env.GITHUB_CONTENT_TOKEN || '').trim();
  try {
    const response = await githubRequest(`/contents/${FILE_PATH}?ref=${encodeURIComponent(branch)}`, token);
    if (response.status === 404) return json({ ok: true, data: DEFAULT_STYLES });
    if (!response.ok) return json({ ok: false, error: `Falha ao carregar formatação editorial (${response.status}).` }, 502);
    const payload = await response.json();
    if (!payload?.content) return json({ ok: true, data: DEFAULT_STYLES });
    const parsed = JSON.parse(fromBase64Utf8(payload.content));
    return json({ ok: true, data: normalizeStyles(parsed) });
  } catch {
    return json({ ok: false, error: 'Falha ao carregar formatação editorial.' }, 502);
  }
}
