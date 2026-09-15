(() => {
  'use strict';

  const ACCESS_SLUG = 'acesso-localizacao';
  const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  const LEAFLET_CSS_INTEGRITY = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  const LEAFLET_JS_INTEGRITY = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
  const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  const REFERENCES = Object.freeze([
    {
      id: 'nova-xavantina',
      label: 'Nova Xavantina',
      detail: 'Referência urbana do município.',
      lat: -14.677063,
      lng: -52.350234,
      kind: 'city',
    },
    {
      id: 'br158-mt251',
      label: 'BR-158 / MT-251',
      detail: 'Início do trecho estadual 251EMT0005 da MT-251, conforme SINFRA/MT.',
      lat: -14.6062208333,
      lng: -52.3589558333,
      kind: 'road',
    },
    {
      id: 'divisa-campinapolis',
      label: 'Divisa Nova Xavantina / Campinápolis',
      detail: 'Ponto de referência do trecho 251EMT0005 da MT-251, conforme SINFRA/MT.',
      lat: -14.6472133333,
      lng: -52.7533133333,
      kind: 'road',
    },
    {
      id: 'mt251-mt110',
      label: 'MT-251 / MT-110',
      detail: 'Entroncamento final do trecho 251EMT0006 da MT-251, conforme SINFRA/MT.',
      lat: -14.6258655556,
      lng: -52.790185,
      kind: 'road',
    },
  ]);

  let leafletPromise = null;
  let mapInstance = null;
  let mapSection = null;
  let userMarker = null;
  let userAccuracy = null;

  function installStyles() {
    if (document.getElementById('pa-access-map-styles')) return;
    const style = document.createElement('style');
    style.id = 'pa-access-map-styles';
    style.textContent = `
.access-map-panel { margin: 0 0 24px; border: 1px solid rgba(16,50,42,.14); border-radius: 20px; background: #fff; overflow: hidden; box-shadow: 0 18px 44px rgba(20,44,37,.08); }
.access-map-head { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 18px; align-items: end; padding: 22px 22px 16px; }
.access-map-head h2 { margin: 0 0 6px; font-size: clamp(1.35rem, 3vw, 1.85rem); }
.access-map-head p { margin: 0; color: #596963; }
.access-map-badge { align-self: start; border-radius: 999px; padding: 7px 10px; background: #f3eee2; color: #173f35; font-size: .78rem; font-weight: 800; white-space: nowrap; }
.access-map-actions { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 22px 16px; }
.access-map-action { min-height: 44px; border: 1px solid #173f35; border-radius: 999px; padding: 0 15px; background: #fff; color: #173f35; cursor: pointer; font: inherit; font-weight: 800; }
.access-map-action.primary { background: #173f35; color: #fff; }
.access-map-action:focus-visible { outline: 3px solid rgba(31,89,73,.24); outline-offset: 2px; }
.access-map-status { margin: 0; padding: 0 22px 14px; min-height: 1.35em; color: #596963; font-size: .88rem; }
.access-map-canvas { width: 100%; height: clamp(380px, 58vh, 620px); background: #e8eee9; }
.access-map-references { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; padding: 14px 16px 10px; background: #fbf9f3; border-top: 1px solid rgba(16,50,42,.1); }
.access-map-reference { min-height: 48px; border: 1px solid rgba(16,50,42,.16); border-radius: 12px; padding: 9px 10px; background: #fff; color: #173f35; cursor: pointer; font: inherit; font-size: .82rem; font-weight: 800; text-align: left; }
.access-map-reference:hover, .access-map-reference:focus-visible { border-color: #1f5949; background: #f3eee2; }
.access-map-note { padding: 10px 18px 18px; background: #fbf9f3; color: #596963; font-size: .82rem; }
.access-map-note p { margin: 0 0 7px; }
.access-map-note p:last-child { margin-bottom: 0; }
.access-map-note a { color: #1f5949; font-weight: 750; }
.access-map-fallback { display: grid; place-items: center; min-height: 320px; padding: 28px; text-align: center; background: #f3eee2; color: #173f35; }
.access-map-fallback p { max-width: 620px; }
.access-map-popup strong { display: block; margin-bottom: 4px; color: #173f35; }
.access-map-popup span { color: #596963; font-size: .88rem; }
.access-map-user-label { font-weight: 800; }
.leaflet-container { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.leaflet-control-attribution { font-size: 10px; }
@media (max-width: 760px) {
  .access-map-head { grid-template-columns: 1fr; padding: 18px 16px 12px; }
  .access-map-badge { justify-self: start; }
  .access-map-actions { padding: 0 16px 14px; }
  .access-map-action { flex: 1 1 150px; }
  .access-map-status { padding: 0 16px 12px; }
  .access-map-canvas { height: min(62vh, 520px); min-height: 360px; }
  .access-map-references { grid-template-columns: repeat(2, minmax(0,1fr)); padding: 12px; }
}
@media (max-width: 430px) {
  .access-map-actions { display: grid; grid-template-columns: 1fr; }
  .access-map-reference { min-height: 54px; }
  .access-map-canvas { height: 58vh; min-height: 350px; }
}
`;
    document.head.appendChild(style);
  }

  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletPromise) return leafletPromise;

    leafletPromise = new Promise((resolve, reject) => {
      let css = document.querySelector('link[data-pa-leaflet]');
      if (!css) {
        css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = LEAFLET_CSS;
        css.integrity = LEAFLET_CSS_INTEGRITY;
        css.crossOrigin = '';
        css.dataset.paLeaflet = 'css';
        document.head.appendChild(css);
      }

      let script = document.querySelector('script[data-pa-leaflet]');
      if (script) {
        if (window.L) resolve(window.L);
        else {
          script.addEventListener('load', () => resolve(window.L), { once: true });
          script.addEventListener('error', () => reject(new Error('Não foi possível carregar a biblioteca do mapa.')), { once: true });
        }
        return;
      }

      script = document.createElement('script');
      script.src = LEAFLET_JS;
      script.integrity = LEAFLET_JS_INTEGRITY;
      script.crossOrigin = '';
      script.dataset.paLeaflet = 'js';
      script.addEventListener('load', () => resolve(window.L), { once: true });
      script.addEventListener('error', () => reject(new Error('Não foi possível carregar a biblioteca do mapa.')), { once: true });
      document.head.appendChild(script);
    });

    return leafletPromise;
  }

  function currentSlug() {
    return window.location.hash.replace('#', '').trim().toLowerCase();
  }

  function accessSection() {
    return document.querySelector(`[data-view="${ACCESS_SLUG}"]`);
  }

  function makePanel(section) {
    let panel = section.querySelector('.access-map-panel');
    if (panel) return panel;

    const content = section.querySelector('.dynamic-page-content');
    if (!content) return null;

    panel = document.createElement('section');
    panel.className = 'access-map-panel';
    panel.setAttribute('aria-labelledby', 'access-map-title');
    panel.innerHTML = `
      <div class="access-map-head">
        <div>
          <h2 id="access-map-title">Mapa interativo da região</h2>
          <p>Explore as rodovias e acessos da região, aproxime o mapa e use a localização do aparelho para saber onde você está.</p>
        </div>
        <span class="access-map-badge">Mobile + GPS</span>
      </div>
      <div class="access-map-actions" aria-label="Controles rápidos do mapa">
        <button class="access-map-action primary" type="button" data-map-locate>Minha localização</button>
        <button class="access-map-action" type="button" data-map-region>Mostrar região</button>
      </div>
      <p class="access-map-status" data-map-status role="status" aria-live="polite">A localização só será solicitada quando você tocar em “Minha localização”.</p>
      <div class="access-map-canvas" data-map-canvas aria-label="Mapa interativo de Nova Xavantina, PA Safra e acessos regionais"></div>
      <div class="access-map-references" data-map-references aria-label="Pontos de referência rodoviária"></div>
      <div class="access-map-note">
        <p><strong>Fontes cartográficas:</strong> mapa-base OpenStreetMap; pontos rodoviários de referência conferidos no Sistema Rodoviário Estadual da SINFRA/MT.</p>
        <p>O site não grava suas coordenadas no servidor. Ao usar “Minha localização”, o navegador pede sua autorização e o mapa é centralizado no aparelho. Os tiles cartográficos solicitados ao provedor correspondem à área visualizada.</p>
        <p><a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">Informar uma correção no mapa ↗</a></p>
      </div>
    `;
    content.prepend(panel);
    return panel;
  }

  function setStatus(panel, text) {
    const status = panel?.querySelector('[data-map-status]');
    if (status) status.textContent = text;
  }

  function fitRegion(map, L) {
    const bounds = L.latLngBounds(REFERENCES.map((point) => [point.lat, point.lng]));
    map.fitBounds(bounds, { padding: [34, 34], maxZoom: 10 });
  }

  function popupHtml(point) {
    const wrapper = document.createElement('div');
    wrapper.className = 'access-map-popup';
    const title = document.createElement('strong');
    title.textContent = point.label;
    const detail = document.createElement('span');
    detail.textContent = point.detail;
    wrapper.append(title, detail);
    return wrapper;
  }

  function addReferencePoints(map, panel, L) {
    const refsRoot = panel.querySelector('[data-map-references]');
    refsRoot?.replaceChildren();

    REFERENCES.forEach((point) => {
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: point.kind === 'city' ? 8 : 7,
        weight: 3,
        color: point.kind === 'city' ? '#173f35' : '#8b5c3d',
        fillColor: point.kind === 'city' ? '#1f5949' : '#c78c5d',
        fillOpacity: 0.92,
      }).addTo(map);
      marker.bindPopup(popupHtml(point));

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'access-map-reference';
      button.textContent = point.label;
      button.addEventListener('click', () => {
        map.setView([point.lat, point.lng], point.kind === 'city' ? 13 : 14, { animate: true });
        marker.openPopup();
      });
      refsRoot?.appendChild(button);
    });
  }

  function locateUser(map, panel, L) {
    if (!navigator.geolocation) {
      setStatus(panel, 'Este navegador não oferece geolocalização. O mapa continua disponível normalmente.');
      return;
    }

    setStatus(panel, 'Solicitando sua localização ao navegador...');
    map.locate({
      setView: true,
      maxZoom: 16,
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 15000,
    });

    map.once('locationfound', (event) => {
      if (userMarker) map.removeLayer(userMarker);
      if (userAccuracy) map.removeLayer(userAccuracy);

      userAccuracy = L.circle(event.latlng, {
        radius: event.accuracy,
        weight: 1,
        color: '#1f5949',
        fillColor: '#1f5949',
        fillOpacity: 0.1,
      }).addTo(map);

      userMarker = L.circleMarker(event.latlng, {
        radius: 9,
        weight: 4,
        color: '#ffffff',
        fillColor: '#1f5949',
        fillOpacity: 1,
      }).addTo(map);

      const accuracy = Math.max(1, Math.round(event.accuracy));
      userMarker.bindPopup(`<span class="access-map-user-label">Você está aqui</span><br>Precisão aproximada: ${accuracy} m`).openPopup();
      setStatus(panel, `Localização encontrada. Precisão aproximada: ${accuracy} m.`);
    });

    map.once('locationerror', (event) => {
      const message = event?.message || '';
      if (/denied|permission/i.test(message)) setStatus(panel, 'Localização não autorizada. Você pode continuar explorando o mapa manualmente.');
      else setStatus(panel, 'Não foi possível obter sua localização agora. Você pode continuar explorando o mapa manualmente.');
    });
  }

  function initMap(panel, L) {
    const canvas = panel.querySelector('[data-map-canvas]');
    if (!canvas || canvas.dataset.mapReady === 'true') return;

    canvas.dataset.mapReady = 'true';
    mapInstance = L.map(canvas, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      minZoom: 7,
      maxZoom: 18,
    });
    mapSection = panel.closest(`[data-view="${ACCESS_SLUG}"]`);

    L.tileLayer(OSM_TILES, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
    }).addTo(mapInstance);

    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(mapInstance);
    addReferencePoints(mapInstance, panel, L);
    fitRegion(mapInstance, L);

    panel.querySelector('[data-map-locate]')?.addEventListener('click', () => locateUser(mapInstance, panel, L));
    panel.querySelector('[data-map-region]')?.addEventListener('click', () => {
      fitRegion(mapInstance, L);
      setStatus(panel, 'Visão regional restaurada. Use os pontos abaixo do mapa para aproximar um acesso específico.');
    });

    requestAnimationFrame(() => mapInstance.invalidateSize());
  }

  function showFallback(panel, message) {
    const canvas = panel?.querySelector('[data-map-canvas]');
    if (!canvas) return;
    canvas.classList.add('access-map-fallback');
    canvas.textContent = message;
    setStatus(panel, 'O conteúdo textual de acesso permanece disponível abaixo do mapa.');
  }

  async function mountIfNeeded() {
    if (currentSlug() !== ACCESS_SLUG) return;
    const section = accessSection();
    if (!section) return;

    installStyles();
    const panel = makePanel(section);
    if (!panel) return;

    if (mapInstance && mapSection === section) {
      requestAnimationFrame(() => mapInstance.invalidateSize());
      return;
    }

    try {
      const L = await loadLeaflet();
      if (!L) throw new Error('Biblioteca indisponível.');
      initMap(panel, L);
    } catch (error) {
      console.warn('[PA Safra] Falha ao iniciar mapa interativo:', error);
      showFallback(panel, 'Não foi possível carregar o mapa interativo agora. Tente novamente mais tarde.');
    }
  }

  window.addEventListener('hashchange', () => queueMicrotask(mountIfNeeded));
  const observer = new MutationObserver(() => queueMicrotask(mountIfNeeded));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  queueMicrotask(mountIfNeeded);
})();
