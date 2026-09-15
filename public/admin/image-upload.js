(() => {
  'use strict';

  const MAX_BYTES = 4_000_000;
  const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const TARGETS = Object.freeze([
    ['#home-hero-image', 'Imagem principal'],
    ['#legacy-image', 'Imagem de Memória e legado'],
    ['#gallery-editor input[data-role="image"]', 'Imagem da galeria'],
  ]);

  function installStyles() {
    if (document.getElementById('pa-image-upload-styles')) return;
    const style = document.createElement('style');
    style.id = 'pa-image-upload-styles';
    style.textContent = `
.image-upload { grid-column: 1 / -1; display: grid; grid-template-columns: 120px 1fr; gap: 14px; align-items: center; padding: 14px; border: 1px solid var(--line, #d7ddd9); border-radius: 12px; background: #fff; }
.image-upload-preview { width: 120px; height: 82px; border-radius: 9px; overflow: hidden; background: #eef2ef; display: grid; place-items: center; color: #65716c; font-size: .78rem; text-align: center; }
.image-upload-preview img { width: 100%; height: 100%; object-fit: cover; }
.image-upload-controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.image-upload-title { flex-basis: 100%; font-size: .95rem; color: var(--ink, #18211e); }
.image-upload-controls input[type=file] { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.image-upload-status { flex-basis: 100%; margin: 2px 0 0; color: var(--ink-600, #59635f); font-size: .84rem; }
@media (max-width: 620px) { .image-upload { grid-template-columns: 1fr; } .image-upload-preview { width: 100%; height: 150px; } }
`;
    document.head.appendChild(style);
  }

  function toast(message, error = false) {
    const node = document.querySelector('#admin-message');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('error', error);
    node.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.hidden = true; }, 5000);
  }

  function toBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
  }

  function refreshPreview(input, image, empty) {
    const path = input.value.trim();
    if (!path) {
      image.hidden = true;
      image.removeAttribute('src');
      empty.hidden = false;
      empty.textContent = 'Sem imagem';
      return;
    }
    empty.hidden = true;
    image.hidden = false;
    image.src = `${path}${path.includes('?') ? '&' : '?'}_pa_media=${Date.now()}`;
  }

  function enhance(input, title) {
    if (!input || input.dataset.imageUpload === 'ready') return;
    input.dataset.imageUpload = 'ready';
    const label = input.closest('label');
    if (!label) return;

    const wrap = document.createElement('div');
    wrap.className = 'image-upload';
    wrap.setAttribute('aria-label', title);

    const preview = document.createElement('div');
    preview.className = 'image-upload-preview';
    const image = document.createElement('img');
    image.alt = '';
    const empty = document.createElement('span');
    preview.append(image, empty);

    const controls = document.createElement('div');
    controls.className = 'image-upload-controls';

    const heading = document.createElement('strong');
    heading.className = 'image-upload-title';
    heading.textContent = `${title} - upload`;

    const pickerLabel = document.createElement('label');
    pickerLabel.className = 'button secondary';
    pickerLabel.textContent = 'Enviar foto do computador';
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
    pickerLabel.appendChild(picker);

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'button secondary';
    clear.textContent = 'Remover foto';

    const status = document.createElement('p');
    status.className = 'image-upload-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Escolha uma foto JPG, PNG ou WebP de até 4 MB. O arquivo será enviado e o caminho será preenchido automaticamente. Depois clique em Salvar.';

    controls.append(heading, pickerLabel, clear, status);
    wrap.append(preview, controls);
    label.insertAdjacentElement('afterend', wrap);
    refreshPreview(input, image, empty);

    image.addEventListener('error', () => {
      image.hidden = true;
      empty.hidden = false;
      empty.textContent = 'Prévia indisponível';
    });

    input.addEventListener('change', () => refreshPreview(input, image, empty));
    clear.addEventListener('click', () => {
      input.value = '';
      picker.value = '';
      input.dispatchEvent(new Event('change', { bubbles: true }));
      status.textContent = 'Foto removida do campo. Clique em Salvar para aplicar.';
    });

    picker.addEventListener('change', async () => {
      const file = picker.files?.[0];
      if (!file) return;
      if (!ACCEPTED.has(file.type)) {
        picker.value = '';
        status.textContent = 'Formato inválido. Use JPG, PNG ou WebP.';
        toast(status.textContent, true);
        return;
      }
      if (file.size > MAX_BYTES) {
        picker.value = '';
        status.textContent = 'A foto excede o limite de 4 MB.';
        toast(status.textContent, true);
        return;
      }

      picker.disabled = true;
      clear.disabled = true;
      status.textContent = 'Enviando foto...';
      try {
        const response = await fetch('/api/admin/media', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ file_name: file.name, mime_type: file.type, data_base64: toBase64(await file.arrayBuffer()) }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok || !result.path) throw new Error(result.error || `Falha ao enviar a foto (${response.status}).`);
        input.value = result.path;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        status.textContent = 'Foto enviada. Clique em Salvar para aplicar nesta página.';
        toast('Foto enviada. Salve a página para aplicar a alteração.');
      } catch (error) {
        status.textContent = error.message || 'Não foi possível enviar a foto.';
        toast(status.textContent, true);
      } finally {
        picker.disabled = false;
        clear.disabled = false;
      }
    });
  }

  function scan() {
    for (const [selector, title] of TARGETS) document.querySelectorAll(selector).forEach((input) => enhance(input, title));
  }

  installStyles();
  const observer = new MutationObserver(() => queueMicrotask(scan));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
