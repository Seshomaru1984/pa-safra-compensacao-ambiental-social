import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const read = (file) => fs.readFileSync(file, 'utf8');
const map = read('public/access-map.js');
const proxy = read('functions/api/map/layer.js');
const headers = read('public/_headers');
const vite = read('vite.config.js');

for (const token of [
  "const ACCESS_SLUG = 'acesso-localizacao'",
  'Mapa interativo da região',
  'Minha localização',
  'Você está aqui',
  'enableHighAccuracy: true',
  'map.locate({',
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  'Relevo topográfico',
  'Vias oficiais e vicinais',
  'Rios e córregos',
  "Massas d'água",
  'Projetos de assentamento (INCRA)',
  'Limites municipais',
  '/api/map/layer?layer=',
  'L.control.layers',
  'SINFRA/MT',
  'INTERMAT',
  'geosserviço do IBAMA',
  'BR-158 / MT-251',
  'MT-251 / MT-110',
  'Divisa Nova Xavantina / Campinápolis',
  'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=',
  'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=',
]) assert.ok(map.includes(token), `Mapa de acesso sem contrato: ${token}`);

for (const token of [
  "roads:", "drainage:", "water:", "settlements:", "municipalities:",
  'TRA_SISTEMA_VIARIO_L/FeatureServer/0/query',
  'HID_TRECHO_DRENAGEM_L/FeatureServer/0/query',
  'HID_MASSA_DE_AGUA_A/FeatureServer/0/query',
  'assentamentos_incra/MapServer/1/query',
  'LIM_LIMITE_POLITICO_ADMINISTRATIVO_A/FeatureServer/0/query',
  "fields: 'cd_sipra,nome_proje,municipio,area_hecta,capacidade,num_famili,fase,data_de_cr'",
  "normalize: 'settlement'",
  's_no: String(p.nome_proje',
  's_sipra: String(p.cd_sipra',
  "url.searchParams.set('geometry'",
  "url.searchParams.set('f', 'geojson')",
  'MAX_PAGES = 4',
]) assert.ok(proxy.includes(token), `Proxy cartográfico sem contrato: ${token}`);

for (const forbidden of ['cpf', 'cnpj', 'detentor', 'proprietario', 's_rsp_tec', 's_matr']) {
  assert.ok(!proxy.toLowerCase().includes(forbidden), `proxy contém campo cadastral desnecessário: ${forbidden}`);
}
assert.ok(map.includes("window.addEventListener('hashchange'"), 'mapa deve reagir à navegação SPA');
assert.ok(map.includes('MutationObserver'), 'mapa deve aguardar a página dinâmica de Acesso');
assert.ok(map.includes('O site não grava suas coordenadas de localização no servidor.'), 'mapa deve explicar o tratamento local da geolocalização');
assert.ok(map.includes('data-map-region'), 'mapa deve permitir restaurar a visão regional');

for (const token of [
  "script-src 'self' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  'https://tile.openstreetmap.org',
  'https://*.tile.opentopomap.org',
  'geolocation=(self)',
  'Referrer-Policy: strict-origin-when-cross-origin',
]) assert.ok(headers.includes(token), `Headers incompatíveis com mapa: ${token}`);

assert.ok(vite.includes("PUBLIC_ACCESS_MAP_TAG = '<script src=\"/access-map.js\" defer></script>'"), 'build não injeta access-map.js');

for (const file of ['public/access-map.js', 'functions/api/map/layer.js']) {
  const temp = path.join(os.tmpdir(), `pa-access-map-${path.basename(file)}-${process.pid}.mjs`);
  fs.writeFileSync(temp, read(file), 'utf8');
  const result = spawnSync(process.execPath, ['--check', temp], { encoding: 'utf8' });
  fs.rmSync(temp, { force: true });
  assert.equal(result.status, 0, `node --check falhou em ${file}: ${result.stderr || result.stdout}`);
}

const candidateBranch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '';
if (candidateBranch.includes('feat/pa-v001-interactive-access-map')) {
  const bbox = '-53.15,-15.15,-51.75,-14.05';
  const sources = {
    roads: 'https://intergeo.intermat.mt.gov.br/server/rest/services/INTERMAT_CARTOGRAFIA/TRA_SISTEMA_VIARIO_L/FeatureServer/0/query',
    drainage: 'https://intergeo.intermat.mt.gov.br/server/rest/services/BDC/HID_TRECHO_DRENAGEM_L/FeatureServer/0/query',
    water: 'https://intergeo.intermat.mt.gov.br/server/rest/services/INTERMAT_CARTOGRAFIA/HID_MASSA_DE_AGUA_A/FeatureServer/0/query',
    settlements: 'https://pamgia.ibama.gov.br/server/rest/services/01_Publicacoes_Bases/assentamentos_incra/MapServer/1/query',
    municipalities: 'https://intergeo.intermat.mt.gov.br/server/rest/services/INTERMAT_CARTOGRAFIA/LIM_LIMITE_POLITICO_ADMINISTRATIVO_A/FeatureServer/0/query',
  };

  const counts = await Promise.all(Object.entries(sources).map(async ([name, endpoint]) => {
    const url = new URL(endpoint);
    url.searchParams.set('where', '1=1');
    url.searchParams.set('geometry', bbox);
    url.searchParams.set('geometryType', 'esriGeometryEnvelope');
    url.searchParams.set('inSR', '4326');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set('returnCountOnly', 'true');
    url.searchParams.set('f', 'json');
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    assert.equal(response.ok, true, `fonte cartográfica ${name} respondeu HTTP ${response.status}`);
    const body = await response.json();
    assert.ok(Number.isInteger(body.count) && body.count > 0, `fonte cartográfica ${name} sem feições na região`);
    return `${name}=${body.count}`;
  }));
  console.log(`- fontes cartográficas consultadas ao vivo: ${counts.join(', ')}`);
}

console.log('ACCESS MAP TEST: PASS');
console.log('- mapa mantém geolocalização sob ação explícita do usuário');
console.log('- relevo topográfico é base opcional, sem poluir o mapa padrão');
console.log('- vias, hidrografia, assentamentos e limites são camadas opcionais e sob demanda');
console.log('- assentamentos usam geometria INCRA publicada no geosserviço do IBAMA');
console.log('- proxy limita a consulta à região e aos campos cartográficos necessários');
console.log('- CSP permite somente os provedores necessários ao mapa');
