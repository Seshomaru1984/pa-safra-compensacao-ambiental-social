(() => {
  'use strict';

  const ACCESS_SLUG = 'acesso-localizacao';
  const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  const LEAFLET_CSS_INTEGRITY = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  const LEAFLET_JS_INTEGRITY = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
  const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const TOPO_TILES = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
  const REGION_BOUNDS = Object.freeze({ xmin: -53.15, ymin: -15.15, xmax: -51.75, ymax: -14.05 });

  const REFERENCES = Object.freeze([
    { id: 'nova-xavantina', label: 'Nova Xavantina', detail: 'Referência urbana do município.', lat: -14.677063, lng: -52.350234, kind: 'city' },
    { id: 'br158-mt251', label: 'BR-158 / MT-251', detail: 'Início do trecho estadual 251EMT0005 da MT-251, conforme SINFRA/MT.', lat: -14.6062208333, lng: -52.3589558333, kind: 'road' },
    { id: 'divisa-campinapolis', label: 'Divisa Nova Xavantina / Campinápolis', detail: 'Ponto de referência do trecho 251EMT0005 da MT-251, conforme SINFRA/MT.', lat: -14.6472133333, lng: -52.7533133333, kind: 'road' },
    { id: 'mt251-mt110', label: 'MT-251 / MT-110', detail: 'Entroncamento final do trecho 251EMT0006 da MT-251, conforme SINFRA/MT.', lat: -14.6258655556, lng: -52.790185, kind: 'road' },
  ]);

  const OFFICIAL_LAYERS = Object.freeze({
    roads: { label: 'Vias oficiais e vicinais', maxZoom: 11 },
    drainage: { label: 'Rios e córregos', maxZoom: 11 },
    water: { label: "Massas d'água", maxZoom: 12 },
    settlements: { label: 'Projetos de assentamento (INCRA)', maxZoom: 11 },
    municipalities: { label: 'Limites municipais', maxZoom: 9 },
  });

  let leafletPromise = null;
  let mapInstance = null;
  let mapSection = null;
  let userMarker = null;
  let userAccuracy = null;
  const layerPromises = new Map();
  const loadedLayers = new Set();

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
.access-map-popup strong { display: block; margin-bottom: 4px; color: #173f35; }
.access-map-popup span { color: #596963; font-size: .88rem; }
.access-map-user-label { font-weight: 800; }
.leaflet-container { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.leaflet-control-attribution { font-size: 10px; }
.leaflet-control-layers { border: 1px solid rgba(16,50,42,.2) !important; border-radius: 12px !important; box-shadow: 0 10px 24px rgba(20,44,37,.14) !important; overflow: hidden; }
.leaflet-control-layers:not(.leaflet-control-layers-expanded) .leaflet-control-layers-toggle { display: flex !important; align-items: center; gap: 8px; width: auto !important; min-width: 116px; height: 44px !important; padding: 0 13px !important; background: #fff !important; color: #173f35 !important; text-decoration: none !important; font-size: .84rem; font-weight: 800; line-height: 1; }
.access-map-layers-symbol { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; background: #173f35; color: #fff; font-size: 14px; line-height: 1; }
.access-map-layers-label { white-space: nowrap; }
.leaflet-control-layers-expanded { max-width: min(310px, calc(100vw - 72px)); padding: 12px 14px !important; color: #18211e; }
.leaflet-control-layers label { margin: 0; padding: 5px 0; font-weight: 700; font-size: .84rem; }
.leaflet-control-layers-selector { width: auto; margin-right: 7px; }
.leaflet-tooltip.access-map-tooltip { max-width: min(300px, calc(100vw - 48px)); border: 1px solid rgba(16,50,42,.18); border-radius: 10px; padding: 8px 10px; background: rgba(255,255,255,.98); box-shadow: 0 8px 22px rgba(20,44,37,.16); color: #18211e; }
.leaflet-tooltip.access-map-tooltip .access-map-popup { min-width: 130px; }
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
  .leaflet-control-layers-expanded { max-width: calc(100vw - 56px); }
  .leaflet-control-layers:not(.leaflet-control-layers-expanded) .leaflet-control-layers-toggle { min-width: 108px; height: 42px !important; padding: 0 11px !important; }
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

  const currentSlug = () => window.location.hash.replace('#', '').trim().toLowerCase();
  const accessSection = () => document.querySelector(`[data-view="${ACCESS_SLUG}"]`);

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
          <p>Explore acessos, relevo, rios e limites. Use o botão “Camadas” no canto superior direito do mapa para mostrar apenas o que precisar.</p>
        </div>
        <span class="access-map-badge">Mobile + GPS + camadas</span>
      </div>
      <div class="access-map-actions" aria-label="Controles rápidos do mapa">
        <button class="access-map-action primary" type="button" data-map-locate>Minha localização</button>
        <button class="access-map-action" type="button" data-map-region>Mostrar região</button>
      </div>
      <p class="access-map-status" data-map-status role="status" aria-live="polite">A localização só será solicitada quando você tocar em “Minha localização”. As camadas oficiais são carregadas apenas quando selecionadas. No computador, passe o mouse sobre pontos e feições para ver a legenda.</p>
      <div class="access-map-canvas" data-map-canvas aria-label="Mapa interativo de Nova Xavantina, PA Safra e acessos regionais"></div>
      <div class="access-map-references" data-map-references aria-label="Pontos de referência rodoviária"></div>
      <div class="access-map-note">
        <p><strong>Fontes:</strong> OpenStreetMap; relevo OpenTopoMap com SRTM; sistema viário, drenagem, massas d'água e limites municipais do INTERMAT; projetos de assentamento do INCRA publicados no geosserviço do IBAMA; pontos rodoviários conferidos na SINFRA/MT.</p>
        <p><strong>Leitura das camadas:</strong> “Rios e córregos” mostra eixos de drenagem. “Massas d'água” mostra polígonos de cursos de margem dupla e outros corpos d'água da base oficial. A cartografia do INTERMAT usada nessas camadas é de escala 1:100.000.</p>
        <p>As camadas oficiais são consultadas pela própria aplicação e limitadas à região de interesse. O site não grava suas coordenadas de localização no servidor.</p>
        <p><a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">Informar uma correção no mapa-base ↗</a></p>
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
    map.fitBounds(L.latLngBounds(REFERENCES.map((point) => [point.lat, point.lng])), { padding: [34, 34], maxZoom: 10 });
  }

  function regionBounds(L) {
    return L.latLngBounds(
      [REGION_BOUNDS.ymin, REGION_BOUNDS.xmin],
      [REGION_BOUNDS.ymax, REGION_BOUNDS.xmax],
    );
  }

  function featureCollectionBounds(data, L) {
    const bounds = L.latLngBounds([]);
    const visit = (coordinates) => {
      if (!Array.isArray(coordinates)) return;
      if (
        coordinates.length >= 2
        && Number.isFinite(coordinates[0])
        && Number.isFinite(coordinates[1])
      ) {
        const lng = coordinates[0];
        const lat = coordinates[1];
        if (
          lng >= REGION_BOUNDS.xmin && lng <= REGION_BOUNDS.xmax
          && lat >= REGION_BOUNDS.ymin && lat <= REGION_BOUNDS.ymax
        ) bounds.extend([lat, lng]);
        return;
      }
      coordinates.forEach(visit);
    };

    data?.features?.forEach((feature) => visit(feature?.geometry?.coordinates));
    return bounds.isValid() ? bounds : regionBounds(L);
  }

  function fitOfficialLayer(name, group, map) {
    const bounds = group?._paFitBounds;
    if (!bounds?.isValid?.()) return;
    map.fitBounds(bounds, {
      padding: [28, 28],
      maxZoom: OFFICIAL_LAYERS[name]?.maxZoom || 11,
      animate: true,
    });
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

  function featurePopup(titleText, detailText) {
    const wrapper = document.createElement('div');
    wrapper.className = 'access-map-popup';
    const title = document.createElement('strong');
    title.textContent = titleText;
    wrapper.appendChild(title);
    if (detailText) {
      const detail = document.createElement('span');
      detail.textContent = detailText;
      wrapper.appendChild(detail);
    }
    return wrapper;
  }

  function bindFeatureInfo(layer, titleText, detailText) {
    layer.bindPopup(featurePopup(titleText, detailText));
    layer.bindTooltip(featurePopup(titleText, detailText), {
      sticky: true,
      direction: 'top',
      opacity: .98,
      className: 'access-map-tooltip',
    });
  }

  function labelLayersControl(control) {
    const toggle = control?.getContainer()?.querySelector('.leaflet-control-layers-toggle');
    if (!toggle) return;
    toggle.replaceChildren();
    toggle.setAttribute('aria-label', 'Abrir camadas do mapa');
    toggle.setAttribute('title', 'Camadas do mapa');
    const symbol = document.createElement('span');
    symbol.className = 'access-map-layers-symbol';
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = '▤';
    const label = document.createElement('span');
    label.className = 'access-map-layers-label';
    label.textContent = 'Camadas';
    toggle.append(symbol, label);
  }

  function firstText(properties, keys, fallback = '') {
    for (const key of keys) {
      const value = properties?.[key];
      if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
    }
    return fallback;
  }

  function roadStyle(feature) {
    const jurisdiction = firstText(feature?.properties, ['sv_juriscl']).toLowerCase();
    if (jurisdiction.includes('federal')) return { color: '#a33d2c', weight: 3.2, opacity: .9 };
    if (jurisdiction.includes('estadual')) return { color: '#b7792b', weight: 3, opacity: .9 };
    return { color: '#665f57', weight: 2, opacity: .76, dashArray: '5 5' };
  }

  function geoJsonOptions(name) {
    const onEachFeature = (feature, layer) => {
      const p = feature?.properties || {};
      if (name === 'roads') bindFeatureInfo(layer, firstText(p, ['sv_no', 'sv_den'], 'Trecho viário'), [firstText(p, ['sv_juriscl']), firstText(p, ['sv_tipo'])].filter(Boolean).join(' · '));
      if (name === 'drainage') bindFeatureInfo(layer, firstText(p, ['td_no'], 'Curso d’água'), [firstText(p, ['td_tipo']), firstText(p, ['td_juris'])].filter(Boolean).join(' · '));
      if (name === 'water') bindFeatureInfo(layer, firstText(p, ['ma_no'], "Massa d'água"), firstText(p, ['ma_tipo']));
      if (name === 'settlements') bindFeatureInfo(layer, firstText(p, ['s_no'], 'Projeto de assentamento'), [firstText(p, ['s_mn']), firstText(p, ['s_sipra']), firstText(p, ['s_md'])].filter(Boolean).join(' · '));
      if (name === 'municipalities') bindFeatureInfo(layer, firstText(p, ['mn_no', 'mn_cod'], 'Limite municipal'), 'Base político-administrativa do INTERMAT.');
    };
    if (name === 'roads') return { style: roadStyle, onEachFeature };
    if (name === 'drainage') return { style: { color: '#2d77a8', weight: 1.6, opacity: .86 }, onEachFeature };
    if (name === 'water') return { style: { color: '#2d77a8', weight: 1, fillColor: '#7bbde2', fillOpacity: .38 }, onEachFeature };
    if (name === 'settlements') return { style: { color: '#6d7f35', weight: 2, fillColor: '#c9d783', fillOpacity: .16 }, onEachFeature };
    if (name === 'municipalities') return { style: { color: '#4c514f', weight: 2, opacity: .76, fillOpacity: 0, dashArray: '8 6' }, onEachFeature };
    return { onEachFeature };
  }

  async function populateOfficialLayer(name, group, panel, L) {
    if (loadedLayers.has(name)) {
      fitOfficialLayer(name, group, mapInstance);
      setStatus(panel, `${OFFICIAL_LAYERS[name].label} exibida e enquadrada na área correspondente.`);
      return;
    }
    if (layerPromises.has(name)) return layerPromises.get(name);
    setStatus(panel, `Carregando ${OFFICIAL_LAYERS[name].label}...`);
    const promise = fetch(`/api/map/layer?layer=${encodeURIComponent(name)}`, {
      credentials: 'same-origin',
      headers: { accept: 'application/geo+json, application/json;q=0.9' },
    }).then(async (response) => {
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || data.type !== 'FeatureCollection') throw new Error(data?.error || 'Resposta cartográfica inválida.');
      L.geoJSON(data, geoJsonOptions(name)).addTo(group);
      group._paFitBounds = featureCollectionBounds(data, L);
      loadedLayers.add(name);
      fitOfficialLayer(name, group, mapInstance);
      setStatus(panel, `${OFFICIAL_LAYERS[name].label} carregada com ${data.features.length} feições e enquadrada automaticamente.`);
    }).catch((error) => {
      console.warn('[PA Safra] Falha ao carregar camada oficial:', name, error);
      setStatus(panel, `${OFFICIAL_LAYERS[name].label} não pôde ser carregada agora. O restante do mapa continua disponível.`);
      if (mapInstance?.hasLayer(group)) mapInstance.removeLayer(group);
      throw error;
    }).finally(() => layerPromises.delete(name));
    layerPromises.set(name, promise);
    return promise;
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
        fillOpacity: .92,
      }).addTo(map);
      marker.bindPopup(popupHtml(point));
      marker.bindTooltip(popupHtml(point), {
        sticky: true,
        direction: 'top',
        opacity: .98,
        className: 'access-map-tooltip',
      });
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'access-map-reference';
      button.textContent = point.label;
      button.addEventListener('mouseenter', () => marker.openTooltip());
      button.addEventListener('mouseleave', () => marker.closeTooltip());
      button.addEventListener('focus', () => marker.openTooltip());
      button.addEventListener('blur', () => marker.closeTooltip());
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
    map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 });
    map.once('locationfound', (event) => {
      if (userMarker) map.removeLayer(userMarker);
      if (userAccuracy) map.removeLayer(userAccuracy);
      userAccuracy = L.circle(event.latlng, { radius: event.accuracy, weight: 1, color: '#1f5949', fillColor: '#1f5949', fillOpacity: .1 }).addTo(map);
      userMarker = L.circleMarker(event.latlng, { radius: 9, weight: 4, color: '#ffffff', fillColor: '#1f5949', fillOpacity: 1 }).addTo(map);
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
    mapInstance = L.map(canvas, { zoomControl: true, attributionControl: true, scrollWheelZoom: true, minZoom: 7, maxZoom: 18 });
    mapSection = panel.closest(`[data-view="${ACCESS_SLUG}"]`);

    const osm = L.tileLayer(OSM_TILES, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
    }).addTo(mapInstance);
    const topo = L.tileLayer(TOPO_TILES, {
      subdomains: 'abc',
      maxZoom: 17,
      attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | map style: &copy; OpenTopoMap (CC-BY-SA)',
    });

    const overlays = {};
    Object.entries(OFFICIAL_LAYERS).forEach(([name, config]) => {
      const group = L.layerGroup();
      group._paOfficialLayer = name;
      overlays[config.label] = group;
    });

    const layersControl = L.control.layers({ 'Mapa padrão': osm, 'Relevo topográfico': topo }, overlays, { collapsed: true, position: 'topright' }).addTo(mapInstance);
    labelLayersControl(layersControl);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(mapInstance);

    mapInstance.on('overlayadd', (event) => {
      const name = event.layer?._paOfficialLayer;
      if (name && OFFICIAL_LAYERS[name]) populateOfficialLayer(name, event.layer, panel, L).catch(() => {});
    });

    addReferencePoints(mapInstance, panel, L);
    fitRegion(mapInstance, L);
    panel.querySelector('[data-map-locate]')?.addEventListener('click', () => locateUser(mapInstance, panel, L));
    panel.querySelector('[data-map-region]')?.addEventListener('click', () => {
      fitRegion(mapInstance, L);
      setStatus(panel, 'Visão regional restaurada. Use o botão Camadas no mapa para exibir relevo, vias, água ou limites.');
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
