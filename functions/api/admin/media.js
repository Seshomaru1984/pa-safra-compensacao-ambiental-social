const REPOSITORY = 'Seshomaru1984/pa-safra-compensacao-ambiental-social';
const ALLOWED_BRANCH = 'content/pa-v001-admin-preview';
const COOKIE_NAME = 'pa_safra_admin_session';
const MAX_FILE_BYTES = 4_000_000;
const MAX_BODY_CHARS = 5_600_000;
const MIME_TYPES = Object.freeze({
  'image/jpeg': { extension: 'jpg', contentType: 'image/jpeg' },
  'image/png': { extension: 'png', contentType: 'image/png' },
  'image/webp': { extension: 'webp', contentType: 'image/webp' },
});

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
    return payload;
  } catch {
    return null;
  }
}

async function authorize(request, env) {
  if (String(env.PA_SAFRA_ADMIN_ENABLED || '').toLowerCase() !== 'true') {
    return { ok: false, status: 503, error: 'Administração ainda não habilitada.' };
  }
  const branch = String(env.PA_SAFRA_CONTENT_BRANCH || '').trim();
  if (branch !== ALLOWED_BRANCH) {
    return { ok: false, status: 503, error: 'Branch editorial de Preview não configurada ou não autorizada.' };
  }
  const token = String(env.GITHUB_CONTENT_TOKEN || '').trim();
  if (!token) return { ok: false, status: 503, error: 'Credencial de publicação não configurada.' };
  const session = await verifySession(request, env);
  if (!session) return { ok: false, status: 401, error: 'Sessão administrativa inválida ou expirada.' };
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) return { ok: false, status: 403, error: 'Origem da requisição não autorizada.' };
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if (fetchSite && fetchSite !== 'same-origin') return { ok: false, status: 403, error: 'Contexto da requisição não autorizado.' };
  return { ok: true, token, branch };
}

function safeName(value) {
  const base = String(value || 'imagem')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'imagem';
}

function decodeBase64(value) {
  const clean = String(value || '').replace(/\s+/g, '');
  if (!clean || !/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) throw new Error('Conteúdo da imagem inválido.');
  const binary = atob(clean);
  if (binary.length > MAX_FILE_BYTES) throw new Error('A imagem excede o limite de 4 MB.');
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function magicMatches(bytes, mimeType) {
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((v, i) => bytes[i] === v);
  if (mimeType === 'image/webp') {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP';
  }
  return false;
}

export async function onRequestPut({ request, env }) {
  const auth = await authorize(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return json({ ok: false, error: 'Arquivo muito grande para envio.' }, 413);

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: 'Requisição de imagem inválida.' }, 400);
  }

  const mimeType = String(body?.mime_type || '').toLowerCase();
  const type = MIME_TYPES[mimeType];
  if (!type) return json({ ok: false, error: 'Formato não permitido. Use JPG, PNG ou WebP.' }, 400);

  let bytes;
  try {
    bytes = decodeBase64(body?.data_base64);
  } catch (error) {
    return json({ ok: false, error: error.message }, 400);
  }
  if (!magicMatches(bytes, mimeType)) return json({ ok: false, error: 'O conteúdo do arquivo não corresponde ao formato informado.' }, 400);

  const nonce = crypto.randomUUID().slice(0, 8);
  const fileName = `${Date.now()}-${nonce}-${safeName(body?.file_name)}.${type.extension}`;
  const repoPath = `public/assets/uploads/${fileName}`;
  const endpoint = `https://api.github.com/repos/${REPOSITORY}/contents/${repoPath}`;

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'PA-Safra-Admin',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      message: `content(media): adicionar ${fileName}`,
      content: String(body.data_base64).replace(/\s+/g, ''),
      branch: auth.branch,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = result?.message ? ` ${result.message}` : '';
    return json({ ok: false, error: `Falha ao armazenar a imagem (${response.status}).${detail}` }, response.status >= 500 ? 502 : 400);
  }

  return json({
    ok: true,
    path: `/assets/uploads/${fileName}`,
    file_name: fileName,
    size: bytes.length,
    mime_type: mimeType,
  });
}
