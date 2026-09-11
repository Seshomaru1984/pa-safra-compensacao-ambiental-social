const COOKIE_NAME = 'pa_safra_admin_session';

const json = (data, status = 200, extraHeaders = {}) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, max-age=0',
    ...extraHeaders,
  },
});

function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function onRequestPost({ request }) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'Origem da requisição não autorizada.' }, 403);
  return json({ ok: true, message: 'Sessão encerrada.' }, 200, {
    'set-cookie': `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
  });
}

export function onRequest() {
  return json({ ok: false, error: 'Método não permitido.' }, 405);
}
