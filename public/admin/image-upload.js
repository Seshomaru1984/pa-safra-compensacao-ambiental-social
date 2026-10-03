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
.image-upload { grid-column: 1 / -1; display: grid; grid-template-columns: 132px minmax(0, 1fr); gap: 18px; align-items: center; padding: 16px; margin: 0 0 18px; border: 1px solid var(--line, #d7ddd9); border-radius: 14px; background: #fff; }
.image-upload-preview { width: 132px; height: 92px; border: 1px solid rgba(24,33,30,.08); border-radius: 11px; overflow: hidden; background: #eef2ef; display: grid; place-items: center; color: #65716c; font-size: .8rem; text-align: center; }
.image-upload-preview img { width: 100%; height: 100%; object-fit: cover; }
.image-upload-controls { min-width: 0; display: grid; gap: 10px; align-content: center; }
.image-upload-title { display: block; margin: 0; font-size: .94rem; line-height: 1.25; color: var(--ink-950, #18211e); }
.image-upload-actions { display: grid; grid-template-columns: repeat(2, minmax(150px, 190px)); gap: 10px; align-items: stretch; justify-content: start; }
.image-upload-action { width: 100%; min-height: 42px; margin: 0; padding: 0 14px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: .88rem; font-weight: 800; line-height: 1.15; text-align: center; cursor: pointer; box-sizing: border-box; }
.image-upload-picker { border: 1px solid var(--forest-800, #173f35); background: var(--forest-800, #173f35); color: #fff; }
.image-upload-picker:hover { filter: brightness(.96); }
.image-upload-remove { border: 1px solid rgba(138,45,37,.32); background: #fff; color: var(--danger, #8a2d25); }
.image-upload-remove:hover { background: rgba(138,45,37,.05); }
.image-upload-action:focus-visible { outline: 3px solid rgba(31,89,73,.18); outline-offset: 2px; }
.image-upload-action:disabled { cursor: not-allowed; opacity: .45; }
.image-upload-controls input[type=file] { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.image-upload-status { margin: 0; max-width: 620px; color: var(--ink-600, #59635f); font-size: .82rem; line-height: 1.45; }
@media (max-width: 620px) {
  .image-upload { grid-template-columns: 1fr; gap: 12px; padding: 14px; }
  .image-upload-preview { width: 100%; height: 160px; }
  .image-upload-actions { grid-template-columns: 1fr; width: 100%; }
  .image-upload-action { min-height: 44px; }
}
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

    const actionRow = document.createElement('div');
    actionRow.className = 'image-upload-actions';

    const pickerLabel = document.createElement('label');
    pickerLabel.className = 'image-upload-action image-upload-picker';
    pickerLabel.textContent = 'Enviar foto';
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
    pickerLabel.appendChild(picker);

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'image-upload-action image-upload-remove';
    clear.textContent = 'Remover foto';

    actionRow.append(pickerLabel, clear);

    const status = document.createElement('p');
    status.className = 'image-upload-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'JPG, PNG ou WebP, até 4 MB. Depois do envio, clique em Salvar para aplicar.';

    controls.append(heading, actionRow, status);
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
      pickerLabel.setAttribute('aria-disabled', 'true');
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
        pickerLabel.removeAttribute('aria-disabled');
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
