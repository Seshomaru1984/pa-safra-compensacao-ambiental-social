const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, max-age=0',
  },
});

function allowedEmails(env) {
  return String(env.PA_SAFRA_ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export async function onRequestGet({ request, env }) {
  const email = String(request.headers.get('Cf-Access-Authenticated-User-Email') || '')
    .trim()
    .toLowerCase();
  const enabled = String(env.PA_SAFRA_ADMIN_ENABLED || '').toLowerCase() === 'true';
  const tokenConfigured = Boolean(String(env.GITHUB_CONTENT_TOKEN || '').trim());
  const allowlist = allowedEmails(env);
  const authenticated = Boolean(email);
  const authorized = authenticated && allowlist.includes(email);

  return json({
    mode: 'native-admin',
    enabled,
    authenticated,
    authorized,
    token_configured: tokenConfigured,
    write_enabled: enabled && tokenConfigured && authorized,
    user: authorized ? email : null,
    branch: String(env.PA_SAFRA_CONTENT_BRANCH || 'main'),
    message: enabled
      ? (authorized
          ? (tokenConfigured ? 'Painel pronto para publicar.' : 'Token de publicação ainda não configurado.')
          : 'Autenticação administrativa necessária.')
      : 'Escrita administrativa desativada até a configuração segura do Cloudflare Access.',
  });
}
