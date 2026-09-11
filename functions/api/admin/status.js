const COOKIE_NAME = 'pa_safra_admin_session';

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
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
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

function credentialsConfigured(env) {
  return Boolean(
    String(env.PA_SAFRA_ADMIN_USER || '').trim()
    && String(env.PA_SAFRA_ADMIN_PASSWORD_HASH || '').trim()
    && String(env.PA_SAFRA_SESSION_SECRET || '').length >= 32,
  );
}

export async function onRequestGet({ request, env }) {
  const enabled = String(env.PA_SAFRA_ADMIN_ENABLED || '').toLowerCase() === 'true';
  const credentialsReady = credentialsConfigured(env);
  const tokenConfigured = Boolean(String(env.GITHUB_CONTENT_TOKEN || '').trim());
  const session = credentialsReady ? await verifySession(request, env) : null;
  const authenticated = Boolean(session);

  let message = 'Administração ainda não habilitada.';
  if (enabled && !credentialsReady) message = 'Login administrativo ainda não configurado.';
  else if (enabled && credentialsReady && !authenticated) message = 'Informe usuário e senha para acessar.';
  else if (enabled && authenticated && !tokenConfigured) message = 'Acesso autorizado; publicação ainda não configurada.';
  else if (enabled && authenticated && tokenConfigured) message = 'Painel pronto para publicar.';

  return json({
    mode: 'native-admin-password',
    enabled,
    credentials_configured: credentialsReady,
    authenticated,
    token_configured: tokenConfigured,
    write_enabled: enabled && credentialsReady && authenticated && tokenConfigured,
    user: authenticated ? session.user : null,
    session_expires_at: authenticated ? session.exp : null,
    branch: String(env.PA_SAFRA_CONTENT_BRANCH || 'main'),
    message,
  });
}
