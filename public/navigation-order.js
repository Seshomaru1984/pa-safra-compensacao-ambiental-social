(() => {
  'use strict';

  const ORDER = [
    'inicio',
    'sobre',
    'acesso-localizacao',
    'palestras',
    'galeria',
    'legado',
    'recursos',
    'contato',
  ];

  let syncing = false;

  function currentRelevantOrder(menu) {
    return [...menu.querySelectorAll('a[data-nav]')]
      .map((node) => node.dataset.nav || '')
      .filter((slug) => ORDER.includes(slug));
  }

  function arrangeNavigation() {
    const menu = document.getElementById('menu-principal');
    if (!menu || syncing) return;

    const access = menu.querySelector('[data-nav="acesso-localizacao"]');
    const contact = menu.querySelector('[data-nav="contato"]');
    if (!access || !contact) return;

    const nodes = new Map();
    for (const slug of ORDER) {
      const node = menu.querySelector(`[data-nav="${slug}"]`);
      if (node) nodes.set(slug, node);
    }
    const desired = ORDER.filter((slug) => nodes.has(slug));
    const current = currentRelevantOrder(menu);
    const alreadyOrdered = current.length === desired.length && current.every((slug, index) => slug === desired[index]);
    if (alreadyOrdered && contact.parentElement === menu) return;

    syncing = true;
    try {
      const cmsRoot = document.getElementById('cms-pages-nav');
      const genericPages = cmsRoot
        ? [...cmsRoot.querySelectorAll('a[data-nav]')].filter((node) => !['acesso-localizacao', 'contato'].includes(node.dataset.nav || ''))
        : [];

      for (const slug of ORDER.slice(0, 7)) {
        const node = nodes.get(slug);
        if (node) menu.appendChild(node);
      }

      if (cmsRoot) {
        genericPages.forEach((node) => cmsRoot.appendChild(node));
        menu.appendChild(cmsRoot);
      }

      const contactNode = nodes.get('contato');
      if (contactNode) menu.appendChild(contactNode);
    } finally {
      syncing = false;
    }
  }

  const menu = document.getElementById('menu-principal');
  if (!menu) return;

  const observer = new MutationObserver(() => queueMicrotask(arrangeNavigation));
  observer.observe(menu, { childList: true, subtree: true });
  queueMicrotask(arrangeNavigation);
})();