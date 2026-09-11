const COOKIE_NAME = 'pa_safra_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_BODY_BYTES = 8_000;

const json = (data, status = 200, extraHeaders = {}) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, max-age=0',
    ...extraHeaders,
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
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
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

async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;

  let salt;
  let expected;
  try {
    salt = bytesFromBase64Url(parts[2]);
    expected = bytesFromBase64Url(parts[3]);
  } catch {
    return false;
  }
  if (salt.length < 16 || expected.length !== 32) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt,
    iterations,
  }, key, 256);
  return constantTimeEqual(new Uint8Array(bits), expected);
}

async function signSession(payload, secret) {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const payloadEncoded = base64UrlFromBytes(payloadBytes);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadEncoded));
  return `${payloadEncoded}.${base64UrlFromBytes(new Uint8Array(signature))}`;
}

function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}

function configured(env) {
  return Boolean(
    String(env.PA_SAFRA_ADMIN_USER || '').trim()
    && String(env.PA_SAFRA_ADMIN_PASSWORD_HASH || '').trim()
    && String(env.PA_SAFRA_SESSION_SECRET || '').length >= 32,
  );
}

export async function onRequestPost({ request, env }) {
  if (String(env.PA_SAFRA_ADMIN_ENABLED || '').toLowerCase() !== 'true') {
    return json({ ok: false, error: 'Administração ainda não habilitada.' }, 503);
  }
  if (!configured(env)) {
    return json({ ok: false, error: 'Credenciais administrativas ainda não configuradas.' }, 503);
  }
  if (!sameOrigin(request)) {
    return json({ ok: false, error: 'Origem da requisição não autorizada.' }, 403);
  }

  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY_BYTES) return json({ ok: false, error: 'Requisição inválida.' }, 413);

  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) throw new Error('Requisição inválida.');
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: 'Usuário ou senha inválidos.' }, 401);
  }

  const username = String(body?.username || '').trim().toLowerCase();
  const password = String(body?.password || '');
  if (!username || !password || username.length > 80 || password.length > 256) {
    return json({ ok: false, error: 'Usuário ou senha inválidos.' }, 401);
  }

  const configuredUser = String(env.PA_SAFRA_ADMIN_USER || '').trim().toLowerCase();
  const passwordOk = await verifyPassword(password, env.PA_SAFRA_ADMIN_PASSWORD_HASH);
  const userOk = constantTimeEqual(username, configuredUser);
  if (!passwordOk || !userOk) {
    return json({ ok: false, error: 'Usuário ou senha inválidos.' }, 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await signSession({
    sub: configuredUser,
    iat: now,
    exp: now + SESSION_SECONDS,
    v: 1,
  }, String(env.PA_SAFRA_SESSION_SECRET));

  const cookie = `${COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
  return json({ ok: true, user: configuredUser, message: 'Acesso autorizado.' }, 200, {
    'set-cookie': cookie,
  });
}

export function onRequest() {
  return json({ ok: false, error: 'Método não permitido.' }, 405);
}
