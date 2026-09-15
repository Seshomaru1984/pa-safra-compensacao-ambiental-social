const BBOX = Object.freeze({ xmin: -53.15, ymin: -15.15, xmax: -51.75, ymax: -14.05 });
const PAGE_SIZE = 500;
const MAX_PAGES = 4;

const LAYERS = Object.freeze({
  roads: {
    source: 'INTERMAT',
    endpoint: 'https://intergeo.intermat.mt.gov.br/server/rest/services/INTERMAT_CARTOGRAFIA/TRA_SISTEMA_VIARIO_L/FeatureServer/0/query',
    fields: 'sv_no,sv_den,sv_juriscl,sv_tipo',
  },
  drainage: {
    source: 'INTERMAT',
    endpoint: 'https://intergeo.intermat.mt.gov.br/server/rest/services/BDC/HID_TRECHO_DRENAGEM_L/FeatureServer/0/query',
    fields: 'td_no,td_juris,td_rm,td_tipo,td_eixo',
  },
  water: {
    source: 'INTERMAT',
    endpoint: 'https://intergeo.intermat.mt.gov.br/server/rest/services/INTERMAT_CARTOGRAFIA/HID_MASSA_DE_AGUA_A/FeatureServer/0/query',
    fields: 'ma_no,ma_juris,ma_rm,ma_tipo',
  },
  settlements: {
    source: 'INCRA/IBAMA',
    endpoint: 'https://pamgia.ibama.gov.br/server/rest/services/01_Publicacoes_Bases/assentamentos_incra/MapServer/1/query',
    fields: 'cd_sipra,nome_proje,municipio,area_hecta,capacidade,num_famili,fase,data_de_cr',
    normalize: 'settlement',
  },
  municipalities: {
    source: 'INTERMAT',
    endpoint: 'https://intergeo.intermat.mt.gov.br/server/rest/services/INTERMAT_CARTOGRAFIA/LIM_LIMITE_POLITICO_ADMINISTRATIVO_A/FeatureServer/0/query',
    fields: 'mn_no,mn_cod',
  },
});

const json = (data, status = 200, cache = false) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/geo+json; charset=utf-8',
    'cache-control': cache
      ? 'public, max-age=21600, stale-while-revalidate=86400'
      : 'no-store, max-age=0',
    'x-content-type-options': 'nosniff',
  },
});

function buildQuery(config, offset) {
  const url = new URL(config.endpoint);
  url.searchParams.set('where', '1=1');
  url.searchParams.set('geometry', `${BBOX.xmin},${BBOX.ymin},${BBOX.xmax},${BBOX.ymax}`);
  url.searchParams.set('geometryType', 'esriGeometryEnvelope');
  url.searchParams.set('inSR', '4326');
  url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
  url.searchParams.set('outFields', config.fields);
  url.searchParams.set('returnGeometry', 'true');
  url.searchParams.set('returnZ', 'false');
  url.searchParams.set('returnM', 'false');
  url.searchParams.set('outSR', '4326');
  url.searchParams.set('resultOffset', String(offset));
  url.searchParams.set('resultRecordCount', String(PAGE_SIZE));
  url.searchParams.set('f', 'geojson');
  return url;
}

function normalizeFeature(feature, config) {
  if (config.normalize !== 'settlement') return feature;
  const p = feature?.properties || {};
  const details = [];
  if (p.area_hecta) details.push(`${p.area_hecta} ha`);
  if (Number.isFinite(p.capacidade)) details.push(`capacidade: ${p.capacidade}`);
  if (Number.isFinite(p.num_famili)) details.push(`famílias: ${p.num_famili}`);
  return {
    type: 'Feature',
    geometry: feature.geometry,
    properties: {
      s_no: String(p.nome_proje || '').trim(),
      s_mn: String(p.municipio || '').trim(),
      s_sipra: String(p.cd_sipra || '').trim(),
      s_md: details.join(' · '),
    },
  };
}

async function fetchLayer(config) {
  const features = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await fetch(buildQuery(config, page * PAGE_SIZE), {
      headers: { accept: 'application/geo+json, application/json;q=0.9' },
    });

    if (!response.ok) throw new Error(`${config.source} respondeu HTTP ${response.status}`);
    const data = await response.json();
    if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      throw new Error(`Resposta cartográfica inválida de ${config.source}`);
    }

    features.push(...data.features.map((feature) => normalizeFeature(feature, config)));
    if (data.features.length < PAGE_SIZE) break;
  }

  return { type: 'FeatureCollection', features };
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const layerName = String(url.searchParams.get('layer') || '').trim().toLowerCase();
  const config = LAYERS[layerName];
  if (!config) return json({ error: 'Camada não autorizada.' }, 400);

  try {
    const data = await fetchLayer(config);
    return json(data, 200, true);
  } catch (error) {
    console.warn('[PA Safra] Falha ao consultar camada cartográfica:', layerName, error);
    return json({
      type: 'FeatureCollection',
      features: [],
      error: 'Fonte cartográfica temporariamente indisponível.',
    }, 502);
  }
}
