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

  if (definition.saveId === 'save-home') {
    if (window.PASafraHomePreview?.createUrl) {
      return window.PASafraHomePreview.createUrl(url).toString();
    }
    if (window.PASafraHomeEditor?.applyPreviewParams) {
      url = window.PASafraHomeEditor.applyPreviewParams(url);
    }
  }

  url.searchParams.set('_pa_preview', String(Date.now()));
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
    preview.title = 'Abrir esta página em uma nova aba';
    preview.addEventListener('click', () => {
      try {
        window.open(previewUrl(definition), '_blank', 'noopener');
      } catch (error) {
        const message = document.querySelector('#admin-message');
        if (message) {
          message.textContent = error.message || 'Não foi possível abrir a pré-visualização.';
          message.classList.add('error');
          message.hidden = false;
        }
      }
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

observer = new MutationObserver(scheduleNormalizeActions);
normalizeActions();
observe();
