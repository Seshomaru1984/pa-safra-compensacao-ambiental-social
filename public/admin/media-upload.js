(() => {
  'use strict';

  const MAX_BYTES = 4_000_000;
  const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const TARGETS = [
    { selector: '#home-hero-image', title: 'Imagem principal' },
    { selector: '#legacy-image', title: 'Imagem de Memória e legado' },
    { selector: '#gallery-editor input[data-role="image"]', title: 'Imagem da galeria' },
  ];

  function toast(message, type = 'ok') {
    const node = document.querySelector('#admin-message');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('error', type === 'error');
    node.hidden = false;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => { node.hidden = true; }, 5000);
  }

  function base64FromBuffer(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function currentPreview(path, image, empty) {
    const value = String(path || '').trim();
    if (!value) {
      image.hidden = true;
      image.removeAttribute('src');
      empty.hidden = false;
      return;
    }
    image.hidden = false;
    empty.hidden = true;
    image.src = `${value}${value.includes('?') ? '&' : '?'}_pa_media=${Date.now()}`;
  }

  function makeButton(text, className = 'button secondary') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = text;
    return button;
  }

  function enhance(input, title) {
    if (!input || input.dataset.mediaUploadEnhanced === 'true') return;
    input.dataset.mediaUploadEnhanced = 'true';

    const originalLabel = input.closest('label');
    if (!originalLabel) return;
    originalLabel.hidden = true;

    const wrap = document.createElement('section');
    wrap.className = 'media-upload-field full';
    wrap.dataset.mediaUploadFor = input.id || 'gallery-image';

    const heading = document.createElement('div');
    heading.className = 'media-upload-heading';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const help = document.createElement('span');
    help.textContent = 'Escolha uma imagem do computador. JPG, PNG ou WebP, até 4 MB.';
    heading.append(strong, help);

    const body = document.createElement('div');
    body.className = 'media-upload-body';

    const preview = document.createElement('div');
    preview.className = 'media-upload-preview';
    const image = document.createElement('img');
    image.alt = 'Prévia da imagem selecionada';
    image.addEventListener('error', () => {
      image.hidden = true;
      empty.hidden = false;
      empty.textContent = 'A imagem atual não pôde ser carregada.';
    });
    const empty = document.createElement('span');
    empty.className = 'media-upload-empty';
    empty.textContent = 'Nenhuma imagem selecionada';
    preview.append(image, empty);

    const controls = document.createElement('div');
    controls.className = 'media-upload-controls';
    const pickerLabel = document.createElement('label');
    pickerLabel.className = 'button secondary media-file-picker';
    pickerLabel.textContent = 'Selecionar imagem';
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
    pickerLabel.appendChild(picker);

    const remove = makeButton('Remover imagem', 'button secondary subtle');
    const status = document.createElement('p');
    status.className = 'media-upload-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    controls.append(pickerLabel, remove, status);
    body.append(preview, controls);
    wrap.append(heading, body);
    originalLabel.insertAdjacentElement('afterend', wrap);

    currentPreview(input.value, image, empty);

    remove.addEventListener('click', () => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      picker.value = '';
      status.textContent = 'Imagem removida. Clique em Salvar no final da página para aplicar.';
      currentPreview('', image, empty);
    });

    picker.addEventListener('change', async () => {
      const file = picker.files?.[0];
      if (!file) return;
      if (!ACCEPTED.has(file.type)) {
        picker.value = '';
        status.textContent = 'Formato inválido. Use JPG, PNG ou WebP.';
        toast(status.textContent, 'error');
        return;
      }
      if (file.size > MAX_BYTES) {
        picker.value = '';
        status.textContent = 'A imagem excede o limite de 4 MB.';
        toast(status.textContent, 'error');
        return;
      }

      const localUrl = URL.createObjectURL(file);
      image.hidden = false;
      empty.hidden = true;
      image.src = localUrl;
      picker.disabled = true;
      remove.disabled = true;
      status.textContent = 'Enviando imagem…';

      try {
        const dataBase64 = base64FromBuffer(await file.arrayBuffer());
        const response = await fetch('/api/admin/media', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            file_name: file.name,
            mime_type: file.type,
            data_base64: dataBase64,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok || !result.path) {
          throw new Error(result.error || `Falha ao enviar a imagem (${response.status}).`);
        }

        input.value = result.path;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        status.textContent = 'Imagem enviada. Clique em Salvar no final desta página para aplicar.';
        currentPreview(result.path, image, empty);
        toast('Imagem enviada. Agora salve a página para aplicar a alteração.');
      } catch (error) {
        status.textContent = error.message || 'Não foi possível enviar a imagem.';
        toast(status.textContent, 'error');
        currentPreview(input.value, image, empty);
      } finally {
        URL.revokeObjectURL(localUrl);
        picker.disabled = false;
        remove.disabled = false;
      }
    });
  }

  function scan() {
    for (const target of TARGETS) {
      document.querySelectorAll(target.selector).forEach((input) => enhance(input, target.title));
    }
  }

  let scheduled = false;
  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  }

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
