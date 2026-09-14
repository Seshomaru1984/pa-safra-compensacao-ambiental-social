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
  const url = new URL('/', window.location.origin);
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
    preview.title = 'Abrir a versão atualmente salva desta página em uma nova aba';
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
  document.querySelectorAll('[data-title-preview], [data-title-save], [data-video-title-preview], [data-video-title-save]').forEach((button) => button.remove());
  document.querySelectorAll('.title-assist-actions, .video-title-size-actions').forEach((node) => {
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

/*
 * O painel recria alguns formulários após salvar. O observer serve apenas para
 * reaplicar os dois botões finais nesses novos nós. Ele é desligado durante a
 * própria normalização para impedir um ciclo de MutationObserver que bloqueie
 * a thread principal e congele o Admin.
 */
observer = new MutationObserver(scheduleNormalizeActions);
normalizeActions();
observe();
