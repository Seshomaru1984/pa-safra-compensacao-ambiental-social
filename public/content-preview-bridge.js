(() => {
  'use strict';

  const RESOURCE_BY_PATH = Object.freeze({
    '/content/site.json': 'site',
    '/content/videos.json': 'videos',
    '/content/paginas.json': 'pages',
    '/content/destaques.json': 'highlights',
    '/content/galeria.json': 'gallery',
    '/content/links.json': 'links',
  });

  const UPDATE_KEY = 'pa-safra-editorial-updated';
  const nativeFetch = window.fetch.bind(window);
  let requestSerial = 0;

  function requestMethod(input, init) {
    if (init?.method) return String(init.method).toUpperCase();
    if (input instanceof Request && input.method) return String(input.method).toUpperCase();
    return 'GET';
  }

  function sameOriginUrl(input) {
    try {
      const raw = input instanceof Request ? input.url : input;
      const url = new URL(String(raw), window.location.href);
      return url.origin === window.location.origin ? url : null;
    } catch {
      return null;
    }
  }

  function freshToken() {
    requestSerial += 1;
    return `${Date.now()}-${requestSerial}`;
  }

  async function editorialFetch(resource) {
    const editorialUrl = new URL('/api/content', window.location.origin);
    editorialUrl.searchParams.set('resource', resource);
    editorialUrl.searchParams.set('_fresh', freshToken());
    return nativeFetch(editorialUrl.toString(), {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        accept: 'application/json',
        'cache-control': 'no-cache, no-store, max-age=0',
        pragma: 'no-cache',
      },
    });
  }

  function sameJson(left, right) {
    try {
      return JSON.stringify(left) === JSON.stringify(right);
    } catch {
      return false;
    }
  }

  const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  async function verifyEditorialWrite(resource, expected) {
    let lastStatus = 0;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        const response = await editorialFetch(resource);
        lastStatus = response.status;
        if (response.ok) {
          const actual = await response.json();
          if (sameJson(actual, expected)) return true;
        }
      } catch {}
      await wait(250 + (attempt * 100));
    }
    throw new Error(`A gravação foi aceita, mas o Preview ainda não confirmou o conteúdo salvo${lastStatus ? ` (HTTP ${lastStatus})` : ''}.`);
  }

  async function contentWritePayload(input, init) {
    try {
      if (typeof init?.body === 'string') return JSON.parse(init.body);
      if (input instanceof Request) return JSON.parse(await input.clone().text());
    } catch {}
    return null;
  }

  function verificationFailure(message) {
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 409,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store, max-age=0',
      },
    });
  }

  function signalEditorialUpdate(resource) {
    try {
      localStorage.setItem(UPDATE_KEY, JSON.stringify({ resource, at: Date.now() }));
    } catch {}
  }

  window.fetch = async (input, init) => {
    const url = sameOriginUrl(input);
    const method = requestMethod(input, init);
    const resource = url ? RESOURCE_BY_PATH[url.pathname] : null;

    if (resource && method === 'GET') {
      try {
        const response = await editorialFetch(resource);
        if (response.ok) return response;
      } catch {}
      return nativeFetch(input, init);
    }

    if (url?.pathname === '/api/admin/content' && method === 'PUT') {
      const payload = await contentWritePayload(input, init);
      const response = await nativeFetch(input, init);
      if (!response.ok || !payload?.resource || !Object.prototype.hasOwnProperty.call(payload, 'data')) return response;

      let result = null;
      try { result = await response.clone().json(); } catch {}
      if (!result?.ok) return response;

      try {
        await verifyEditorialWrite(String(payload.resource), payload.data);
        signalEditorialUpdate(String(payload.resource));
        return response;
      } catch (error) {
        return verificationFailure(error.message || 'O Preview não confirmou a alteração salva.');
      }
    }

    return nativeFetch(input, init);
  };

  if (!window.location.pathname.startsWith('/admin')) {
    let lastSeen = '';
    try { lastSeen = localStorage.getItem(UPDATE_KEY) || ''; } catch {}

    const refreshIfChanged = () => {
      let current = '';
      try { current = localStorage.getItem(UPDATE_KEY) || ''; } catch {}
      if (current && current !== lastSeen) window.location.reload();
    };

    window.addEventListener('storage', (event) => {
      if (event.key === UPDATE_KEY && event.newValue && event.newValue !== lastSeen) window.location.reload();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshIfChanged();
    });
  }
})();
