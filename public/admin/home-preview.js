(() => {
  'use strict';

  const TOKEN_PARAM = '_pa_home_preview';
  const STORAGE_PREFIX = 'pa-safra-home-preview:';
  const MAX_AGE_MS = 10 * 60 * 1000;
  const ALLOWED_LAYOUTS = new Set(['text-left', 'image-left']);

  const value = (selector) => document.querySelector(selector)?.value?.trim() || '';
  const html = (selector) => document.querySelector(selector)?.innerHTML?.trim() || '';

  function selectedLayout() {
    const selected = document.querySelector('input[name="home-hero-layout"]:checked')?.value;
    if (ALLOWED_LAYOUTS.has(selected)) return selected;
    const fallback = window.PASafraHomeEditor?.getSelectedLayout?.();
    return ALLOWED_LAYOUTS.has(fallback) ? fallback : 'text-left';
  }

  function collectSitePatch() {
    return {
      brand_tagline: value('#home-brand-tagline'),
      hero: {
        eyebrow: value('#home-hero-eyebrow'),
        title: value('#home-hero-title'),
        lead: html('#home-hero-lead'),
        title_alignment: value('#home-title-alignment') || 'left',
        title_size: value('#home-title-size') || 'standard',
        image: value('#home-hero-image'),
        image_alt: value('#home-hero-alt'),
      },
      home: {
        intro_eyebrow: value('#home-intro-eyebrow'),
        intro_title: value('#home-intro-title'),
        intro_text: html('#home-intro-text'),
      },
    };
  }

  function cleanupExpired() {
    const now = Date.now();
    try {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith(STORAGE_PREFIX)) continue;
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (!Number.isFinite(item.expires_at) || item.expires_at <= now) localStorage.removeItem(key);
        } catch {
          localStorage.removeItem(key);
        }
      }
    } catch {}
  }

  function token() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }

  function createUrl(input = '/') {
    cleanupExpired();
    const draftToken = token();
    const layout = selectedLayout();
    const draft = {
      version: 1,
      created_at: Date.now(),
      expires_at: Date.now() + MAX_AGE_MS,
      site_patch: collectSitePatch(),
    };

    try {
      localStorage.setItem(`${STORAGE_PREFIX}${draftToken}`, JSON.stringify(draft));
    } catch {
      throw new Error('Não foi possível preparar a pré-visualização neste navegador.');
    }

    const url = input instanceof URL ? new URL(input.toString()) : new URL(String(input), window.location.origin);
    url.searchParams.set(TOKEN_PARAM, draftToken);
    url.searchParams.set('layout_home', layout);
    url.searchParams.set('_pa_preview', String(Date.now()));
    url.hash = 'inicio';
    return url;
  }

  window.PASafraHomePreview = Object.freeze({ createUrl });
})();
