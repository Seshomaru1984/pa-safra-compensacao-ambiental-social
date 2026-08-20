(() => {
  'use strict';

  const validViews = new Set(['inicio', 'sobre', 'legado', 'palestras', 'recursos']);
  const views = [...document.querySelectorAll('[data-view]')];
  const navLinks = [...document.querySelectorAll('[data-nav]')];
  const menu = document.getElementById('menu-principal');
  const menuToggle = document.querySelector('.menu-toggle');
  const year = document.getElementById('ano');

  function resolveView() {
    const hash = window.location.hash.replace('#', '').trim().toLowerCase();
    return validViews.has(hash) ? hash : 'inicio';
  }

  function renderView({ focus = false } = {}) {
    const selected = resolveView();

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

  menuToggle?.addEventListener('click', () => {
    const open = menu?.classList.toggle('is-open') ?? false;
    menuToggle.setAttribute('aria-expanded', String(open));
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      menu?.classList.remove('is-open');
      menuToggle?.setAttribute('aria-expanded', 'false');
    });
  });

  window.addEventListener('hashchange', () => renderView({ focus: true }));
  year.textContent = String(new Date().getFullYear());
  renderView();
})();