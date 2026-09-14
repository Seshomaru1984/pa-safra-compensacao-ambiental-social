(() => {
  'use strict';

  const ALLOWED_LAYOUTS = new Set(['text-left', 'image-left']);
  const DEFAULT_LAYOUT = Object.freeze({
    version: 1,
    blocks: Object.freeze({ home_hero: 'text-left' }),
  });
  const HOME_FORM_SELECTOR = '#home-form';
  const HOME_PANEL_SELECTOR = '#panel-inicio';
  const LAYOUT_API = '/api/admin/layout';
  const CONTENT_API = '/api/admin/content';
  const nativeFetch = window.fetch.bind(window);

  let layoutState = normalizeLayout(DEFAULT_LAYOUT);
  let loadPromise = null;
  let scheduled = false;

  function normalizeLayout(raw) {
    const blocks = raw && typeof raw === 'object' && raw.blocks && typeof raw.blocks === 'object'
      ? raw.blocks
      : {};
    return {
      version: 1,
      blocks: {
        home_hero: ALLOWED_LAYOUTS.has(blocks.home_hero) ? blocks.home_hero : 'text-left',
      },
    };
  }

  function sameOriginUrl(input) {
    try {
      const raw = input instanceof Request ? input.url : input;
      const url = new URL(String(raw), window.location.href);
      return url.origin === window.location.origin ? url : null;
    } catch {
      return null;
    }
  }

  function requestMethod(input, init) {
    if (init?.method) return String(init.method).toUpperCase();
    if (input instanceof Request && input.method) return String(input.method).toUpperCase();
    return 'GET';
  }

  async function requestPayload(input, init) {
    try {
      if (typeof init?.body === 'string') return JSON.parse(init.body);
      if (input instanceof Request) return JSON.parse(await input.clone().text());
    } catch {}
    return null;
  }

  function homePanelIsActive() {
    const panel = document.querySelector(HOME_PANEL_SELECTOR);
    return Boolean(panel && !panel.hidden);
  }

  async function loadLayout({ force = false } = {}) {
    if (loadPromise && !force) return loadPromise;
    loadPromise = (async () => {
      const url = new URL(LAYOUT_API, window.location.origin);
      url.searchParams.set('_fresh', `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const response = await nativeFetch(url.toString(), {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
          accept: 'application/json',
          'cache-control': 'no-cache, no-store, max-age=0',
          pragma: 'no-cache',
        },
      });
      if (!response.ok) throw new Error(`Não foi possível carregar a disposição da capa (${response.status}).`);
      const result = await response.json().catch(() => ({}));
      if (!result?.ok || !result.data) throw new Error(result?.error || 'Resposta inválida ao carregar a disposição da capa.');
      layoutState = normalizeLayout(result.data);
      return layoutState;
    })();

    try {
      return await loadPromise;
    } finally {
      if (force) loadPromise = null;
    }
  }

  function selectedLayout() {
    const selected = document.querySelector('input[name="home-hero-layout"]:checked')?.value;
    return ALLOWED_LAYOUTS.has(selected) ? selected : layoutState.blocks.home_hero;
  }

  function layoutChoice(value, title, description, imageFirst) {
    const id = `home-layout-${value}`;
    const checked = layoutState.blocks.home_hero === value ? ' checked' : '';
    return `
      <label class="home-layout-choice" for="${id}">
        <input id="${id}" type="radio" name="home-hero-layout" value="${value}"${checked}>
        <span class="home-layout-mini${imageFirst ? ' image-first' : ''}" aria-hidden="true">
          <span class="home-layout-text"></span><span class="home-layout-image"></span>
        </span>
        <span><strong>${title}</strong><small>${description}</small></span>
      </label>`;
  }

  function injectLayoutControl() {
    const form = document.querySelector(HOME_FORM_SELECTOR);
    if (!form || !form.children.length || form.querySelector('[data-home-layout-control]')) return;
    const actions = form.querySelector('.form-actions');
    if (!actions) return;

    const card = document.createElement('section');
    card.className = 'form-card home-layout-card';
    card.dataset.homeLayoutControl = 'true';
    card.innerHTML = `
      <h3>Disposição da capa</h3>
      <p>Escolha a posição do texto e da imagem no computador. No celular, a capa continua em uma coluna.</p>
      <div class="home-layout-grid" role="radiogroup" aria-label="Disposição da capa">
        ${layoutChoice('text-left', 'Texto à esquerda', 'Imagem à direita', false)}
        ${layoutChoice('image-left', 'Imagem à esquerda', 'Texto à direita', true)}
      </div>
      <p class="home-layout-status" role="status" aria-live="polite">Esta opção é salva pelo único botão Salvar no final da Página inicial.</p>`;

    card.addEventListener('change', (event) => {
      if (!event.target?.matches('input[name="home-hero-layout"]')) return;
      const status = card.querySelector('.home-layout-status');
      if (status) status.textContent = 'Alteração pendente. Clique em Salvar no final da Página inicial.';
    });

    actions.before(card);
  }

  async function ensureControl() {
    const app = document.getElementById('admin-app');
    if (!app || app.hidden) return;
    const form = document.querySelector(HOME_FORM_SELECTOR);
    if (!form || !form.children.length) return;
    if (form.querySelector('[data-home-layout-control]')) return;

    try {
      await loadLayout();
      injectLayoutControl();
    } catch (error) {
      const actions = form.querySelector('.form-actions');
      if (!actions || form.querySelector('[data-home-layout-error]')) return;
      const note = document.createElement('p');
      note.dataset.homeLayoutError = 'true';
      note.className = 'home-layout-error';
      note.textContent = error.message || 'Não foi possível carregar a disposição da capa.';
      actions.before(note);
    }
  }

  function setLayoutStatus(message, isError = false) {
    const status = document.querySelector('[data-home-layout-control] .home-layout-status');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  }

  async function saveSelectedLayout() {
    await loadLayout();
    const selected = selectedLayout();
    if (!ALLOWED_LAYOUTS.has(selected)) throw new Error('Disposição da capa inválida.');

    if (selected === layoutState.blocks.home_hero) {
      setLayoutStatus('Disposição da capa já está salva.');
      return layoutState;
    }

    const next = {
      version: 1,
      blocks: { home_hero: selected },
    };
    setLayoutStatus('Salvando disposição da capa…');

    const response = await nativeFetch(LAYOUT_API, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: next }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.ok) {
      const message = result?.error || `Falha ao salvar a disposição (${response.status}).`;
      setLayoutStatus(message, true);
      throw new Error(message);
    }

    layoutState = normalizeLayout(result.data || next);
    setLayoutStatus('Disposição salva junto com a Página inicial.');
    return layoutState;
  }

  function failureResponse(message, status = 409) {
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store, max-age=0',
      },
    });
  }

  window.fetch = async (input, init) => {
    const url = sameOriginUrl(input);
    const method = requestMethod(input, init);

    if (url?.pathname === CONTENT_API && method === 'PUT' && homePanelIsActive()) {
      const payload = await requestPayload(input, init);
      if (payload?.resource === 'site') {
        try {
          await saveSelectedLayout();
        } catch (error) {
          return failureResponse(error.message || 'Não foi possível salvar a disposição da capa.');
        }
      }
    }

    return nativeFetch(input, init);
  };

  function applyPreviewParams(input) {
    const url = input instanceof URL ? input : new URL(String(input), window.location.origin);
    const selected = selectedLayout();
    if (ALLOWED_LAYOUTS.has(selected)) url.searchParams.set('layout_home', selected);
    return url;
  }

  window.PASafraHomeEditor = Object.freeze({
    applyPreviewParams,
    getSelectedLayout: selectedLayout,
  });

  const app = document.getElementById('admin-app');
  if (app) {
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        void ensureControl();
      });
    });
    observer.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }

  void ensureControl();
})();
