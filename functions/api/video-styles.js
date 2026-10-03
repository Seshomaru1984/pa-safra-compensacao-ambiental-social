const REPOSITORY = 'Seshomaru1984/pa-safra-compensacao-ambiental-social';
const FILE_PATH = 'public/content/video-styles.json';
const ALLOWED_CONTENT_BRANCH = 'content/pa-v001-admin-preview';
const DEFAULT_STYLES = Object.freeze({ version: 1, title_size_px: 28 });

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

function normalizeStyles(data) {
  const size = Number(data?.title_size_px);
  return {
    version: 1,
    title_size_px: Number.isInteger(size) && size >= 18 && size <= 56 ? size : DEFAULT_STYLES.title_size_px,
  };
}

async function githubRequest(path, token) {
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2026-03-10',
    'user-agent': 'pa-safra-video-style-public-preview/1.0',
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(`https://api.github.com/repos/${REPOSITORY}${path}`, { headers });
}

export async function onRequestGet({ env }) {
  const branch = String(env.PA_SAFRA_CONTENT_BRANCH || '').trim();
  if (branch !== ALLOWED_CONTENT_BRANCH) {
    return json({ ok: false, error: 'Formatação de vídeos remota indisponível neste ambiente.' }, 404);
  }

  const token = String(env.GITHUB_CONTENT_TOKEN || '').trim();
  try {
    const response = await githubRequest(`/contents/${FILE_PATH}?ref=${encodeURIComponent(branch)}`, token);
    if (response.status === 404) return json({ ok: true, data: DEFAULT_STYLES });
    if (!response.ok) return json({ ok: false, error: `Falha ao carregar formatação dos vídeos (${response.status}).` }, 502);
    const payload = await response.json();
    if (!payload?.content) return json({ ok: true, data: DEFAULT_STYLES });
    const parsed = JSON.parse(fromBase64Utf8(payload.content));
    return json({ ok: true, data: normalizeStyles(parsed) });
  } catch {
    return json({ ok: false, error: 'Falha ao carregar formatação dos vídeos.' }, 502);
  }
}
