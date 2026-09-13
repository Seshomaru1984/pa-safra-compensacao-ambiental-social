import { onRequest as guard } from '../functions/api/admin/_middleware.js';

const ORIGIN = 'https://preview.example.test';
const ALLOWED_BRANCH = 'content/pa-v001-admin-preview';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run({ method = 'PUT', path = '/api/admin/content', branch, nextStatus = 204 } = {}) {
  let nextCalled = false;
  const response = await guard({
    request: new Request(`${ORIGIN}${path}`, { method }),
    env: branch === undefined ? {} : { PA_SAFRA_CONTENT_BRANCH: branch },
    next: async () => {
      nextCalled = true;
      return new Response(null, { status: nextStatus });
    },
  });
  return { response, nextCalled };
}

async function main() {
  const missing = await run({ branch: undefined });
  assert(missing.response.status === 503, `Branch ausente: esperado 503, recebido ${missing.response.status}.`);
  assert(!missing.nextCalled, 'Branch ausente não pode alcançar o handler de escrita.');

  const mainBranch = await run({ branch: 'main' });
  assert(mainBranch.response.status === 503, `Branch main: esperado 503, recebido ${mainBranch.response.status}.`);
  assert(!mainBranch.nextCalled, 'Branch main não pode alcançar o handler de escrita.');

  const developBranch = await run({ branch: 'develop' });
  assert(developBranch.response.status === 503, `Branch develop: esperado 503, recebido ${developBranch.response.status}.`);
  assert(!developBranch.nextCalled, 'Branch develop não pode alcançar o handler de escrita.');

  const allowed = await run({ branch: ALLOWED_BRANCH });
  assert(allowed.response.status === 204, `Branch editorial autorizada deveria seguir para o handler; recebeu ${allowed.response.status}.`);
  assert(allowed.nextCalled, 'Branch editorial autorizada não alcançou o handler.');

  const statusRead = await run({ method: 'GET', path: '/api/admin/status', branch: undefined, nextStatus: 200 });
  assert(statusRead.response.status === 200, 'Leituras administrativas não podem ser bloqueadas pelo guard editorial.');
  assert(statusRead.nextCalled, 'Guard editorial bloqueou leitura administrativa indevidamente.');

  console.log('ADMIN CONTENT GUARD TEST: OK');
  console.log('- escrita sem PA_SAFRA_CONTENT_BRANCH: 503 fail-closed');
  console.log('- escrita em main/develop: 503 fail-closed');
  console.log('- somente content/pa-v001-admin-preview alcança o handler de escrita');
  console.log('- rotas administrativas de leitura permanecem inalteradas');
}

main().catch((error) => {
  console.error(`ADMIN CONTENT GUARD TEST: FALHOU - ${error.message}`);
  process.exit(1);
});
