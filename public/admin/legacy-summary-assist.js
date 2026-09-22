(() => {
  'use strict';

  const FIELD_ID = 'legacy-summary';
  const nativeFetch = window.fetch.bind(window);
  let summaryValue = '';
  let summaryLoaded = false;
  let scheduled = false;

  function requestMethod(input, init) {
    if (init?.method) return String(init.method).toUpperCase();
    if (input instanceof Request && input.method) return String(input.method).toUpperCase();
    return 'GET';
  }

  function requestUrl(input) {
    try {
      return new URL(input instanceof Request ? input.url : String(input), window.location.href);
    } catch {
      return null;
    }
  }

  function currentSummary() {
    const field = document.getElementById(FIELD_ID);
    return field ? field.value.trim() : summaryValue;
  }

  window.fetch = async (input, init = {}) => {
    const url = requestUrl(input);
    const method = requestMethod(input, init);
    if (url?.pathname !== '/api/admin/content' || method !== 'PUT' || typeof init?.body !== 'string') {
      return nativeFetch(input, init);
    }

    try {
      const payload = JSON.parse(init.body);
      if (payload?.resource !== 'site' || !payload?.data || typeof payload.data !== 'object') {
        return nativeFetch(input, init);
      }

      payload.data.legacy = payload.data.legacy && typeof payload.data.legacy === 'object'
        ? payload.data.legacy
        : {};
      payload.data.legacy.summary = currentSummary();

      const response = await nativeFetch(input, { ...init, body: JSON.stringify(payload) });
      if (response.ok) {
        summaryValue = payload.data.legacy.summary;
        summaryLoaded = true;
      }
      return response;
    } catch {
      return nativeFetch(input, init);
    }
  };

  async function loadSummary() {
    try {
      const response = await nativeFetch('/content/site.json', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const site = await response.json();
      summaryValue = typeof site?.legacy?.summary === 'string' ? site.legacy.summary : '';
      summaryLoaded = true;
      const field = document.getElementById(FIELD_ID);
      if (field && field.dataset.userEdited !== 'true') field.value = summaryValue;
    } catch (error) {
      console.warn('[PA Safra] Não foi possível carregar o resumo de Memória e legado:', error);
    }
  }

  function installField() {
    if (document.getElementById(FIELD_ID)) return;
    const titleInput = document.getElementById('legacy-title');
    const titleLabel = titleInput?.closest('label');
    if (!titleInput || !titleLabel) return;

    const label = document.createElement('label');
    label.className = 'full';
    label.append(document.createTextNode('Resumo'));

    const textarea = document.createElement('textarea');
    textarea.id = FIELD_ID;
    textarea.rows = 2;
    textarea.maxLength = 1200;
    textarea.placeholder = 'Resumo curto exibido abaixo do título. Deixe vazio para não exibir.';
    textarea.value = summaryLoaded ? summaryValue : '';
    textarea.addEventListener('input', () => {
      textarea.dataset.userEdited = 'true';
    });
    label.appendChild(textarea);

    const help = document.createElement('span');
    help.className = 'field-help';
    help.textContent = 'Campo opcional. Se ficar vazio, nenhum resumo será exibido no site.';
    label.appendChild(help);

    titleLabel.insertAdjacentElement('afterend', label);
  }

  function scheduleInstall() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      installField();
    });
  }

  const observer = new MutationObserver(scheduleInstall);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scheduleInstall();
  loadSummary();
})();
