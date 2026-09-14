(() => {
  'use strict';

  const MUTATING_PATHS = new Set([
    '/api/admin/content',
    '/api/admin/title-styles',
    '/api/admin/video-styles',
  ]);
  const RETRY_DELAYS_MS = [250, 800, 1600];
  const nativeFetch = window.fetch.bind(window);
  let writeTail = Promise.resolve();

  function methodOf(input, init) {
    if (init?.method) return String(init.method).toUpperCase();
    if (input instanceof Request && input.method) return String(input.method).toUpperCase();
    return 'GET';
  }

  function sameOriginPath(input) {
    try {
      const raw = input instanceof Request ? input.url : input;
      const url = new URL(String(raw), window.location.href);
      return url.origin === window.location.origin ? url.pathname : '';
    } catch {
      return '';
    }
  }

  function isEditorialWrite(input, init) {
    return methodOf(input, init) === 'PUT' && MUTATING_PATHS.has(sameOriginPath(input));
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function requestForAttempt(input, init) {
    if (input instanceof Request) return input.clone();
    return input;
  }

  async function performWithRetry(input, init) {
    let response = null;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      response = await nativeFetch(requestForAttempt(input, init), init);
      if (response.status !== 502 || attempt === RETRY_DELAYS_MS.length) return response;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
    return response;
  }

  window.fetch = (input, init) => {
    if (!isEditorialWrite(input, init)) return nativeFetch(input, init);

    const execute = () => performWithRetry(input, init);
    const result = writeTail.then(execute, execute);
    writeTail = result.then(() => undefined, () => undefined);
    return result;
  };

  window.PASafraAdminWriteQueue = Object.freeze({
    paths: [...MUTATING_PATHS],
  });
})();
