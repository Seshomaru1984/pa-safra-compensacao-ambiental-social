const MIN_VIDEO_TITLE = 18;
const MAX_VIDEO_TITLE = 56;
const DEFAULT_VIDEO_TITLE = 28;
const VIDEO_TITLE_OPTIONS = [18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 44, 48, 52, 56];

let currentVideoStyle = { version: 1, title_size_px: DEFAULT_VIDEO_TITLE };
let writeEnabled = false;
let loading = null;
let wrappedTitleApi = false;

function normalizeVideoStyle(raw) {
  const size = Number(raw?.title_size_px);
  return {
    version: 1,
    title_size_px: Number.isInteger(size) && size >= MIN_VIDEO_TITLE && size <= MAX_VIDEO_TITLE ? size : DEFAULT_VIDEO_TITLE,
  };
}

function relabelNumericSizes() {
  document.querySelectorAll('.rich-toolbar select[title="Tamanho do texto"]').forEach((select) => {
    const labels = { '2': '13 px', '3': '16 px', '4': '18 px', '5': '24 px' };
    [...select.options].forEach((option) => {
      if (labels[option.value]) option.textContent = labels[option.value];
    });
  });

  document.querySelectorAll('[data-title-control] select[data-title-role="size"]').forEach((select) => {
    const labels = { default: 'Padrão', small: '30 px', medium: '42 px', large: '54 px', display: '67 px' };
    [...select.options].forEach((option) => {
      if (labels[option.value]) option.textContent = labels[option.value];
    });
  });
}

async function loadState() {
  if (loading) return loading;
  loading = (async () => {
    try {
      const [styleResponse, statusResponse] = await Promise.all([
        fetch('/api/admin/video-styles', { cache: 'no-store', credentials: 'same-origin' }),
        fetch('/api/admin/status', { cache: 'no-store', credentials: 'same-origin' }),
      ]);
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        writeEnabled = Boolean(status?.write_enabled);
      }
      if (styleResponse.ok) {
        const result = await styleResponse.json();
        if (result?.ok && result.data) return normalizeVideoStyle(result.data);
      }
    } catch {}

    try {
      const fallback = await fetch('/content/video-styles.json', { cache: 'no-store', credentials: 'same-origin' });
      if (fallback.ok) return normalizeVideoStyle(await fallback.json());
    } catch {}

    return normalizeVideoStyle({});
  })();
  currentVideoStyle = await loading;
  return currentVideoStyle;
}

function installStyles() {
  if (document.getElementById('pa-safra-numeric-font-admin-styles')) return;
  const style = document.createElement('style');
  style.id = 'pa-safra-numeric-font-admin-styles';
  style.textContent = `
.video-title-size-card { margin-bottom: 22px; border-style: dashed; }
.video-title-size-card h3 { margin: 0 0 6px; font-size: 1.02rem; }
.video-title-size-card > p { margin: 0 0 14px; color: var(--ink-600); font-size: .88rem; }
.video-title-size-row { display: flex; align-items: end; gap: 12px; flex-wrap: wrap; }
.video-title-size-row label { min-width: 180px; margin: 0; }
.video-title-size-status { margin: 12px 0 0; color: var(--ink-600); font-size: .84rem; }
`;
  document.head.appendChild(style);
}

function selectedVideoTitleSize() {
  const size = Number(document.querySelector('[data-video-title-size]')?.value);
  if (!Number.isInteger(size) || size < MIN_VIDEO_TITLE || size > MAX_VIDEO_TITLE) {
    throw new Error(`Escolha um tamanho entre ${MIN_VIDEO_TITLE} e ${MAX_VIDEO_TITLE} px.`);
  }
  return size;
}

function setStatus(message) {
  const status = document.querySelector('.video-title-size-status');
  if (status) status.textContent = message;
}

async function saveVideoStyle(options = {}) {
  if (!writeEnabled) throw new Error('A publicação do tamanho dos títulos está bloqueada neste ambiente.');
  const size = selectedVideoTitleSize();
  if (!options.silent) setStatus('Salvando tamanho dos títulos...');

  const response = await fetch('/api/admin/video-styles', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: { version: 1, title_size_px: size } }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || `Falha ao salvar tamanho dos títulos (${response.status}).`);
  currentVideoStyle = normalizeVideoStyle(result.data || { title_size_px: size });
  if (!options.silent) setStatus('Tamanho dos títulos salvo.');
  return currentVideoStyle;
}

function installTitleApiBridge() {
  if (wrappedTitleApi) return;
  const api = window.PASafraTitleStyles;
  if (!api || typeof api.saveKeys !== 'function') return;

  const originalSaveKeys = api.saveKeys.bind(api);
  window.PASafraTitleStyles = Object.freeze({
    ...api,
    async saveKeys(keys, options = {}) {
      const requested = Array.isArray(keys) ? keys : [keys];
      const titleResult = await originalSaveKeys(keys, options);
      if (requested.includes('lectures_hero')) await saveVideoStyle(options);
      return titleResult;
    },
  });
  wrappedTitleApi = true;
}

function injectVideoTitleControl() {
  const panel = document.getElementById('panel-videos');
  if (!panel || panel.querySelector('[data-video-title-control]')) return;
  const heading = panel.querySelector('.panel-heading');
  if (!heading) return;

  const card = document.createElement('div');
  card.className = 'form-card video-title-size-card';
  card.dataset.videoTitleControl = 'true';
  const options = VIDEO_TITLE_OPTIONS.map((size) => `<option value="${size}"${size === currentVideoStyle.title_size_px ? ' selected' : ''}>${size} px</option>`).join('');
  card.innerHTML = `
    <h3>Tamanho dos títulos dos vídeos</h3>
    <p>Vale para todos os vídeos atuais e futuros. Esta configuração é salva pelo mesmo botão Salvar da página.</p>
    <div class="video-title-size-row">
      <label>Tamanho da fonte
        <select data-video-title-size>${options}</select>
      </label>
    </div>
    <p class="video-title-size-status" role="status" aria-live="polite"></p>`;
  heading.insertAdjacentElement('afterend', card);
}

async function ensureControls() {
  const app = document.getElementById('admin-app');
  relabelNumericSizes();
  installTitleApiBridge();
  if (!app || app.hidden) return;
  await loadState();
  installTitleApiBridge();
  injectVideoTitleControl();
  relabelNumericSizes();
}

installStyles();
const observer = new MutationObserver(() => { void ensureControls(); });
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
void ensureControls();
