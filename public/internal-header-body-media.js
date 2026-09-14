(() => {
  'use strict';

  function syncLegacyInlinePhoto() {
    const view = document.querySelector('[data-view="legado"]');
    if (!view) return;

    const source = view.querySelector('.legacy-grid .legacy-photo');
    const article = view.querySelector('.legacy-content .prose-card.emphasized');
    if (!source || !article) return;

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

    const captionHtml = sourceCaption?.innerHTML || '';
    if (caption.innerHTML !== captionHtml) caption.innerHTML = captionHtml;
  }

  function install() {
    const view = document.querySelector('[data-view="legado"]');
    if (!view) return;

    syncLegacyInlinePhoto();

    const observer = new MutationObserver(() => syncLegacyInlinePhoto());
    observer.observe(view, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['src', 'alt'],
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
