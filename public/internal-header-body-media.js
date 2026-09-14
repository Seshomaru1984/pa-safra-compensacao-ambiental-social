(() => {
  'use strict';

  function legacyNodes() {
    const view = document.querySelector('[data-view="legado"]');
    if (!view) return null;
    const source = view.querySelector('.legacy-grid .legacy-photo');
    const article = view.querySelector('.legacy-content .prose-card.emphasized');
    if (!source || !article) return null;
    return { view, source, article };
  }

  function syncLegacyInlinePhoto() {
    const nodes = legacyNodes();
    if (!nodes) return;
    const { source, article } = nodes;

    const sourceImage = source.querySelector('img');
    if (!sourceImage) return;

    let figure = article.querySelector('.legacy-inline-photo');
    if (!figure) {
      figure = document.createElement('figure');
      figure.className = 'legacy-inline-photo';
      const image = document.createElement('img');
      image.loading = 'lazy';
      image.decoding = 'async';
      const caption = document.createElement('figcaption');
      figure.append(image, caption);

      const firstParagraph = article.querySelector('p');
      if (firstParagraph) firstParagraph.after(figure);
      else article.prepend(figure);
    }

    const image = figure.querySelector('img');
    const caption = figure.querySelector('figcaption');
    const sourceCaption = source.querySelector('figcaption');

    const src = sourceImage.getAttribute('src') || '';
    const alt = sourceImage.getAttribute('alt') || '';
    if (image.getAttribute('src') !== src) image.setAttribute('src', src);
    if (image.getAttribute('alt') !== alt) image.setAttribute('alt', alt);

    const captionHtml = sourceCaption && !sourceCaption.hidden ? sourceCaption.innerHTML.trim() : '';
    const hasCaption = Boolean(captionHtml);
    if (caption.hidden === hasCaption) caption.hidden = !hasCaption;
    if (caption.innerHTML !== captionHtml) caption.innerHTML = captionHtml;
  }

  function applyLegacyCredit(value) {
    const nodes = legacyNodes();
    if (!nodes) return;
    const sourceCaption = nodes.source.querySelector('figcaption');
    if (!sourceCaption) return;

    const credit = typeof value === 'string' ? value.trim() : '';
    sourceCaption.hidden = !credit;
    sourceCaption.textContent = credit;
    syncLegacyInlinePhoto();
  }

  async function syncConfiguredLegacyCredit() {
    try {
      const response = await fetch('/content/site.json', { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) return;
      const site = await response.json();
      applyLegacyCredit(site?.legacy?.image_credit);
    } catch {
      // Mantém o conteúdo estático apenas se a configuração editorial não puder ser lida.
    }
  }

  function install() {
    const nodes = legacyNodes();
    if (!nodes) return;

    syncLegacyInlinePhoto();
    syncConfiguredLegacyCredit();

    const observer = new MutationObserver(() => syncLegacyInlinePhoto());
    observer.observe(nodes.view, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['src', 'alt', 'hidden'],
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
