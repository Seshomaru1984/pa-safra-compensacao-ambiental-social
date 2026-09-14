const MIN_SIZE = 18;
const MAX_SIZE = 56;
const DEFAULT_SIZE = 28;

function normalize(value) {
  const size = Number(value?.title_size_px);
  return {
    version: 1,
    title_size_px: Number.isInteger(size) && size >= MIN_SIZE && size <= MAX_SIZE ? size : DEFAULT_SIZE,
  };
}

function previewOverride(styles) {
  const params = new URLSearchParams(window.location.search);
  const requested = Number(params.get('video_title_size'));
  if (Number.isInteger(requested) && requested >= MIN_SIZE && requested <= MAX_SIZE) {
    return { version: 1, title_size_px: requested };
  }
  return styles;
}

async function loadStyles() {
  try {
    const response = await fetch('/api/video-styles', { cache: 'no-store', credentials: 'same-origin' });
    if (response.ok) {
      const result = await response.json();
      if (result?.ok && result.data) return normalize(result.data);
    }
  } catch {}

  try {
    const response = await fetch('/content/video-styles.json', { cache: 'no-store', credentials: 'same-origin' });
    if (response.ok) return normalize(await response.json());
  } catch {}

  return normalize({});
}

function applyStyles(styles) {
  document.documentElement.style.setProperty('--pa-video-title-size', `${styles.title_size_px}px`);
  if (document.getElementById('pa-safra-video-title-style')) return;
  const style = document.createElement('style');
  style.id = 'pa-safra-video-title-style';
  style.textContent = `
.video-copy h2 {
  font-size: var(--pa-video-title-size, 28px) !important;
  line-height: 1.12 !important;
}
@media (max-width: 680px) {
  .video-copy h2 {
    font-size: min(var(--pa-video-title-size, 28px), 36px) !important;
  }
}`;
  document.head.appendChild(style);
}

applyStyles(previewOverride(await loadStyles()));
