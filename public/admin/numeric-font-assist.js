const MIN_VIDEO_TITLE = 18;
const MAX_VIDEO_TITLE = 56;
const DEFAULT_VIDEO_TITLE = 28;
const VIDEO_TITLE_OPTIONS = [18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 44, 48, 52, 56];

let currentVideoStyle = { version: 1, title_size_px: DEFAULT_VIDEO_TITLE };
let writeEnabled = false;
let loading = null;
let unifiedSaveInProgress = false;

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
      if (labels[option.value] && option.textContent !== labels[option.value]) option.textContent = labels[option.value];
    });
  });

  document.querySelectorAll('[data-title-control] select[data-title-role="size"]').forEach((select) => {
    const labels = {
      default: 'Padrão',
      small: '30 px',
      medium: '42 px',
      large: '54 px',
      display: '67 px',
    };
    [...select.options].forEach((option) => {
      if (labels[option.value] && option.textContent !== labels[option.value]) option.textContent = labels[option.value];
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

function selectedVideoTitleSize(card) {
  const select = card?.querySelector('[data-video-title-size]');
  const size = Number(select?.value);
  if (!Number.isInteger(size) || size < MIN_VIDEO_TITLE || size > MAX_VIDEO_TITLE) {
    throw new Error(`Escolha um tamanho entre ${MIN_VIDEO_TITLE} e ${MAX_VIDEO_TITLE} px.`);
  }
  return size;
}

function collectVideoPayload() {
  const cards = [...document.querySelectorAll('#videos-editor .editor-card')];
  const videos = cards.map((card, index) => {
    const title = card.querySelector('[data-role="title"]')?.value?.trim() || '';
    const youtubeUrl = card.querySelector('[data-role="url"]')?.value?.trim() || '';
    const description = card.querySelector('[data-role="description"]')?.innerHTML?.trim() || '';
    const published = Boolean(card.querySelector('[data-role="published"]')?.checked);
    if (!title || !youtubeUrl) throw new Error(`Preencha título e link na palestra ${index + 1}.`);
    return { title, youtube_url: youtubeUrl, description, published };
  });
  return videos;
}

async function putJson(url, body) {
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    if (response.status === 401) throw new Error('Sua sessão expirou. Entre novamente no painel.');
    throw new Error(result.error || `Falha ao salvar (${response.status}).`);
  }
  return result;
}

function signalPublicPreviewRefresh() {
  try {
    localStorage.setItem('pa-safra-editorial-updated', String(Date.now()));
  } catch {}
}

async function savePageTitleFormatting() {
  const api = window.PASafraTitleStyles;
  if (!api || typeof api.saveKeys !== 'function') return null;
  return api.saveKeys(['lectures_hero'], { silent: true });
}

async function saveAllVideoChanges(card, triggerButton = null) {
  if (unifiedSaveInProgress) return;
  const status = card?.querySelector('.video-title-size-status');
  const bottomButton = document.getElementById('save-videos');

  if (!writeEnabled) {
    if (status) status.textContent = 'A publicação está bloqueada neste ambiente.';
    return;
  }

  let size;
  let videos;
  try {
    size = selectedVideoTitleSize(card);
    videos = collectVideoPayload();
  } catch (error) {
    if (status) status.textContent = error.message;
    return;
  }

  unifiedSaveInProgress = true;
  [bottomButton, triggerButton].filter(Boolean).forEach((button) => { button.disabled = true; });
  if (status) status.textContent = 'Salvando alterações da página…';

  try {
    const [styleResult, videosResult] = await Promise.all([
      putJson('/api/admin/video-styles', { data: { version: 1, title_size_px: size } }),
      putJson('/api/admin/content', { resource: 'videos', data: videos }),
      savePageTitleFormatting(),
    ]);
    currentVideoStyle = normalizeVideoStyle(styleResult.data || { title_size_px: size });
    signalPublicPreviewRefresh();
    if (status) {
      const videoCommit = videosResult.commit ? ` Conteúdo: ${String(videosResult.commit).slice(0, 7)}.` : '';
      status.textContent = `Alterações salvas: ${videos.length} vídeo(s), textos, formatação e tamanho ${currentVideoStyle.title_size_px} px.${videoCommit}`;
    }
    window.dispatchEvent(new CustomEvent('pa-safra-page-saved', { detail: { saveId: 'save-videos' } }));
  } catch (error) {
    if (status) status.textContent = error.message || 'Não foi possível salvar as alterações.';
  } finally {
    unifiedSaveInProgress = false;
    [bottomButton, triggerButton].filter(Boolean).forEach((button) => { button.disabled = !writeEnabled; });
  }
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
    <p>Esta configuração vale para todos os vídeos atuais e futuros e é salva junto com o restante da página pelo botão Salvar no final da edição.</p>
    <div class="video-title-size-row">
      <label>Tamanho da fonte
        <select data-video-title-size>${options}</select>
      </label>
    </div>
    <p class="video-title-size-status" role="status" aria-live="polite"></p>`;

  heading.insertAdjacentElement('afterend', card);
}

function installUnifiedBottomSave() {
  if (document.documentElement.dataset.paVideoUnifiedSave === 'true') return;
  document.documentElement.dataset.paVideoUnifiedSave = 'true';
  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('#save-videos') : null;
    if (!button) return;
    const card = document.querySelector('[data-video-title-control]');
    if (!card) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void saveAllVideoChanges(card, button);
  }, true);
}

async function ensureControls() {
  const app = document.getElementById('admin-app');
  if (!app || app.hidden) {
    relabelNumericSizes();
    return;
  }
  await loadState();
  relabelNumericSizes();
  injectVideoTitleControl();
  installUnifiedBottomSave();
}

installStyles();
const observer = new MutationObserver(() => { void ensureControls(); });
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
void ensureControls();
