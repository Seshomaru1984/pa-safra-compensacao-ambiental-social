const COOKIE_NAME = 'pa_safra_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_BODY_BYTES = 8_000;
const RATE_WINDOW_SECONDS = 15 * 60;
const RATE_LOCK_SECONDS = 15 * 60;
const RATE_MAX_FAILURES = 5;
const PBKDF2_ITERATIONS = 100_000;

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
  if (!Number.isInteger(iterations)) return false;
  if (iterations !== PBKDF2_ITERATIONS) {
    throw new Error(`PBKDF2_ITERATIONS_UNSUPPORTED:${iterations}`);
  }

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
  const db = env.PA_SAFRA_AUTH_DB;
  if (!db || typeof db.prepare !== 'function' || typeof db.batch !== 'function') return null;
  return db;
}

async function loginRateKey(request) {
  const client = String(request.headers.get('CF-Connecting-IP') || 'unknown').trim();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`pa-safra-admin-login|${client}`));
  return `login:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

async function readRateState(db, key) {
  const row = await db
    .prepare('SELECT count, window_started_at, blocked_until FROM admin_login_rate WHERE client_key = ? LIMIT 1')
    .bind(key)
    .first();

  if (!row) return { count: 0, window_started_at: 0, blocked_until: 0 };
  return {
    count: Number.isInteger(row.count) ? row.count : Number(row.count || 0),
    window_started_at: Number.isInteger(row.window_started_at) ? row.window_started_at : Number(row.window_started_at || 0),
    blocked_until: Number.isInteger(row.blocked_until) ? row.blocked_until : Number(row.blocked_until || 0),
  };
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

async function registerFailure(db, key) {
  const now = Math.floor(Date.now() / 1000);
  const upsert = db.prepare(`
    INSERT INTO admin_login_rate (
      client_key, count, window_started_at, blocked_until, updated_at
    ) VALUES (?, 1, ?, 0, ?)
    ON CONFLICT(client_key) DO UPDATE SET
      count = CASE
        WHEN admin_login_rate.blocked_until > ? THEN admin_login_rate.count
        WHEN ? - admin_login_rate.window_started_at < ? THEN admin_login_rate.count + 1
        ELSE 1
      END,
      window_started_at = CASE
        WHEN admin_login_rate.blocked_until > ? THEN admin_login_rate.window_started_at
        WHEN ? - admin_login_rate.window_started_at < ? THEN admin_login_rate.window_started_at
        ELSE ?
      END,
      blocked_until = CASE
        WHEN admin_login_rate.blocked_until > ? THEN admin_login_rate.blocked_until
        WHEN (CASE
          WHEN ? - admin_login_rate.window_started_at < ? THEN admin_login_rate.count + 1
          ELSE 1
        END) >= ? THEN ? + ?
        ELSE 0
      END,
      updated_at = ?
  `).bind(
    key, now, now,
    now, now, RATE_WINDOW_SECONDS,
    now, now, RATE_WINDOW_SECONDS, now,
    now, now, RATE_WINDOW_SECONDS, RATE_MAX_FAILURES, now, RATE_LOCK_SECONDS,
    now,
  );

  const select = db
    .prepare('SELECT count, window_started_at, blocked_until FROM admin_login_rate WHERE client_key = ? LIMIT 1')
    .bind(key);

  const results = await db.batch([upsert, select]);
  const row = results?.[1]?.results?.[0];
  if (!row) throw new Error('Estado de bloqueio não retornado pelo D1.');

  return {
    count: Number(row.count || 0),
    window_started_at: Number(row.window_started_at || 0),
    blocked_until: Number(row.blocked_until || 0),
  };
}

async function clearFailures(db, key) {
  await db.prepare('DELETE FROM admin_login_rate WHERE client_key = ?').bind(key).run();
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

  const db = rateStore(env);
  if (!db) {
    return json({ ok: false, error: 'Proteção contra tentativas repetidas ainda não configurada.' }, 503);
  }

  let rateKey;
  let rateState;
  try {
    rateKey = await loginRateKey(request);
    rateState = await readRateState(db, rateKey);
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
      const next = await registerFailure(db, rateKey);
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
      const next = await registerFailure(db, rateKey);
      if (next.blocked_until > now) return limitedResponse(next.blocked_until);
    } catch {
      return json({ ok: false, error: 'Proteção de acesso temporariamente indisponível.' }, 503);
    }
    return json({ ok: false, error: 'Usuário ou senha inválidos.' }, 401);
  }

  const configuredUser = String(env.PA_SAFRA_ADMIN_USER || '').trim().toLowerCase();
  let passwordOk;
  try {
    passwordOk = await verifyPassword(password, env.PA_SAFRA_ADMIN_PASSWORD_HASH);
  } catch {
    return json({ ok: false, error: 'Configuração de credencial administrativa incompatível com o ambiente.' }, 503);
  }
  const userOk = constantTimeEqual(username, configuredUser);
  if (!passwordOk || !userOk) {
    try {
      const next = await registerFailure(db, rateKey);
      if (next.blocked_until > now) return limitedResponse(next.blocked_until);
    } catch {
      return json({ ok: false, error: 'Proteção de acesso temporariamente indisponível.' }, 503);
    }
    return json({ ok: false, error: 'Usuário ou senha inválidos.' }, 401);
  }

  try {
    await clearFailures(db, rateKey);
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
