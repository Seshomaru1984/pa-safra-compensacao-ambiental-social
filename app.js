(() => {
  'use strict';

  const baseViews = ['inicio', 'sobre', 'palestras', 'noticias', 'galeria', 'recursos', 'legado'];
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
  };

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
      if (link.dataset.nav === selected) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    menu?.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');

    window.scrollTo({ top: 0, behavior: 'auto' });
    if (focus) {
      document.getElementById('conteudo')?.focus({ preventScroll: true });
    }
  }

  function setText(id, value) {
    if (typeof value !== 'string' || !value.trim()) return;
    const node = document.getElementById(id);
    if (node) node.textContent = value.trim();
  }

  function sanitizeHtml(value) {
    const template = document.createElement('template');
    template.innerHTML = typeof value === 'string' ? value : '';

    template.content
      .querySelectorAll('script, style, iframe, object, embed, form, input, button, textarea, select')
      .forEach((node) => node.remove());

    template.content.querySelectorAll('*').forEach((node) => {
      [...node.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const val = attribute.value.trim().toLowerCase();
        if (name.startsWith('on') || ((name === 'href' || name === 'src') && val.startsWith('javascript:'))) {
          node.removeAttribute(attribute.name);
        }
      });

      if (node.tagName === 'A') {
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });

    return template.innerHTML;
  }

  function setRichHtml(id, html) {
    if (typeof html !== 'string' || !html.trim()) return;
    const node = document.getElementById(id);
    if (node) node.innerHTML = sanitizeHtml(html);
  }

  function validHex(value) {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim());
  }

  function applySiteConfig(site) {
    if (!site || typeof site !== 'object') return;

    if (typeof site.page_title === 'string' && site.page_title.trim()) {
      document.title = site.page_title.trim();
    }

    const description = document.querySelector('meta[name="description"]');
    if (description && typeof site.description === 'string' && site.description.trim()) {
      description.setAttribute('content', site.description.trim());
    }

    setText('brand-name', site.brand_name);
    setText('brand-tagline', site.brand_tagline);

    const hero = site.hero || {};
    setText('hero-eyebrow', hero.eyebrow);
    setText('titulo-inicio', hero.title);
    setText('hero-lead', hero.lead);

    const heroImage = document.getElementById('hero-image');
    if (heroImage && typeof hero.image === 'string' && hero.image.trim()) {
      heroImage.src = hero.image.trim();
    }
    if (heroImage && typeof hero.image_alt === 'string' && hero.image_alt.trim()) {
      heroImage.alt = hero.image_alt.trim();
    }

    const heroCopy = document.querySelector('.hero-copy');
    if (heroCopy) {
      heroCopy.classList.toggle('align-right', hero.title_alignment === 'right');
      heroCopy.classList.toggle('title-compact', hero.title_size === 'compact');
      heroCopy.classList.toggle('title-small', hero.title_size === 'small');
    }

    const home = site.home || {};
    setText('home-intro-eyebrow', home.intro_eyebrow);
    setText('eixos-titulo', home.intro_title);
    setText('home-intro-text', home.intro_text);

    const about = site.about || {};
    setText('titulo-sobre', about.title);
    setText('about-summary', about.summary);
    setRichHtml('about-body', about.body);

    const footer = site.footer || {};
    setText('footer-dedication', footer.dedication);
    setText('footer-institutional-note', footer.institutional_note);

    const root = document.documentElement;
    const theme = site.theme || {};
    if (validHex(theme.primary)) root.style.setProperty('--forest-700', theme.primary.trim());
    if (validHex(theme.accent)) root.style.setProperty('--clay-500', theme.accent.trim());
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(date);
  }

  function renderNews(items) {
    const root = document.getElementById('noticias-list');
    if (!root) return;

    const published = Array.isArray(items)
      ? items.filter((item) => item && item.published !== false)
      : [];

    published.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    if (!published.length) return;

    root.replaceChildren();

    published.forEach((item) => {
      const article = document.createElement('article');
      article.className = `news-card${item.image ? '' : ' no-image'}`;

      if (item.image) {
        const media = document.createElement('div');
        media.className = 'news-card-media';
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.image_alt || '';
        media.appendChild(img);
        article.appendChild(media);
      }

      const copy = document.createElement('div');
      copy.className = 'news-card-copy';

      if (item.date) {
        const date = document.createElement('time');
        date.className = 'news-date';
        date.dateTime = item.date;
        date.textContent = formatDate(item.date);
        copy.appendChild(date);
      }

      const title = document.createElement('h2');
      title.textContent = item.title || 'Notícia';
      copy.appendChild(title);

      if (item.summary) {
        const summary = document.createElement('p');
        summary.className = 'news-summary';
        summary.textContent = item.summary;
        copy.appendChild(summary);
      }

      if (item.body) {
        const body = document.createElement('div');
        body.className = 'cms-richtext';
        body.innerHTML = sanitizeHtml(item.body);
        copy.appendChild(body);
      }

      article.appendChild(copy);
      root.appendChild(article);
    });
  }

  function renderHighlights(items) {
    const root = document.getElementById('destaques-list');
    if (!root) return;

    const published = Array.isArray(items)
      ? items.filter((item) => item && item.published !== false)
      : [];

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

      const text = document.createElement('p');
      text.textContent = item.text || '';

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
    const value = url.trim();
    if (!value) return null;

    try {
      const parsed = new URL(value);
      const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (['embed', 'shorts', 'live'].includes(parts[0])) return parts[1] || null;
      }
    } catch {
      return null;
    }

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
        const description = document.createElement('p');
        description.textContent = item.description;
        copy.appendChild(description);
      }

      card.append(frame, copy);
      root.appendChild(card);
    });
  }

  function normalizedSlug(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function renderCustomPages(items) {
    if (!cmsPagesRoot || !cmsPagesNav) return;

    cmsPagesRoot.replaceChildren();
    cmsPagesNav.replaceChildren();

    const pages = Array.isArray(items)
      ? items.filter((item) => item && item.published !== false && normalizedSlug(item.slug))
      : [];

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
      const summary = document.createElement('p');
      summary.textContent = item.summary || '';
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
    const [site, news, videos, pages, highlights, gallery] = await Promise.all([
      loadJson(contentPaths.site, {}),
      loadJson(contentPaths.news, []),
      loadJson(contentPaths.videos, []),
      loadJson(contentPaths.pages, []),
      loadJson(contentPaths.highlights, []),
      loadJson(contentPaths.gallery, []),
    ]);

    applySiteConfig(site);
    renderHighlights(highlights);
    renderNews(news);
    renderVideos(videos);
    renderGallery(gallery);
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
    renderView();
  });
})();
