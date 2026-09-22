(() => {
  'use strict';

  const selector = '[data-view="recursos"] .page-hero .shell > p:not(.eyebrow)';

  async function syncLinksIntro() {
    const node = document.querySelector(selector);
    if (!node) return;

    try {
      const response = await fetch('/content/links.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const intro = typeof data?.intro === 'string' ? data.intro.trim() : '';
      node.textContent = intro;
      node.hidden = !intro;
    } catch (error) {
      console.warn('[Fazenda Matrinchã] Não foi possível sincronizar a apresentação de Links úteis:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncLinksIntro, { once: true });
  } else {
    syncLinksIntro();
  }
})();
