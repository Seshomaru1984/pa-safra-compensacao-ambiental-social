(() => {
  'use strict';

  const root = document.documentElement;
  const nativeFetch = window.fetch.bind(window);
  const rawHash = window.location.hash.replace(/^#/, '').trim().toLowerCase();
  const requestedView = rawHash === 'noticias' ? 'inicio' : (rawHash || 'inicio');
  const immediateViews = new Set(['inicio', 'sobre', 'legado']);
  const initialView = immediateViews.has(requestedView) ? requestedView : 'pending';

  const criticalContentPaths = new Set([
    '/content/site.json',
    '/content/videos.json',
    '/content/paginas.json',
    '/content/destaques.json',
    '/content/galeria.json',
    '/content/links.json',
  ]);
  const trackedPaths = new Set([
    ...criticalContentPaths,
    '/api/layout',
    '/content/layout.json',
    '/api/title-styles',
    '/content/title-styles.json',
    '/api/page-headers',
    '/content/page-headers.json',
  ]);

  root.dataset.paInitialView = initialView;
  root.dataset.paBoot = 'loading';

  const priorityImages = {
    sobre: '/assets/img/rio-nova-xavantina.jpg',
    legado: '/assets/img/registro-historico.jpg',
  };
  const priorityImage = priorityImages[requestedView];
  if (priorityImage && !document.head.querySelector(`link[rel="preload"][href="${priorityImage}"]`)) {
    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'image';
    preload.href = priorityImage;
    preload.fetchPriority = 'high';
    document.head.appendChild(preload);
  }

  let pendingTrackedFetches = 0;
  let domReady = false;
  let revealing = false;
  let checkTimer = 0;
  let observer = null;
  const seenContentPaths = new Set();

  function trackedPath(input) {
    try {
      const raw = input instanceof Request ? input.url : input;
      const url = new URL(String(raw), window.location.href);
      if (url.origin !== window.location.origin) return '';
      return url.pathname;
    } catch {
      return '';
    }
  }

  window.fetch = (...args) => {
    const path = trackedPath(args[0]);
    const tracked = trackedPaths.has(path);
    if (tracked) {
      pendingTrackedFetches += 1;
      if (criticalContentPaths.has(path)) seenContentPaths.add(path);
    }

    return nativeFetch(...args).finally(() => {
      if (!tracked) return;
      pendingTrackedFetches = Math.max(0, pendingTrackedFetches - 1);
      scheduleCheck();
    });
  };

  function bootSignalsReady() {
    if (!domReady) return false;
    if (pendingTrackedFetches !== 0) return false;
    if (seenContentPaths.size < criticalContentPaths.size) return false;
    if (document.querySelector('[data-nav="noticias"]')) return false;
    if (!document.querySelector('.hero-grid[data-assisted-layout]')) return false;
    if (!document.querySelector('#titulo-inicio[data-title-assist]')) return false;
    const activeView = document.querySelector('.view.is-active:not([hidden])');
    if (!activeView) return false;
    if (activeView.dataset.view !== 'inicio' && !activeView.querySelector('.page-hero[data-page-header]')) return false;
    return true;
  }

  function imageReady(image) {
    if (!image) return Promise.resolve();
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();
    if (typeof image.decode === 'function') return image.decode().catch(() => {});
    return new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    });
  }

  async function waitForCriticalImages() {
    const activeView = document.querySelector('.view.is-active:not([hidden])');
    if (!activeView) return;
    const images = [...activeView.querySelectorAll('.hero-media img, .page-hero img, .legacy-photo img')].slice(0, 2);
    if (!images.length) return;

    await Promise.race([
      Promise.all(images.map(imageReady)),
      new Promise((resolve) => window.setTimeout(resolve, 1400)),
    ]);
  }

  function nextPaint() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function reveal({ forced = false } = {}) {
    if (revealing) return;
    if (!forced && !bootSignalsReady()) return;
    revealing = true;

    if (!forced) await waitForCriticalImages();
    await nextPaint();

    observer?.disconnect();
    window.clearTimeout(checkTimer);
    delete root.dataset.paInitialView;
    delete root.dataset.paBoot;
    window.fetch = nativeFetch;
  }

  function scheduleCheck() {
    if (revealing) return;
    window.clearTimeout(checkTimer);
    checkTimer = window.setTimeout(() => {
      if (!bootSignalsReady()) return;
      void reveal();
    }, 48);
  }

  document.addEventListener('DOMContentLoaded', () => {
    domReady = true;
    observer = new MutationObserver(scheduleCheck);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        'hidden', 'class', 'data-assisted-layout', 'data-title-assist', 'data-title-size', 'data-title-align',
        'data-page-header', 'data-page-header-size',
      ],
    });
    scheduleCheck();
  }, { once: true });

  window.addEventListener('hashchange', scheduleCheck);

  window.setTimeout(() => {
    if (!revealing) void reveal({ forced: true });
  }, 8000);
})();
