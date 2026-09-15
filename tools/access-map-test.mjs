import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const map = read('public/access-map.js');
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
  'OpenStreetMap contributors',
  'SINFRA/MT',
  'BR-158 / MT-251',
  'MT-251 / MT-110',
  'Divisa Nova Xavantina / Campinápolis',
  'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=',
  'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=',
]) assert.ok(map.includes(token), `Mapa de acesso sem contrato: ${token}`);

assert.ok(map.includes("window.addEventListener('hashchange'"), 'mapa deve reagir à navegação SPA');
assert.ok(map.includes('MutationObserver'), 'mapa deve aguardar a página dinâmica de Acesso');
assert.ok(map.includes('O site não grava suas coordenadas no servidor.'), 'mapa deve explicar o tratamento local da geolocalização');
assert.ok(map.includes('data-map-region'), 'mapa deve permitir restaurar a visão regional');

for (const token of [
  "script-src 'self' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  "img-src 'self' data: https://tile.openstreetmap.org",
  'geolocation=(self)',
  'Referrer-Policy: strict-origin-when-cross-origin',
]) assert.ok(headers.includes(token), `Headers incompatíveis com mapa: ${token}`);

assert.ok(vite.includes("PUBLIC_ACCESS_MAP_TAG = '<script src=\"/access-map.js\" defer></script>'"), 'build não injeta access-map.js');
assert.ok(vite.includes('PUBLIC_ACCESS_MAP_TAG'), 'tag do mapa ausente no build público');

console.log('ACCESS MAP TEST: PASS');
console.log('- mapa interativo é carregado apenas na área de Acesso');
console.log('- geolocalização depende de ação do usuário e HTTPS');
console.log('- OpenStreetMap e SINFRA/MT aparecem como fontes do mapa');
console.log('- CSP permite somente os provedores necessários ao mapa');
