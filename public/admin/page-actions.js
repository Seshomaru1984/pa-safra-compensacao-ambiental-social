const ACTIONS = Object.freeze([
  { saveId: 'save-home', hash: 'inicio' },
  { saveId: 'save-about', hash: 'sobre' },
  { saveId: 'save-highlights', hash: 'inicio' },
  { saveId: 'save-videos', hash: 'palestras' },
  { saveId: 'save-gallery', hash: 'galeria' },
  { saveId: 'save-links', hash: 'recursos' },
  { saveId: 'save-legacy', hash: 'legado' },
  { saveId: 'save-pages', hash: 'dynamic' },
  { saveId: 'save-appearance', hash: 'inicio' },
]);

const OBSERVER_OPTIONS = Object.freeze({ childList: true, subtree: true });
let homeSubmitBypass = false;

function normalizedSlug(value) {
  return String(value || '')
    .trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function targetHash(definition) {
  if (definition.hash !== 'dynamic') return definition.hash;
  return normalizedSlug(document.querySelector('#pages-editor [data-role="slug"]')?.value) || 'inicio';
}

function previewUrl(definition) {
  let url = new URL('/', window.location.origin);
  url.searchParams.set('_pa_preview', String(Date.now()));
  if (definition.saveId === 'save-home' && window.PASafraLayout?.applyPreviewParams) {
    url = window.PASafraLayout.applyPreviewParams(url);
  }
  url.hash = targetHash(definition);
  return url.toString();
}

function ensurePageAction(definition) {
  const save = document.getElementById(definition.saveId);
  if (!save) return;
  const actions = save.closest('.form-actions');
  if (!actions) return;

  if (save.textContent !== 'Salvar') save.textContent = 'Salvar';
  if (save.dataset.pageSave !== 'true') save.dataset.pageSave = 'true';

  let preview = actions.querySelector(`[data-page-preview-for="${definition.saveId}"]`);
  if (!preview) {
    preview = document.createElement('button');
    preview.type = 'button';
    preview.className = 'button secondary';
    preview.textContent = 'Pré-visualizar';
    preview.dataset.pagePreviewFor = definition.saveId;
    preview.title = 'Abrir esta página em uma nova aba usando também as opções visuais atualmente selecionadas';
    preview.addEventListener('click', () => {
      window.open(previewUrl(definition), '_blank', 'noopener');
    });
    actions.insertBefore(preview, save);
  }

  [...actions.querySelectorAll('[data-page-preview-for]')].forEach((button) => {
    if (button !== preview) button.remove();
  });
}

function removeDuplicateActionButtons() {
  document.querySelectorAll('[data-title-preview], [data-title-save], [data-video-title-preview], [data-video-title-save], [data-layout-preview], [data-layout-save]').forEach((button) => button.remove());
  document.querySelectorAll('.title-assist-actions, .video-title-size-actions, .layout-assist-actions').forEach((node) => {
    if (!node.querySelector('button')) node.remove();
  });
}

function normalizeActions() {
  removeDuplicateActionButtons();
  ACTIONS.forEach(ensurePageAction);
}

async function persistHomeLayoutBeforePageSave(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'home-form' || homeSubmitBypass) return;
  const api = window.PASafraLayout;
  if (!api || typeof api.saveSelected !== 'function') return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const submitter = event.submitter instanceof HTMLButtonElement ? event.submitter : document.getElementById('save-home');
  const originalText = submitter?.textContent || 'Salvar';
  if (submitter) {
    submitter.disabled = true;
    submitter.textContent = 'Salvando…';
  }

  try {
    await api.saveSelected({ silent: false });

    // requestSubmit não deve receber um botão desabilitado. O fluxo anterior
    // mantinha o submitter disabled aqui, então o navegador não retomava o
    // submit normal da Página inicial e o botão ficava travado após o clique.
    if (submitter) {
      submitter.disabled = false;
      submitter.textContent = originalText;
    }

    homeSubmitBypass = true;
    form.requestSubmit(submitter || undefined);
  } catch (error) {
    if (submitter) {
      submitter.disabled = false;
      submitter.textContent = originalText;
    }
    throw error;
  } finally {
    homeSubmitBypass = false;
  }
}

document.addEventListener('submit', (event) => {
  void persistHomeLayoutBeforePageSave(event).catch(() => {});
}, true);

let scheduled = false;
let observer = null;

function observe() {
  observer?.observe(document.documentElement, OBSERVER_OPTIONS);
}

function scheduleNormalizeActions() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    observer?.disconnect();
    try {
      normalizeActions();
    } finally {
      observe();
    }
  });
}

/*
 * O painel recria alguns formulários após salvar. O observer serve apenas para
 * reaplicar os dois botões finais nesses novos nós. Ele é desligado durante a
 * própria normalização para impedir um ciclo de MutationObserver que bloqueie
 * a thread principal e congele o Admin.
 */
observer = new MutationObserver(scheduleNormalizeActions);
normalizeActions();
observe();
