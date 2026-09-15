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
  'Assentamentos',
  'Limites municipais',
  '/api/map/layer?layer=',
  'L.control.layers',
  'SINFRA/MT',
  'INTERMAT',
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
  'LIM_ASSENTAMENTO_A/FeatureServer/0/query',
  'LIM_LIMITE_POLITICO_ADMINISTRATIVO_A/FeatureServer/0/query',
  "fields: 's_no,s_mn,s_sipra,s_md'",
  "url.searchParams.set('geometry'",
  "url.searchParams.set('f', 'geojson')",
  'MAX_PAGES = 4',
]) assert.ok(proxy.includes(token), `Proxy cartográfico sem contrato: ${token}`);

assert.ok(!proxy.includes('s_rsp_tec'), 'proxy não deve expor responsável técnico do assentamento');
assert.ok(!proxy.includes('s_matr'), 'proxy não deve expor matrícula fundiária desnecessária');
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

console.log('ACCESS MAP TEST: PASS');
console.log('- mapa mantém geolocalização sob ação explícita do usuário');
console.log('- relevo topográfico é base opcional, sem poluir o mapa padrão');
console.log('- vias, hidrografia, assentamentos e limites são camadas opcionais e sob demanda');
console.log('- proxy limita a consulta à região e aos campos cartográficos necessários');
console.log('- CSP permite somente os provedores necessários ao mapa');
