const state = {
  status: null,
  site: null,
  videos: [],
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function showMessage(message, type = 'ok') {
  const toast = $('#admin-message');
  toast.textContent = message;
  toast.classList.toggle('error', type === 'error');
  toast.hidden = false;
  window.clearTimeout(showMessage.timer);
  showMessage.timer = window.setTimeout(() => { toast.hidden = true; }, 5000);
}

async function readJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Falha ao carregar dados (${response.status}).`);
  return response.json();
}

function setWriteAvailability() {
  const enabled = Boolean(state.status?.write_enabled);
  $('#save-site').disabled = !enabled;
  $('#save-videos').disabled = !enabled;

  const dot = $('#admin-status-dot');
  const title = $('#admin-status-title');
  const message = $('#admin-status-message');
  dot.classList.remove('ready', 'blocked');

  if (enabled) {
    dot.classList.add('ready');
    title.textContent = 'Administração pronta';
  } else {
    dot.classList.add('blocked');
    title.textContent = 'Publicação administrativa bloqueada';
  }
  message.textContent = state.status?.message || 'Configuração administrativa indisponível.';
}

function applySiteToForm() {
  if (!state.site) return;
  $('#brand-tagline').value = state.site.brand_tagline || '';
  $('#hero-title').value = state.site.hero?.title || '';
  $('#hero-lead').value = state.site.hero?.lead || '';
  refreshPreview();
}

function refreshPreview() {
  $('#preview-brand').textContent = $('#brand-tagline').value.trim() || 'Compensação Ambiental e Social';
  $('#preview-title').textContent = $('#hero-title').value.trim() || 'Título principal';
  $('#preview-lead').textContent = $('#hero-lead').value.trim() || 'Texto de apoio da página inicial.';
}

function videoCard(item = {}) {
  const template = $('#video-editor-template');
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector('.video-editor-card');
  card.querySelector('.video-title').value = item.title || '';
  card.querySelector('.video-url').value = item.youtube_url || '';
  card.querySelector('.video-description').value = item.description || '';
  card.querySelector('.video-published').checked = item.published !== false;
  card.querySelector('.remove-video').addEventListener('click', () => card.remove());
  return card;
}

function renderVideos() {
  const root = $('#videos-list');
  root.replaceChildren();
  const items = Array.isArray(state.videos) ? state.videos : [];
  if (!items.length) root.append(videoCard());
  else items.forEach((item) => root.append(videoCard(item)));
}

function collectVideos() {
  return $$('.video-editor-card').map((card) => ({
    title: card.querySelector('.video-title').value.trim(),
    description: card.querySelector('.video-description').value.trim(),
    youtube_url: card.querySelector('.video-url').value.trim(),
    published: card.querySelector('.video-published').checked,
  }));
}

async function publish(resource, data) {
  if (!state.status?.write_enabled) throw new Error('A publicação ainda não está habilitada neste ambiente.');
  const response = await fetch('/api/admin/content', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ resource, data }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || `Falha ao publicar (${response.status}).`);
  return result;
}

async function saveSite(event) {
  event.preventDefault();
  const next = structuredClone(state.site);
  next.brand_tagline = $('#brand-tagline').value.trim();
  next.hero = next.hero || {};
  next.hero.title = $('#hero-title').value.trim();
  next.hero.lead = $('#hero-lead').value.trim();

  const button = $('#save-site');
  button.disabled = true;
  button.textContent = 'Publicando…';
  try {
    await publish('site', next);
    state.site = next;
    showMessage('Alteração enviada. O site será atualizado após a validação automática.');
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    button.textContent = 'Publicar alterações';
    setWriteAvailability();
  }
}

async function saveVideos() {
  const next = collectVideos();
  const formInvalid = next.some((item) => !item.title || !item.youtube_url);
  if (formInvalid) {
    showMessage('Preencha título e link do YouTube em todas as palestras.', 'error');
    return;
  }

  const button = $('#save-videos');
  button.disabled = true;
  button.textContent = 'Publicando…';
  try {
    await publish('videos', next);
    state.videos = next;
    showMessage('Palestras enviadas para publicação.');
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    button.textContent = 'Publicar alterações';
    setWriteAvailability();
  }
}

function bindTabs() {
  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      $$('.tab').forEach((node) => node.classList.toggle('is-active', node === tab));
      $$('[data-panel]').forEach((panel) => {
        const active = panel.dataset.panel === target;
        panel.hidden = !active;
        panel.classList.toggle('is-active', active);
      });
    });
  });
}

async function boot() {
  bindTabs();
  $('#site-form').addEventListener('submit', saveSite);
  $('#preview-site').addEventListener('click', refreshPreview);
  $('#brand-tagline').addEventListener('input', refreshPreview);
  $('#hero-title').addEventListener('input', refreshPreview);
  $('#hero-lead').addEventListener('input', refreshPreview);
  $('#add-video').addEventListener('click', () => $('#videos-list').append(videoCard()));
  $('#save-videos').addEventListener('click', saveVideos);

  try {
    const [status, site, videos] = await Promise.all([
      readJson('/api/admin/status').catch(() => ({
        write_enabled: false,
        message: 'API administrativa ainda não disponível neste ambiente.',
      })),
      readJson('/content/site.json'),
      readJson('/content/videos.json'),
    ]);
    state.status = status;
    state.site = site;
    state.videos = videos;
    applySiteToForm();
    renderVideos();
    setWriteAvailability();
  } catch (error) {
    state.status = { write_enabled: false, message: error.message };
    setWriteAvailability();
    showMessage(error.message, 'error');
  }
}

boot();
