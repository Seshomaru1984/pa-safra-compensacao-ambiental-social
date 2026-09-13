(() => {
  'use strict';

  const immediateViews = new Set(['inicio', 'sobre', 'legado']);
  const deferredViews = new Set(['palestras', 'galeria', 'recursos']);
  const rawHash = window.location.hash.replace(/^#/, '').trim().toLowerCase();
  const requestedView = rawHash === 'noticias' ? 'inicio' : (rawHash || 'inicio');
  const initialView = immediateViews.has(requestedView) ? requestedView : 'pending';

  document.documentElement.dataset.paInitialView = initialView;

  const clearGate = () => {
    delete document.documentElement.dataset.paInitialView;
  };

  const priorityImages = {
    sobre: '/assets/img/rio-nova-xavantina.jpg',
    legado: '/assets/img/registro-historico.jpg',
  };
  const image = priorityImages[requestedView];
  if (image && !document.head.querySelector(`link[rel="preload"][href="${image}"]`)) {
    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'image';
    preload.href = image;
    preload.fetchPriority = 'high';
    document.head.appendChild(preload);
  }

  window.addEventListener('hashchange', clearGate, { once: true });

  document.addEventListener('DOMContentLoaded', () => {
    if (requestedView === 'inicio') {
      clearGate();
      return;
    }

    const selector = `[data-view="${CSS.escape(requestedView)}"]`;
    const revealWhenReady = () => {
      const target = document.querySelector(selector);
      if (target && !target.hasAttribute('hidden')) {
        clearGate();
        return true;
      }
      return false;
    };

    if (revealWhenReady()) return;

    const observer = new MutationObserver(() => {
      if (!revealWhenReady()) return;
      observer.disconnect();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['hidden'],
    });

    window.setTimeout(() => {
      observer.disconnect();
      clearGate();
    }, deferredViews.has(requestedView) ? 8000 : 5000);
  }, { once: true });
})();
