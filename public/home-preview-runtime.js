(() => {
  'use strict';

  const TOKEN_PARAM = '_pa_home_preview';
  const STORAGE_PREFIX = 'pa-safra-home-preview:';
  const token = new URLSearchParams(window.location.search).get(TOKEN_PARAM);
  if (!token || !/^[a-z0-9-]{8,120}$/i.test(token)) return;

  let draft = null;
  try {
    draft = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${token}`) || 'null');
  } catch {}

  if (!draft || draft.version !== 1 || !Number.isFinite(draft.expires_at) || draft.expires_at <= Date.now()) {
    try { localStorage.removeItem(`${STORAGE_PREFIX}${token}`); } catch {}
    return;
  }

  const patch = draft.site_patch;
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return;

  const previousFetch = window.fetch.bind(window);

  function sameOriginUrl(input) {
    try {
      const raw = input instanceof Request ? input.url : input;
      const url = new URL(String(raw), window.location.href);
      return url.origin === window.location.origin ? url : null;
    } catch {
      return null;
    }
  }

  function methodOf(input, init) {
    if (init?.method) return String(init.method).toUpperCase();
    if (input instanceof Request && input.method) return String(input.method).toUpperCase();
    return 'GET';
  }

  function isSiteRead(url, method) {
    if (!url || method !== 'GET') return false;
    if (url.pathname === '/content/site.json') return true;
    return url.pathname === '/api/content' && url.searchParams.get('resource') === 'site';
  }

  function mergeSite(site) {
    const source = site && typeof site === 'object' && !Array.isArray(site) ? site : {};
    return {
      ...source,
      brand_tagline: typeof patch.brand_tagline === 'string' ? patch.brand_tagline : source.brand_tagline,
      hero: {
        ...(source.hero && typeof source.hero === 'object' ? source.hero : {}),
        ...(patch.hero && typeof patch.hero === 'object' ? patch.hero : {}),
      },
      home: {
        ...(source.home && typeof source.home === 'object' ? source.home : {}),
        ...(patch.home && typeof patch.home === 'object' ? patch.home : {}),
      },
    };
  }

  window.fetch = async (input, init) => {
    const url = sameOriginUrl(input);
    const method = methodOf(input, init);
    const response = await previousFetch(input, init);
    if (!isSiteRead(url, method) || !response.ok) return response;

    try {
      const source = await response.clone().json();
      const headers = new Headers(response.headers);
      headers.set('content-type', 'application/json; charset=utf-8');
      headers.set('cache-control', 'no-store, max-age=0');
      return new Response(JSON.stringify(mergeSite(source)), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch {
      return response;
    }
  };
})();
