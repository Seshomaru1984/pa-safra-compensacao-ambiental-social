const REPOSITORY = 'Seshomaru1984/pa-safra-compensacao-ambiental-social';
const FILE_PATH = 'public/content/title-styles.json';
const COOKIE_NAME = 'pa_safra_admin_session';
const ALLOWED_CONTENT_BRANCH = 'content/pa-v001-admin-preview';
const TITLE_KEYS = ['home_hero', 'home_intro', 'about_hero', 'lectures_hero', 'gallery_hero', 'resources_hero', 'legacy_hero', 'extra_pages'];
const ALLOWED_SIZES = new Set(['default', 'small', 'medium', 'large', 'display']);
const ALLOWED_ALIGNS = new Set(['default', 'left', 'center', 'right']);
const ALLOWED_WEIGHTS = new Set(['default', 'regular', 'semibold', 'bold']);
const MAX_BODY_BYTES = 12_000;

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

function bytesFromBase64Url(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64UrlFromBytes(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function constantTimeEqual(left, right) {
  const a = left instanceof Uint8Array ? left : new TextEncoder().encode(String(left));
  const b = right instanceof Uint8Array ? right : new TextEncoder().encode(String(right));
  const size = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < size; i += 1) diff |= (a[i] || 0) ^ (b[i] || 0);
  return diff === 0;
}

function cookieValue(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return '';
}

async function verifySession(request, env) {
  const secret = String(env.PA_SAFRA_SESSION_SECRET || '');
  if (secret.length < 32) return null;
  const token = cookieValue(request, COOKIE_NAME);
  const [payloadEncoded, signatureEncoded, extra] = String(token || '').split('.');
  if (!payloadEncoded || !signatureEncoded || extra) return null;

  try {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadEncoded));
    const expected = base64UrlFromBytes(new Uint8Array(signature));
    if (!constantTimeEqual(expected, signatureEncoded)) return null;
    const payload = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(payloadEncoded)));
    const now = Math.floor(Date.now() / 1000);
    const configuredUser = String(env.PA_SAFRA_ADMIN_USER || '').trim().toLowerCase();
    if (!payload || payload.v !== 1 || payload.sub !== configuredUser || !Number.isInteger(payload.exp) || payload.exp <= now) return null;
    return { user: payload.sub, exp: payload.exp };
  } catch {
    return null;
  }
}

async function authorize(request, env, { write = false } = {}) {
  if (String(env.PA_SAFRA_ADMIN_ENABLED || '').toLowerCase() !== 'true') {
    return { ok: false, status: 503, error: 'Administração ainda não habilitada.' };
  }
  const branch = String(env.PA_SAFRA_CONTENT_BRANCH || '').trim();
  if (branch !== ALLOWED_CONTENT_BRANCH) {
    return { ok: false, status: 503, error: 'Branch editorial de Preview não configurada ou não autorizada.' };
  }
  const token = String(env.GITHUB_CONTENT_TOKEN || '').trim();
  if (!token) return { ok: false, status: 503, error: 'Credencial de publicação não configurada.' };
  const session = await verifySession(request, env);
  if (!session) return { ok: false, status: 401, error: 'Sessão administrativa inválida ou expirada.' };

  if (write) {
    const origin = request.headers.get('Origin');
    if (!origin || origin !== new URL(request.url).origin) return { ok: false, status: 403, error: 'Origem da requisição não autorizada.' };
    const fetchSite = request.headers.get('Sec-Fetch-Site');
    if (fetchSite && fetchSite !== 'same-origin') return { ok: false, status: 403, error: 'Contexto da requisição não autorizado.' };
  }

  return { ok: true, token, user: session.user, branch };
}

function rejectUnknown(object, allowed, name) {
  for (const key of Object.keys(object)) if (!allowed.includes(key)) throw new Error(`Campo não permitido em ${name}: ${key}`);
}

function validateColor(value) {
  if (value === 'default') return 'default';
  if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  throw new Error('Cor de título inválida.');
}

function validateEntry(entry, key) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`Formatação inválida para ${key}.`);
  rejectUnknown(entry, ['size', 'align', 'color', 'weight', 'italic'], `formatação ${key}`);
  if (!ALLOWED_SIZES.has(entry.size)) throw new Error(`Tamanho inválido para ${key}.`);
  if (!ALLOWED_ALIGNS.has(entry.align)) throw new Error(`Alinhamento inválido para ${key}.`);
  if (!ALLOWED_WEIGHTS.has(entry.weight)) throw new Error(`Peso inválido para ${key}.`);
  if (typeof entry.italic !== 'boolean') throw new Error(`Itálico inválido para ${key}.`);
  return {
    size: entry.size,
    align: entry.align,
    color: validateColor(entry.color),
    weight: entry.weight,
    italic: entry.italic,
  };
}

export function validateTitleStyles(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Formatação de títulos deve ser um objeto.');
  rejectUnknown(data, ['version', 'titles'], 'formatação de títulos');
  if (data.version !== 1) throw new Error('Versão de formatação de títulos inválida.');
  if (!data.titles || typeof data.titles !== 'object' || Array.isArray(data.titles)) throw new Error('Títulos devem ser um objeto.');
  rejectUnknown(data.titles, TITLE_KEYS, 'títulos');

  return {
    version: 1,
    titles: Object.fromEntries(TITLE_KEYS.map((key) => [key, validateEntry(data.titles[key], key)])),
  };
}

function toBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

function fromBase64Utf8(value) {
  const binary = atob(String(value || '').replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function githubRequest(path, token, init = {}) {
  return fetch(`https://api.github.com/repos/${REPOSITORY}${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2026-03-10',
      'user-agent': 'pa-safra-native-admin-title-style/1.0',
      ...(init.headers || {}),
    },
  });
}

async function readCurrent(auth) {
  const current = await githubRequest(`/contents/${FILE_PATH}?ref=${encodeURIComponent(auth.branch)}`, auth.token);
  if (current.status === 404) return { data: structuredClone(DEFAULT_STYLES), sha: null };
  if (!current.ok) throw new Error(`Não foi possível carregar a formatação atual (${current.status}).`);
  const payload = await current.json();
  if (!payload?.content) throw new Error('Conteúdo atual da formatação não encontrado.');
  const parsed = JSON.parse(fromBase64Utf8(payload.content));
  return { data: validateTitleStyles(parsed), sha: payload.sha || null };
}

export async function onRequestGet({ request, env }) {
  const auth = await authorize(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);
  try {
    const current = await readCurrent(auth);
    return json({ ok: true, data: current.data, branch: auth.branch, user: auth.user });
  } catch (error) {
    return json({ ok: false, error: error.message || 'Falha ao carregar a formatação.' }, 502);
  }
}

export async function onRequestPut({ request, env }) {
  const auth = await authorize(request, env, { write: true });
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY_BYTES) return json({ ok: false, error: 'Alteração grande demais.' }, 413);

  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) throw new Error('Alteração grande demais.');
    body = JSON.parse(raw);
  } catch (error) {
    return json({ ok: false, error: error.message || 'JSON inválido.' }, 400);
  }

  let data;
  try {
    data = validateTitleStyles(body?.data);
  } catch (error) {
    return json({ ok: false, error: error.message }, 422);
  }

  let current;
  try {
    current = await readCurrent(auth);
  } catch (error) {
    return json({ ok: false, error: error.message }, 502);
  }

  const payload = {
    message: 'content(admin): atualizar formatação assistida de títulos',
    content: toBase64Utf8(`${JSON.stringify(data, null, 2)}\n`),
    branch: auth.branch,
  };
  if (current.sha) payload.sha = current.sha;

  const update = await githubRequest(`/contents/${FILE_PATH}`, auth.token, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await update.json().catch(() => ({}));
  if (!update.ok) return json({ ok: false, error: result?.message || `Falha de publicação (${update.status}).` }, 502);

  return json({
    ok: true,
    data,
    message: 'Formatação de títulos enviada para publicação.',
    commit: result?.commit?.sha || null,
    branch: auth.branch,
    user: auth.user,
  });
}
