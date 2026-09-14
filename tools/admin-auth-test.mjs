import crypto from 'node:crypto';
import { onRequestPost as login } from '../functions/api/admin/login.js';

const ORIGIN = 'https://preview.example.test';
const TEST_USER = 'admin';
const TEST_PASSWORD = 'Correct-Horse-Battery-Staple-123!';
const ITERATIONS = 100_000;
const RATE_WINDOW_SECONDS = 15 * 60;
const RATE_LOCK_SECONDS = 15 * 60;
const RATE_MAX_FAILURES = 5;

class MemoryD1Statement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.params = [];
  }

  bind(...params) {
    this.params = params;
    return this;
  }

  async first() {
    if (!this.sql.includes('SELECT count, window_started_at, blocked_until')) {
      throw new Error('Statement first() inesperado no mock D1.');
    }
    const row = this.db.rows.get(this.params[0]);
    return row ? { ...row } : null;
  }

  async run() {
    if (this.sql.includes('DELETE FROM admin_login_rate')) {
      this.db.rows.delete(this.params[0]);
      return { success: true, results: [] };
    }
    throw new Error('Statement run() inesperado no mock D1.');
  }
}

class MemoryD1 {
  constructor() {
    this.rows = new Map();
  }

  prepare(sql) {
    return new MemoryD1Statement(this, sql);
  }

  async batch(statements) {
    const results = [];
    for (const statement of statements) {
      if (statement.sql.includes('INSERT INTO admin_login_rate')) {
        const key = statement.params[0];
        const now = Number(statement.params[1]);
        const previous = this.rows.get(key) || {
          count: 0,
          window_started_at: 0,
          blocked_until: 0,
          updated_at: 0,
        };

        let next;
        if (previous.blocked_until > now) {
          next = { ...previous, updated_at: now };
        } else {
          const withinWindow = previous.window_started_at > 0
            && now - previous.window_started_at < RATE_WINDOW_SECONDS;
          const count = (withinWindow ? previous.count : 0) + 1;
          const windowStartedAt = withinWindow ? previous.window_started_at : now;
          next = {
            count,
            window_started_at: windowStartedAt,
            blocked_until: count >= RATE_MAX_FAILURES ? now + RATE_LOCK_SECONDS : 0,
            updated_at: now,
          };
        }
        this.rows.set(key, next);
        results.push({ success: true, results: [] });
        continue;
      }

      if (statement.sql.includes('SELECT count, window_started_at, blocked_until')) {
        const row = this.rows.get(statement.params[0]);
        results.push({ success: true, results: row ? [{ ...row }] : [] });
        continue;
      }

      throw new Error('Statement inesperado no batch do mock D1.');
    }
    return results;
  }
}

function base64Url(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

function passwordHash(password, iterations = ITERATIONS) {
  const salt = Buffer.alloc(16, 7);
  const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  return `pbkdf2-sha256$${iterations}$${base64Url(salt)}$${base64Url(derived)}`;
}

function environment(overrides = {}) {
  return {
    PA_SAFRA_ADMIN_ENABLED: 'true',
    PA_SAFRA_ADMIN_USER: TEST_USER,
    PA_SAFRA_ADMIN_PASSWORD_HASH: passwordHash(TEST_PASSWORD),
    PA_SAFRA_SESSION_SECRET: '0123456789abcdefghijklmnopqrstuvwxyz-SESSION-SECRET',
    PA_SAFRA_AUTH_DB: new MemoryD1(),
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

  const withoutDb = await attempt(environment({ PA_SAFRA_AUTH_DB: undefined }), { ip: '203.0.113.12' });
  assert(withoutDb.status === 503, `Sem D1 o login deve falhar fechado com 503; recebeu ${withoutDb.status}.`);

  const disabled = await attempt(environment({ PA_SAFRA_ADMIN_ENABLED: 'false' }), { ip: '203.0.113.13' });
  assert(disabled.status === 503, `Admin desativado deve responder 503; recebeu ${disabled.status}.`);

  const incompatibleHash = passwordHash(TEST_PASSWORD, 310_000);
  const incompatible = await attempt(
    environment({ PA_SAFRA_ADMIN_PASSWORD_HASH: incompatibleHash }),
    { ip: '203.0.113.14' },
  );
  assert(incompatible.status === 503, `Hash PBKDF2 acima do limite suportado deve falhar fechado com 503; recebeu ${incompatible.status}.`);
  assert((incompatible.headers.get('content-type') || '').includes('application/json'), 'Falha de hash incompatível deve permanecer resposta JSON controlada.');

  console.log('ADMIN AUTH TEST: OK');
  console.log('- PBKDF2-SHA256 fixado em 100000 iterações para compatibilidade com Workers');
  console.log('- 4 falhas iniciais: 401');
  console.log('- 5ª falha: 429 + Retry-After');
  console.log('- bloqueio permanece mesmo com senha correta no mesmo cliente');
  console.log('- outro cliente com credencial correta autentica');
  console.log('- cookie de sessão: HttpOnly + Secure + SameSite=Strict');
  console.log('- ausência do D1: fail-closed 503');
  console.log('- administração desativada: 503');
  console.log('- hash PBKDF2 incompatível (>100000): fail-closed 503, sem Worker exception');
}

main().catch((error) => {
  console.error(`ADMIN AUTH TEST: FALHOU - ${error.message}`);
  process.exit(1);
});
