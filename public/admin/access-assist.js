(() => {
  'use strict';

  const ACCESS_SLUG = 'acesso-localizacao';
  const PANEL_SELECTOR = '#panel-paginas';
  const EDITOR_SELECTOR = '#pages-editor';

  function pagesPanel() {
    return document.querySelector(PANEL_SELECTOR);
  }

  function accessCard() {
    return [...document.querySelectorAll(`${EDITOR_SELECTOR} .editor-card`)].find((card) =>
      card.querySelector('[data-role="slug"]')?.value.trim().toLowerCase() === ACCESS_SLUG
    ) || null;
  }

  function setHeading(accessMode) {
    const panel = pagesPanel();
    if (!panel) return;
    const eyebrow = panel.querySelector('.panel-heading .eyebrow');
    const title = panel.querySelector('.panel-heading h2');
    const description = panel.querySelector('.panel-heading p:not(.eyebrow)');
    const add = panel.querySelector('#add-page');

    if (eyebrow) eyebrow.textContent = accessMode ? 'Localização e mobilidade' : 'Conteúdo adicional';
    if (title) title.textContent = accessMode ? 'Acesso e localização' : 'Páginas extras';
    if (description) description.textContent = accessMode
      ? 'Edite as referências de estradas, rodovias, vias vicinais, localização e demais informações de acesso exibidas no site.'
      : 'Crie páginas complementares que aparecem no menu do portal.';
    if (add) add.hidden = accessMode;
  }

  function applyCardVisibility(accessMode) {
    const cards = [...document.querySelectorAll(`${EDITOR_SELECTOR} .editor-card`)];
    for (const card of cards) {
      const slug = card.querySelector('[data-role="slug"]')?.value.trim().toLowerCase();
      card.hidden = Boolean(accessMode && slug !== ACCESS_SLUG);
    }

    const empty = document.querySelector(`${EDITOR_SELECTOR} .empty-editor-state`);
    if (empty) empty.hidden = accessMode;

    if (accessMode && !accessCard()) {
      let warning = document.querySelector('#access-admin-warning');
      if (!warning) {
        warning = document.createElement('p');
        warning.id = 'access-admin-warning';
        warning.className = 'empty-editor-state';
        warning.textContent = 'A página de Acesso não foi encontrada no conteúdo carregado. Recarregue o painel ou verifique a branch editorial de Preview.';
        document.querySelector(EDITOR_SELECTOR)?.prepend(warning);
      }
      warning.hidden = false;
    } else {
      document.querySelector('#access-admin-warning')?.remove();
    }
  }

  function setAccessMode(enabled) {
    const panel = pagesPanel();
    if (!panel) return;
    panel.dataset.accessMode = enabled ? 'true' : 'false';
    setHeading(enabled);
    applyCardVisibility(enabled);
  }

  function showPagesPanelWithAccess() {
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.accessTab === 'true'));
    document.querySelectorAll('[data-panel]').forEach((panel) => {
      const active = panel.dataset.panel === 'paginas';
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    setAccessMode(true);
  }

  function installTab() {
    if (document.querySelector('[data-access-tab="true"]')) return;
    const pagesTab = document.querySelector('.tab[data-tab="paginas"]');
    if (!pagesTab) return;

    const tab = document.createElement('button');
    tab.className = 'tab';
    tab.type = 'button';
    tab.dataset.tab = 'paginas';
    tab.dataset.accessTab = 'true';
    tab.textContent = 'Acesso e localização';
    tab.addEventListener('click', showPagesPanelWithAccess);
    pagesTab.insertAdjacentElement('beforebegin', tab);

    pagesTab.addEventListener('click', () => setAccessMode(false));
    document.querySelectorAll('.tab:not([data-tab="paginas"])').forEach((other) => {
      other.addEventListener('click', () => setAccessMode(false));
    });
  }

  function sync() {
    installTab();
    const enabled = pagesPanel()?.dataset.accessMode === 'true';
    if (enabled) applyCardVisibility(true);
  }

  const observer = new MutationObserver(() => queueMicrotask(sync));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  sync();
})();
