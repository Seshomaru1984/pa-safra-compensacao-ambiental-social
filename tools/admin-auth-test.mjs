import crypto from 'node:crypto';
import { onRequestPost as login } from '../functions/api/admin/login.js';

const ORIGIN = 'https://preview.example.test';
const TEST_USER = 'admin';
const TEST_PASSWORD = 'Correct-Horse-Battery-Staple-123!';
const ITERATIONS = 100_000;

class MemoryKV {
  constructor() {
    this.values = new Map();
  }

  async get(key) {
    return this.values.get(key) ?? null;
  }

  async put(key, value) {
    this.values.set(key, value);
  }

  async delete(key) {
    this.values.delete(key);
  }
}

function base64Url(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

function passwordHash(password) {
  const salt = Buffer.alloc(16, 7);
  const derived = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
  return `pbkdf2-sha256$${ITERATIONS}$${base64Url(salt)}$${base64Url(derived)}`;
}

function environment(overrides = {}) {
  return {
    PA_SAFRA_ADMIN_ENABLED: 'true',
    PA_SAFRA_ADMIN_USER: TEST_USER,
    PA_SAFRA_ADMIN_PASSWORD_HASH: passwordHash(TEST_PASSWORD),
    PA_SAFRA_SESSION_SECRET: '0123456789abcdefghijklmnopqrstuvwxyz-SESSION-SECRET',
    PA_SAFRA_AUTH_KV: new MemoryKV(),
    ...overrides,
  };
}

function request({ username = TEST_USER, password = TEST_PASSWORD, ip = '203.0.113.10' } = {}) {
  return new Request(`${ORIGIN}/api/admin/login`, {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      'content-type': 'application/json',
      'CF-Connecting-IP': ip,
    },
    body: JSON.stringify({ username, password }),
  });
}

async function attempt(env, options) {
  return login({ request: request(options), env });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const env = environment();

  for (let attemptNumber = 1; attemptNumber <= 4; attemptNumber += 1) {
    const response = await attempt(env, { password: 'senha-incorreta', ip: '203.0.113.10' });
    assert(response.status === 401, `Falha ${attemptNumber}: esperado 401, recebido ${response.status}.`);
  }

  const fifth = await attempt(env, { password: 'senha-incorreta', ip: '203.0.113.10' });
  assert(fifth.status === 429, `Quinta falha: esperado 429, recebido ${fifth.status}.`);
  assert(Number(fifth.headers.get('retry-after')) > 0, 'Quinta falha: cabeçalho Retry-After ausente/inválido.');

  const blockedEvenWithCorrectPassword = await attempt(env, { password: TEST_PASSWORD, ip: '203.0.113.10' });
  assert(blockedEvenWithCorrectPassword.status === 429, 'Cliente bloqueado conseguiu prosseguir antes do fim do lockout.');

  const otherClient = await attempt(env, { password: TEST_PASSWORD, ip: '203.0.113.11' });
  assert(otherClient.status === 200, `Cliente distinto com senha correta deveria autenticar; recebeu ${otherClient.status}.`);
  const cookie = otherClient.headers.get('set-cookie') || '';
  for (const token of ['pa_safra_admin_session=', 'HttpOnly', 'Secure', 'SameSite=Strict']) {
    assert(cookie.includes(token), `Cookie de sessão sem requisito obrigatório: ${token}`);
  }

  const withoutKv = await attempt(environment({ PA_SAFRA_AUTH_KV: undefined }), { ip: '203.0.113.12' });
  assert(withoutKv.status === 503, `Sem KV o login deve falhar fechado com 503; recebeu ${withoutKv.status}.`);

  const disabled = await attempt(environment({ PA_SAFRA_ADMIN_ENABLED: 'false' }), { ip: '203.0.113.13' });
  assert(disabled.status === 503, `Admin desativado deve responder 503; recebeu ${disabled.status}.`);

  console.log('ADMIN AUTH TEST: OK');
  console.log('- 4 falhas iniciais: 401');
  console.log('- 5ª falha: 429 + Retry-After');
  console.log('- bloqueio permanece mesmo com senha correta no mesmo cliente');
  console.log('- outro cliente com credencial correta autentica');
  console.log('- cookie de sessão: HttpOnly + Secure + SameSite=Strict');
  console.log('- ausência do KV: fail-closed 503');
  console.log('- administração desativada: 503');
}

main().catch((error) => {
  console.error(`ADMIN AUTH TEST: FALHOU - ${error.message}`);
  process.exit(1);
});
