(() => {
  'use strict';

  const fallbackSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
      <rect width="640" height="360" rx="24" fill="#173f35"/>
      <g fill="none" stroke="#d9c9a6" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity=".9">
        <path d="M320 88c-44 35-64 74-58 116 7 48 38 82 58 100 20-18 51-52 58-100 6-42-14-81-58-116Z"/>
        <path d="M320 112v138M276 177c26-3 61 5 88 26"/>
      </g>
      <text x="320" y="326" text-anchor="middle" fill="#f3eee2" font-family="Arial, sans-serif" font-size="22">Imagem indisponível</text>
    </svg>
  `)}`;

  const pendingInfoPattern = /(?:cr[eé]dito\s*\/\s*licen[çc]a|cr[eé]dito editorial)[\s\S]{0,120}a confirmar|cr[eé]ditos? em confer[eê]ncia/i;

  function arm(image) {
    if (!(image instanceof HTMLImageElement) || image.dataset.paFallbackArmed === 'true') return;
    image.dataset.paFallbackArmed = 'true';
    image.addEventListener('error', () => {
      if (image.dataset.paFallback === 'true') return;
      image.dataset.paFallback = 'true';
      image.removeAttribute('srcset');
      image.src = fallbackSvg;
    });
  }

  function syncStaticImageInformation() {
    document.querySelectorAll('.hero-media figcaption').forEach((caption) => {
      const text = caption.textContent.trim();
      if (!text || pendingInfoPattern.test(text)) {
        if (caption.textContent) caption.textContent = '';
        caption.hidden = true;
      }
    });
  }

  function syncGalleryInformation() {
    document.querySelectorAll('#galeria-list .gallery-card figcaption').forEach((caption) => {
      const main = caption.querySelector('strong');
      const credit = caption.querySelector('span');

      if (main?.textContent.trim() === 'Registro do projeto') main.remove();
      if (credit && pendingInfoPattern.test(credit.textContent.trim())) credit.remove();

      if (!caption.textContent.trim()) caption.remove();
    });
  }

  function syncImageInformation() {
    syncStaticImageInformation();
    syncGalleryInformation();
  }

  document.querySelectorAll('img').forEach(arm);
  syncImageInformation();

  const observer = new MutationObserver((mutations) => {
    let shouldSyncInformation = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList') shouldSyncInformation = true;
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('img')) arm(node);
        node.querySelectorAll?.('img').forEach(arm);
      }
    }
    if (shouldSyncInformation) queueMicrotask(syncImageInformation);
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
