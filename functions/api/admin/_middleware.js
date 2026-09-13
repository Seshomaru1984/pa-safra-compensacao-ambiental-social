const ALLOWED_CONTENT_BRANCH = 'content/pa-v001-admin-preview';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, max-age=0',
  },
});

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const isContentWrite = context.request.method === 'PUT' && url.pathname === '/api/admin/content';

  if (isContentWrite) {
    const branch = String(context.env.PA_SAFRA_CONTENT_BRANCH || '').trim();
    if (branch !== ALLOWED_CONTENT_BRANCH) {
      return json({
        ok: false,
        error: 'Branch editorial de Preview não configurada ou não autorizada.',
      }, 503);
    }
  }

  return context.next();
}
