import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();

const assets = [
  {
    name: 'rio-cristalino',
    parts: [
      'assets-source/requester/rio/part01.b64',
      'assets-source/requester/rio/part02.b64',
      'assets-source/requester/rio/part03.b64',
      'assets-source/requester/rio/part04.b64',
    ],
    output: 'public/assets/img/solicitante-rio-cristalino.webp',
  },
  {
    name: 'cerrado',
    parts: [
      'assets-source/requester/cerrado/part01.b64',
      'assets-source/requester/cerrado/part02.b64',
      'assets-source/requester/cerrado/part03.b64',
    ],
    output: 'public/assets/img/solicitante-cerrado.webp',
  },
];

function fail(message) {
  console.error(`IMAGENS SOLICITANTE: FALHOU - ${message}`);
  process.exit(1);
}

function webpDimensions(buffer) {
  const fourCC = buffer.toString('ascii', 12, 16);
  if (fourCC === 'VP8X' && buffer.length >= 30) {
    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);
    return { width, height, codec: fourCC };
  }

  if (fourCC === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
    const b1 = buffer[21];
    const b2 = buffer[22];
    const b3 = buffer[23];
    const b4 = buffer[24];
    const width = 1 + (((b2 & 0x3f) << 8) | b1);
    const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
    return { width, height, codec: fourCC };
  }

  if (
    fourCC === 'VP8 ' &&
    buffer.length >= 30 &&
    buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a
  ) {
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return { width, height, codec: fourCC.trim() };
  }

  return null;
}

function validateWebP(buffer, name) {
  if (buffer.length < 30) fail(`${name}: arquivo muito pequeno (${buffer.length} bytes).`);
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') fail(`${name}: assinatura RIFF ausente.`);
  if (buffer.toString('ascii', 8, 12) !== 'WEBP') fail(`${name}: assinatura WEBP ausente.`);

  const declaredLength = buffer.readUInt32LE(4) + 8;
  if (declaredLength !== buffer.length) {
    fail(`${name}: tamanho RIFF inconsistente; declarado=${declaredLength}, real=${buffer.length}.`);
  }

  const dimensions = webpDimensions(buffer);
  if (!dimensions || dimensions.width < 300 || dimensions.height < 200) {
    fail(`${name}: dimensoes WEBP invalidas ou insuficientes.`);
  }

  return dimensions;
}

for (const asset of assets) {
  const encodedParts = asset.parts.map((rel) => {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) fail(`${asset.name}: fonte ausente: ${rel}`);
    return fs.readFileSync(full, 'utf8').replace(/\s+/g, '');
  });

  const encoded = encodedParts.join('');
  if (!encoded || encoded.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(encoded)) {
    fail(`${asset.name}: Base64 de origem invalido.`);
  }

  const buffer = Buffer.from(encoded, 'base64');
  if (buffer.toString('base64') !== encoded) {
    fail(`${asset.name}: Base64 nao reproduz integralmente os bytes esperados.`);
  }

  const dimensions = validateWebP(buffer, asset.name);
  const output = path.join(root, asset.output);
  fs.mkdirSync(path.dirname(output), { recursive: true });

  const current = fs.existsSync(output) ? fs.readFileSync(output) : null;
  if (!current || !current.equals(buffer)) fs.writeFileSync(output, buffer);

  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  console.log(`IMAGEM OK: ${asset.output} | ${dimensions.width}x${dimensions.height} | ${buffer.length} bytes | sha256=${sha256}`);
}

console.log('IMAGENS SOLICITANTE: OK');
