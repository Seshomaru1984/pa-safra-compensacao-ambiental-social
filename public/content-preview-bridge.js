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

  const nativeFetch = window.fetch.bind(window);

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

  window.fetch = async (input, init) => {
    const url = sameOriginUrl(input);
    const resource = url ? RESOURCE_BY_PATH[url.pathname] : null;
    if (!resource || requestMethod(input, init) !== 'GET') return nativeFetch(input, init);

    const editorialUrl = new URL('/api/content', window.location.origin);
    editorialUrl.searchParams.set('resource', resource);

    try {
      const response = await nativeFetch(editorialUrl.toString(), {
        ...init,
        method: 'GET',
        cache: 'no-store',
        credentials: init?.credentials || 'same-origin',
      });
      if (response.ok) return response;
    } catch {}

    return nativeFetch(input, init);
  };
})();
