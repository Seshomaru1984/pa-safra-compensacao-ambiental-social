(() => {
  'use strict';

  const baseViews = new Set(['inicio', 'sobre', 'palestras', 'galeria', 'recursos', 'legado']);
  const rawHash = window.location.hash.replace(/^#/, '').trim().toLowerCase();
  const initialView = baseViews.has(rawHash) ? rawHash : rawHash ? 'pending' : 'inicio';

  document.documentElement.dataset.paInitialView = initialView;

  const priorityImages = {
    sobre: '/assets/img/rio-nova-xavantina.jpg',
    legado: '/assets/img/registro-historico.jpg',
  };
  const image = priorityImages[initialView];
  if (!image || document.head.querySelector(`link[rel="preload"][href="${image}"]`)) return;

  const preload = document.createElement('link');
  preload.rel = 'preload';
  preload.as = 'image';
  preload.href = image;
  preload.fetchPriority = 'high';
  document.head.appendChild(preload);
})();
