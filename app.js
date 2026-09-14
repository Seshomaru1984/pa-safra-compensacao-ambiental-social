(() => {
  'use strict';

  const baseViews = ['inicio', 'sobre', 'palestras', 'galeria', 'recursos', 'legado'];
  const validViews = new Set(baseViews);
  const menu = document.getElementById('menu-principal');
  const menuToggle = document.querySelector('.menu-toggle');
  const year = document.getElementById('ano');
  const cmsPagesRoot = document.getElementById('cms-pages-root');
  const cmsPagesNav = document.getElementById('cms-pages-nav');

  const contentPaths = {
    site: '/content/site.json',
    news: '/content/noticias.json',
    videos: '/content/videos.json',
    pages: '/content/paginas.json',
    highlights: '/content/destaques.json',
    gallery: '/content/galeria.json',
    links: '/content/links.json',
  };

  function disableNewsModule() {
    document.querySelectorAll('[data-nav="noticias"], [data-view="noticias"]').forEach((node) => node.remove());
    if (window.location.hash.replace('#', '').trim().toLowerCase() === 'noticias') {
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}#inicio`);
    }
  }

  function resolveView() {
    const hash = window.location.hash.replace('#', '').trim().toLowerCase();
    return validViews.has(hash) ? hash : 'inicio';
  }

  function renderView({ focus = false } = {}) {
    const selected = resolveView();
    const views = [...document.querySelectorAll('[data-view]')];
    const navLinks = [...document.querySelectorAll('[data-nav]')];

    views.forEach((view) => {
      const active = view.dataset.view === selected;
      view.hidden = !active;
      view.classList.toggle('is-active', active);
    });

    navLinks.forEach((link) => {
      if (link.dataset.nav === selected) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    menu?.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (focus) document.getElementById('conteudo')?.focus({ preventScroll: true });
  }

  function setText(id, value) {
    if (typeof value !== 'string' || !value.trim()) return;
    const node = document.getElementById(id);
    if (node) node.textContent = value.trim();
  }

  const allowedRichTags = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'A', 'SPAN', 'DIV', 'BLOCKQUOTE']);
  const allowedStyleProperties = new Set(['color', 'font-size', 'text-align', 'font-weight', 'font-style', 'text-decoration']);

  function cleanStyle(value) {
    const result = [];
    for (const declaration of String(value || '').split(';')) {
      const index = declaration.indexOf(':');
      if (index < 1) continue;
      const property = declaration.slice(0, index).trim().toLowerCase();
      const raw = declaration.slice(index + 1).trim();
      if (!allowedStyleProperties.has(property) || !raw) continue;
      if (/url\s*\(|expression\s*\(|javascript:/i.test(raw)) continue;
      if (property === 'color' && !/^(?:#[0-9a-f]{3,8}|rgb\([^)]{1,80}\)|rgba\([^)]{1,80}\)|[a-z]{3,20})$/i.test(raw)) continue;
      if (property === 'font-size' && !/^(?:[0-9]{1,3}(?:\.[0-9]+)?(?:px|rem|em|%)|small|medium|large|x-large|xx-large)$/i.test(raw)) continue;
      if (property === 'text-align' && !/^(left|center|right|justify)$/i.test(raw)) continue;
      result.push(`${property}: ${raw}`);
    }
    return result.join('; ');
  }

  function sanitizeHtml(value) {
    const template = document.createElement('template');
    template.innerHTML = typeof value === 'string' ? value : '';

    template.content.querySelectorAll('script, style, iframe, object, embed, form, input, button, textarea, select, svg, math').forEach((node) => node.remove());

    template.content.querySelectorAll('*').forEach((node) => {
      if (!allowedRichTags.has(node.tagName)) {
        node.replaceWith(...node.childNodes);
        return;
      }

      [...node.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        if (name.startsWith('on')) {
          node.removeAttribute(attribute.name);
          return;
        }
        if (name === 'style') {
          const clean = cleanStyle(attribute.value);
          if (clean) node.setAttribute('style', clean);
          else node.removeAttribute('style');
          return;
        }
        if (node.tagName === 'A' && name === 'href') {
          const href = attribute.value.trim();
          if (!/^(https?:\/\/|mailto:|#|\/)/i.test(href)) node.removeAttribute('href');
          return;
        }
        if (!(node.tagName === 'A' && ['href', 'target', 'rel'].includes(name))) node.removeAttribute(attribute.name);
      });

      if (node.tagName === 'A') {
        node.setAttribute('rel', 'noopener noreferrer');
        if (node.getAttribute('href')?.startsWith('http')) node.setAttribute('target', '_blank');
      }
    });

    return template.innerHTML;
  }

  function setRichHtml(id, html) {
    if (typeof html !== 'string') return;
    const node = document.getElementById(id);
    if (node) node.innerHTML = sanitizeHtml(html);
  }

  function validHex(value) {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim());
  }

  function applySiteConfig(site) {
    if (!site || typeof site !== 'object') return;

    if (typeof site.page_title === 'string' && site.page_title.trim()) document.title = site.page_title.trim();
    const description = document.querySelector('meta[name="description"]');
    if (description && typeof site.description === 'string' && site.description.trim()) description.setAttribute('content', site.description.trim());

    setText('brand-name', site.brand_name);
    setText('brand-tagline', site.brand_tagline);

    const hero = site.hero || {};
    setText('hero-eyebrow', hero.eyebrow);
    setText('titulo-inicio', hero.title);
    setRichHtml('hero-lead', hero.lead);

    const heroImage = document.getElementById('hero-image');
    if (heroImage && typeof hero.image === 'string' && hero.image.trim()) heroImage.src = hero.image.trim();
    if (heroImage && typeof hero.image_alt === 'string' && hero.image_alt.trim()) heroImage.alt = hero.image_alt.trim();

    const heroCopy = document.querySelector('.hero-copy');
    if (heroCopy) {
      heroCopy.classList.toggle('align-right', hero.title_alignment === 'right');
      heroCopy.classList.toggle('align-center', hero.title_alignment === 'center');
      heroCopy.classList.toggle('title-compact', hero.title_size === 'compact');
      heroCopy.classList.toggle('title-small', hero.title_size === 'small');
    }

    const home = site.home || {};
    setText('home-intro-eyebrow', home.intro_eyebrow);
    setText('eixos-titulo', home.intro_title);
    setRichHtml('home-intro-text', home.intro_text);

    const about = site.about || {};
    setText('titulo-sobre', about.title);
    setRichHtml('about-summary', about.summary);
    setRichHtml('about-body', about.body);

    const legacy = site.legacy || {};
    const legacyView = document.querySelector('[data-view="legado"]');
    if (legacyView) {
      const eyebrow = legacyView.querySelector('.legacy-grid .eyebrow');
      const title = legacyView.querySelector('#titulo-legado');
      const image = legacyView.querySelector('.legacy-photo img');
      const credit = legacyView.querySelector('.legacy-photo figcaption');
      const article = legacyView.querySelector('.legacy-content .prose-card.emphasized');
      const source = legacyView.querySelector('.source-note');

      if (eyebrow && legacy.eyebrow) eyebrow.textContent = legacy.eyebrow;
      if (title && legacy.title) title.textContent = legacy.title;
      if (image && legacy.image) image.src = legacy.image;
      if (image && legacy.image_alt) image.alt = legacy.image_alt;
      if (credit && legacy.image_credit) credit.textContent = legacy.image_credit;
      if (article && typeof legacy.body === 'string') {
        article.innerHTML = sanitizeHtml(legacy.body);
        if (legacy.closing_quote) {
          const closing = document.createElement('p');
          closing.className = 'closing-quote';
          closing.textContent = legacy.closing_quote;
          article.appendChild(closing);
        }
      }
      if (source) {
        const sourceEyebrow = source.querySelector('.eyebrow');
        const sourceTitle = source.querySelector('h2');
        const sourceBody = source.querySelector('p:not(.eyebrow):not(.validation-note)');
        const sourceLink = source.querySelector('a');
        const validation = source.querySelector('.validation-note');
        if (sourceEyebrow && legacy.source_eyebrow) sourceEyebrow.textContent = legacy.source_eyebrow;
        if (sourceTitle && legacy.source_title) sourceTitle.textContent = legacy.source_title;
        if (sourceBody && legacy.source_body) sourceBody.textContent = legacy.source_body;
        if (sourceLink && legacy.source_url) sourceLink.href = legacy.source_url;
        if (sourceLink && legacy.source_link_label) sourceLink.textContent = legacy.source_link_label;
        if (validation && legacy.validation_note) validation.textContent = legacy.validation_note;
      }
    }

    const footer = site.footer || {};
    setText('footer-dedication', footer.dedication);
    setRichHtml('footer-institutional-note', footer.institutional_note);

    const root = document.documentElement;
    const theme = site.theme || {};
    if (validHex(theme.primary)) root.style.setProperty('--forest-700', theme.primary.trim());
    if (validHex(theme.accent)) root.style.setProperty('--clay-500', theme.accent.trim());
  }

  function renderHighlights(items) {
    const root = document.getElementById('destaques-list');
    if (!root) return;
    const published = Array.isArray(items) ? items.filter((item) => item && item.published !== false) : [];
    if (!published.length) return;
    root.replaceChildren();
    published.forEach((item, index) => {
      const article = document.createElement('article');
      article.className = 'feature-card';
      const number = document.createElement('span');
      number.className = 'feature-number';
      number.textContent = item.number || String(index + 1).padStart(2, '0');
      const title = document.createElement('h3');
      title.textContent = item.title || 'Destaque';
      const text = document.createElement('div');
      text.className = 'cms-richtext';
      text.innerHTML = sanitizeHtml(item.text || '');
      article.append(number, title, text);
      root.appendChild(article);
    });
  }

  function renderGallery(items) {
    const root = document.getElementById('galeria-list');
    if (!root) return;
    const published = Array.isArray(items)
      ? items.filter((item) => item && item.published !== false && typeof item.image === 'string' && item.image.trim())
      : [];
    if (!published.length) return;
    root.replaceChildren();
    published.forEach((item) => {
      const figure = document.createElement('figure');
      figure.className = 'gallery-card';
      const image = document.createElement('img');
      image.src = item.image.trim();
      image.alt = item.image_alt || '';
      image.loading = 'lazy';
      const caption = document.createElement('figcaption');
      const main = document.createElement('strong');
      main.textContent = item.caption || 'Registro do projeto';
      caption.appendChild(main);
      if (item.credit) {
        const credit = document.createElement('span');
        credit.textContent = item.credit;
        caption.appendChild(credit);
      }
      figure.append(image, caption);
      root.appendChild(figure);
    });
  }

  function youtubeId(url) {
    if (typeof url !== 'string') return null;
    try {
      const parsed = new URL(url.trim());
      const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (['embed', 'shorts', 'live'].includes(parts[0])) return parts[1] || null;
      }
    } catch {}
    return null;
  }

  function renderVideos(items) {
    const root = document.getElementById('videos-list');
    if (!root) return;
    const published = Array.isArray(items)
      ? items.filter((item) => item && item.published !== false && youtubeId(item.youtube_url))
      : [];
    if (!published.length) return;
    root.replaceChildren();
    published.forEach((item) => {
      const id = youtubeId(item.youtube_url);
      const card = document.createElement('article');
      card.className = 'video-card';
      const frame = document.createElement('div');
      frame.className = 'video-frame';
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
      iframe.title = item.title || 'Vídeo do projeto';
      iframe.loading = 'lazy';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      frame.appendChild(iframe);
      const copy = document.createElement('div');
      copy.className = 'video-copy';
      const title = document.createElement('h2');
      title.textContent = item.title || 'Vídeo';
      copy.appendChild(title);
      if (item.description) {
        const description = document.createElement('div');
        description.className = 'cms-richtext';
        description.innerHTML = sanitizeHtml(item.description);
        copy.appendChild(description);
      }
      card.append(frame, copy);
      root.appendChild(card);
    });
  }

  function safeExternalUrl(value) {
    try {
      const url = new URL(String(value || ''));
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function renderLinks(data) {
    if (!data || typeof data !== 'object') return;
    const officialRoot = document.querySelector('[data-view="recursos"] .official-grid');
    const sourceRoot = document.querySelector('[data-view="recursos"] .source-links');

    if (officialRoot && Array.isArray(data.official)) {
      const items = data.official.filter((item) => item && item.published !== false && safeExternalUrl(item.url));
      if (items.length) {
        officialRoot.replaceChildren();
        items.forEach((item) => {
          const link = document.createElement('a');
          link.className = 'official-card';
          link.href = safeExternalUrl(item.url);
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          const acronym = document.createElement('span');
          acronym.className = 'official-acronym';
          acronym.textContent = item.acronym || 'LINK';
          const title = document.createElement('h2');
          title.textContent = item.title || 'Link útil';
          const description = document.createElement('div');
          description.className = 'cms-richtext';
          description.innerHTML = sanitizeHtml(item.description || '');
          const action = document.createElement('span');
          action.className = 'official-link';
          action.textContent = 'Acessar site oficial ↗';
          link.append(acronym, title, description, action);
          officialRoot.appendChild(link);
        });
      }
    }

    if (sourceRoot && Array.isArray(data.sources)) {
      const items = data.sources.filter((item) => item && item.published !== false && safeExternalUrl(item.url));
      if (items.length) {
        sourceRoot.replaceChildren();
        items.forEach((item) => {
          const link = document.createElement('a');
          link.href = safeExternalUrl(item.url);
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = item.label || 'Fonte pública';
          sourceRoot.appendChild(link);
        });
      }
    }
  }

  function normalizedSlug(value) {
    return String(value || '')
      .trim().toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function renderCustomPages(items) {
    if (!cmsPagesRoot || !cmsPagesNav) return;
    cmsPagesRoot.replaceChildren();
    cmsPagesNav.replaceChildren();
    const pages = Array.isArray(items) ? items.filter((item) => item && item.published !== false && normalizedSlug(item.slug)) : [];
    pages.forEach((item) => {
      const slug = normalizedSlug(item.slug);
      if (validViews.has(slug)) return;
      validViews.add(slug);
      const nav = document.createElement('a');
      nav.href = `#${slug}`;
      nav.dataset.nav = slug;
      nav.textContent = item.nav_label || item.title || slug;
      cmsPagesNav.appendChild(nav);
      const section = document.createElement('section');
      section.className = 'view';
      section.dataset.view = slug;
      section.hidden = true;
      section.setAttribute('aria-labelledby', `titulo-${slug}`);
      const hero = document.createElement('div');
      hero.className = 'page-hero compact';
      const shell = document.createElement('div');
      shell.className = 'shell';
      const eyebrow = document.createElement('p');
      eyebrow.className = 'eyebrow';
      eyebrow.textContent = item.eyebrow || 'PA Safra';
      const title = document.createElement('h1');
      title.id = `titulo-${slug}`;
      title.textContent = item.title || item.nav_label || slug;
      const summary = document.createElement('div');
      summary.className = 'cms-richtext';
      summary.innerHTML = sanitizeHtml(item.summary || '');
      shell.append(eyebrow, title);
      if (item.summary) shell.appendChild(summary);
      hero.appendChild(shell);
      const content = document.createElement('div');
      content.className = 'shell dynamic-page-content';
      const card = document.createElement('article');
      card.className = 'dynamic-page-card cms-richtext';
      card.innerHTML = sanitizeHtml(item.body || '<p>Conteúdo em preparação.</p>');
      content.appendChild(card);
      section.append(hero, content);
      cmsPagesRoot.appendChild(section);
    });
  }

  async function loadJson(path, fallback) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(`[PA Safra] Não foi possível carregar ${path}:`, error);
      return fallback;
    }
  }

  async function bootContent() {
    disableNewsModule();
    const [site, videos, pages, highlights, gallery, links] = await Promise.all([
      loadJson(contentPaths.site, {}),
      loadJson(contentPaths.videos, []),
      loadJson(contentPaths.pages, []),
      loadJson(contentPaths.highlights, []),
      loadJson(contentPaths.gallery, []),
      loadJson(contentPaths.links, {}),
    ]);

    applySiteConfig(site);
    renderHighlights(highlights);
    renderVideos(videos);
    renderGallery(gallery);
    renderLinks(links);
    renderCustomPages(pages);
    renderView();
  }

  menuToggle?.addEventListener('click', () => {
    const open = menu?.classList.toggle('is-open') ?? false;
    menuToggle.setAttribute('aria-expanded', String(open));
  });

  menu?.addEventListener('click', (event) => {
    const link = event.target.closest('[data-nav]');
    if (!link) return;
    menu.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });

  window.addEventListener('hashchange', () => renderView({ focus: true }));
  if (year) year.textContent = String(new Date().getFullYear());

  bootContent().catch((error) => {
    console.error('[PA Safra] Falha ao inicializar conteúdo editável:', error);
    disableNewsModule();
    renderView();
  });
})();
