const COOKIE_NAME = 'pa_safra_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_BODY_BYTES = 8_000;
const RATE_WINDOW_SECONDS = 15 * 60;
const RATE_LOCK_SECONDS = 15 * 60;
const RATE_MAX_FAILURES = 5;

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

function rateStore(env) {
  const kv = env.PA_SAFRA_AUTH_KV;
  if (!kv || typeof kv.get !== 'function' || typeof kv.put !== 'function' || typeof kv.delete !== 'function') return null;
  return kv;
}

async function loginRateKey(request) {
  const client = String(request.headers.get('CF-Connecting-IP') || 'unknown').trim();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`pa-safra-admin-login|${client}`));
  return `login:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

async function readRateState(kv, key) {
  const raw = await kv.get(key);
  if (!raw) return { count: 0, window_started_at: 0, blocked_until: 0 };
  try {
    const parsed = JSON.parse(raw);
    return {
      count: Number.isInteger(parsed?.count) ? parsed.count : 0,
      window_started_at: Number.isInteger(parsed?.window_started_at) ? parsed.window_started_at : 0,
      blocked_until: Number.isInteger(parsed?.blocked_until) ? parsed.blocked_until : 0,
    };
  } catch {
    return { count: 0, window_started_at: 0, blocked_until: 0 };
  }
}

function limitedResponse(blockedUntil) {
  const now = Math.floor(Date.now() / 1000);
  const retryAfter = Math.max(1, blockedUntil - now);
  return json({
    ok: false,
    error: 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.',
    retry_after_seconds: retryAfter,
  }, 429, { 'retry-after': String(retryAfter) });
}

async function registerFailure(kv, key, previous) {
  const now = Math.floor(Date.now() / 1000);
  const withinWindow = previous.window_started_at > 0 && now - previous.window_started_at < RATE_WINDOW_SECONDS;
  const count = (withinWindow ? previous.count : 0) + 1;
  const windowStartedAt = withinWindow ? previous.window_started_at : now;
  const blockedUntil = count >= RATE_MAX_FAILURES ? now + RATE_LOCK_SECONDS : 0;
  const state = {
    count,
    window_started_at: windowStartedAt,
    blocked_until: blockedUntil,
  };
  await kv.put(key, JSON.stringify(state), {
    expirationTtl: Math.max(RATE_WINDOW_SECONDS, RATE_LOCK_SECONDS) + 120,
  });
  return state;
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

  const kv = rateStore(env);
  if (!kv) {
    return json({ ok: false, error: 'Proteção contra tentativas repetidas ainda não configurada.' }, 503);
  }

  let rateKey;
  let rateState;
  try {
    rateKey = await loginRateKey(request);
    rateState = await readRateState(kv, rateKey);
  } catch {
    return json({ ok: false, error: 'Proteção de acesso temporariamente indisponível.' }, 503);
  }

  const now = Math.floor(Date.now() / 1000);
  if (rateState.blocked_until > now) return limitedResponse(rateState.blocked_until);

  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY_BYTES) return json({ ok: false, error: 'Requisição inválida.' }, 413);

  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) throw new Error('Requisição inválida.');
    body = JSON.parse(raw);
  } catch {
    try {
      const next = await registerFailure(kv, rateKey, rateState);
      if (next.blocked_until > now) return limitedResponse(next.blocked_until);
    } catch {
      return json({ ok: false, error: 'Proteção de acesso temporariamente indisponível.' }, 503);
    }
    return json({ ok: false, error: 'Usuário ou senha inválidos.' }, 401);
  }

  const username = String(body?.username || '').trim().toLowerCase();
  const password = String(body?.password || '');
  if (!username || !password || username.length > 80 || password.length > 256) {
    try {
      const next = await registerFailure(kv, rateKey, rateState);
      if (next.blocked_until > now) return limitedResponse(next.blocked_until);
    } catch {
      return json({ ok: false, error: 'Proteção de acesso temporariamente indisponível.' }, 503);
    }
    return json({ ok: false, error: 'Usuário ou senha inválidos.' }, 401);
  }

  const configuredUser = String(env.PA_SAFRA_ADMIN_USER || '').trim().toLowerCase();
  const passwordOk = await verifyPassword(password, env.PA_SAFRA_ADMIN_PASSWORD_HASH);
  const userOk = constantTimeEqual(username, configuredUser);
  if (!passwordOk || !userOk) {
    try {
      const next = await registerFailure(kv, rateKey, rateState);
      if (next.blocked_until > now) return limitedResponse(next.blocked_until);
    } catch {
      return json({ ok: false, error: 'Proteção de acesso temporariamente indisponível.' }, 503);
    }
    return json({ ok: false, error: 'Usuário ou senha inválidos.' }, 401);
  }

  try {
    await kv.delete(rateKey);
  } catch {
    // Falha ao limpar contador não invalida uma autenticação já comprovada.
  }

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
