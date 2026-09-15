(() => {
  'use strict';

  const PANEL_SELECTOR = '#panel-paginas';
  const EDITOR_SELECTOR = '#pages-editor';
  const PAGE_MODES = Object.freeze({
    access: {
      slug: 'acesso-localizacao',
      tabLabel: 'Mapas e acessos',
      eyebrow: 'Localização e mobilidade',
      title: 'Mapas e acessos',
      description: 'Edite as referências de estradas, rodovias, vias vicinais, localização e demais informações de acesso exibidas no site.',
    },
    contact: {
      slug: 'contato',
      tabLabel: 'Contato',
      eyebrow: 'Comunicação',
      title: 'Contato',
      description: 'Edite o e-mail e os textos de manifestações, correções e esclarecimentos exibidos na página de contato.',
    },
  });

  function pagesPanel() {
    return document.querySelector(PANEL_SELECTOR);
  }

  function pageCard(slug) {
    return [...document.querySelectorAll(`${EDITOR_SELECTOR} .editor-card`)].find((card) =>
      card.querySelector('[data-role="slug"]')?.value.trim().toLowerCase() === slug
    ) || null;
  }

  function activeMode() {
    const key = pagesPanel()?.dataset.pageMode || '';
    return PAGE_MODES[key] ? key : null;
  }

  function setHeading(modeKey) {
    const panel = pagesPanel();
    if (!panel) return;
    const config = PAGE_MODES[modeKey] || null;
    const eyebrow = panel.querySelector('.panel-heading .eyebrow');
    const title = panel.querySelector('.panel-heading h2');
    const description = panel.querySelector('.panel-heading p:not(.eyebrow)');
    const add = panel.querySelector('#add-page');

    if (eyebrow) eyebrow.textContent = config?.eyebrow || 'Conteúdo adicional';
    if (title) title.textContent = config?.title || 'Páginas extras';
    if (description) description.textContent = config?.description || 'Crie páginas complementares que aparecem no menu do portal.';
    if (add) add.hidden = Boolean(config);
  }

  function clearWarnings() {
    document.querySelectorAll('[data-page-mode-warning]').forEach((warning) => warning.remove());
  }

  function applyCardVisibility(modeKey) {
    const config = PAGE_MODES[modeKey] || null;
    const cards = [...document.querySelectorAll(`${EDITOR_SELECTOR} .editor-card`)];
    for (const card of cards) {
      const slug = card.querySelector('[data-role="slug"]')?.value.trim().toLowerCase();
      card.hidden = Boolean(config && slug !== config.slug);
    }

    const empty = document.querySelector(`${EDITOR_SELECTOR} .empty-editor-state`);
    if (empty) empty.hidden = Boolean(config);

    clearWarnings();
    if (config && !pageCard(config.slug)) {
      const warning = document.createElement('p');
      warning.dataset.pageModeWarning = modeKey;
      warning.className = 'empty-editor-state';
      warning.textContent = `A página de ${config.tabLabel} não foi encontrada no conteúdo carregado. Recarregue o painel ou verifique a branch editorial de Preview.`;
      document.querySelector(EDITOR_SELECTOR)?.prepend(warning);
    }
  }

  function setPageMode(modeKey) {
    const panel = pagesPanel();
    if (!panel) return;
    const normalized = PAGE_MODES[modeKey] ? modeKey : '';
    panel.dataset.pageMode = normalized;
    setHeading(normalized);
    applyCardVisibility(normalized);
  }

  function showPagesPanel(modeKey) {
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.pageMode === modeKey));
    document.querySelectorAll('[data-panel]').forEach((panel) => {
      const active = panel.dataset.panel === 'paginas';
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    setPageMode(modeKey);
  }

  function makeModeTab(modeKey) {
    const config = PAGE_MODES[modeKey];
    const tab = document.createElement('button');
    tab.className = 'tab';
    tab.type = 'button';
    tab.dataset.tab = 'paginas';
    tab.dataset.pageMode = modeKey;
    tab.textContent = config.tabLabel;
    tab.addEventListener('click', () => showPagesPanel(modeKey));
    return tab;
  }

  function installTabs() {
    const pagesTab = document.querySelector('.tab[data-tab="paginas"]:not([data-page-mode])');
    if (!pagesTab) return;

    if (!document.querySelector('[data-page-mode="access"]')) {
      const aboutTab = document.querySelector('.tab[data-tab="sobre"]');
      const accessTab = makeModeTab('access');
      if (aboutTab) aboutTab.insertAdjacentElement('afterend', accessTab);
      else pagesTab.insertAdjacentElement('beforebegin', accessTab);
    }

    if (!document.querySelector('[data-page-mode="contact"]')) {
      const linksTab = document.querySelector('.tab[data-tab="links"]');
      const contactTab = makeModeTab('contact');
      if (linksTab) linksTab.insertAdjacentElement('afterend', contactTab);
      else pagesTab.insertAdjacentElement('beforebegin', contactTab);
    }

    if (pagesTab.dataset.pageModeReset !== 'true') {
      pagesTab.dataset.pageModeReset = 'true';
      pagesTab.addEventListener('click', () => setPageMode(null));
    }

    document.querySelectorAll('.tab:not([data-tab="paginas"])').forEach((other) => {
      if (other.dataset.pageModeReset === 'true') return;
      other.dataset.pageModeReset = 'true';
      other.addEventListener('click', () => setPageMode(null));
    });
  }

  function sync() {
    installTabs();
    const mode = activeMode();
    if (mode) applyCardVisibility(mode);
  }

  const observer = new MutationObserver(() => queueMicrotask(sync));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  sync();
})();