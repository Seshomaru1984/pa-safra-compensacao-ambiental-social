(() => {
  'use strict';

  const nativeFetch = window.fetch.bind(window);
  const FIELD_ID = 'links-page-intro';

  function currentIntro() {
    return document.getElementById(FIELD_ID)?.value.trim() || '';
  }

  window.fetch = async (input, init = {}) => {
    const raw = typeof input === 'string' ? input : input?.url;
    let url;
    try {
      url = new URL(raw, window.location.href);
    } catch {
      return nativeFetch(input, init);
    }

    const method = String(init?.method || (typeof input !== 'string' ? input?.method : '') || 'GET').toUpperCase();
    if (url.pathname !== '/api/admin/content' || method !== 'PUT' || typeof init?.body !== 'string') {
      return nativeFetch(input, init);
    }

    try {
      const payload = JSON.parse(init.body);
      if (payload?.resource !== 'links' || !payload?.data || typeof payload.data !== 'object') {
        return nativeFetch(input, init);
      }
      payload.data.intro = currentIntro();
      return nativeFetch(input, { ...init, body: JSON.stringify(payload) });
    } catch {
      return nativeFetch(input, init);
    }
  };

  function installField() {
    const panel = document.getElementById('panel-links');
    if (!panel || document.getElementById(FIELD_ID)) return;

    const firstSubsection = panel.querySelector('.subsection-heading');
    const card = document.createElement('div');
    card.className = 'form-card';
    card.id = 'links-page-intro-card';

    const label = document.createElement('label');
    label.className = 'full';
    label.append(document.createTextNode('Texto de apresentação da página'));

    const textarea = document.createElement('textarea');
    textarea.id = FIELD_ID;
    textarea.rows = 3;
    textarea.maxLength = 1000;
    textarea.placeholder = 'Deixe vazio para não exibir texto abaixo do título da página.';
    label.appendChild(textarea);

    const help = document.createElement('p');
    help.className = 'field-help';
    help.textContent = 'Este texto aparece abaixo de “Links úteis e órgãos oficiais”. Se apagar o conteúdo e salvar, o parágrafo deixa de aparecer no site.';

    card.append(label, help);
    if (firstSubsection) panel.insertBefore(card, firstSubsection);
    else panel.appendChild(card);

    nativeFetch('/content/links.json', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then((data) => {
        textarea.value = typeof data?.intro === 'string' ? data.intro : '';
      })
      .catch((error) => {
        console.warn('[PA Safra] Não foi possível carregar a apresentação de Links úteis no Admin:', error);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installField, { once: true });
  } else {
    installField();
  }
})();
