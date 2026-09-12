const preview = 'https://ops-pa-v001-a19-preview-auth.pa-safra-compensacao-ambiental-social.pages.dev';

async function request(path, init = {}) {
  const response = await fetch(`${preview}${path}`, {
    redirect: 'manual',
    ...init,
  });
  const text = await response.text();
  return {
    status: response.status,
    headers: {
      'cf-ray': response.headers.get('cf-ray'),
      'retry-after': response.headers.get('retry-after'),
      'content-type': response.headers.get('content-type'),
    },
    text: text.slice(0, 1200),
  };
}

function print(label, result) {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(result, null, 2));
}

const status = await request('/api/admin/status', {
  method: 'GET',
  headers: { 'cache-control': 'no-cache' },
});
print('STATUS', status);

let parsedStatus = null;
try {
  parsedStatus = JSON.parse(status.text);
} catch {
  // A resposta crua já foi registrada acima.
}

const environmentReady = Boolean(
  status.status === 200
  && parsedStatus?.enabled === true
  && parsedStatus?.credentials_configured === true
  && parsedStatus?.rate_limit_configured === true
  && parsedStatus?.rate_limit_backend === 'd1'
  && parsedStatus?.token_configured === false
  && parsedStatus?.write_enabled === false
);

if (!environmentReady) {
  console.log('\nDIAGNOSTICO: AMBIENTE_PREVIEW_NAO_EQUIVALENTE_A_A19_VALIDADA');
  process.exit(2);
}

const malformed = await request('/api/admin/login', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    origin: preview,
  },
  body: '{',
});
print('LOGIN_MALFORMADO_SEM_PBKDF2', malformed);

if (malformed.status === 429) {
  console.log('\nDIAGNOSTICO: RATE_LIMIT_JA_ATIVO_PARA_O_RUNNER; NAO EXECUTAR SEGUNDA FALHA');
  process.exit(0);
}

const wrongPassword = `PA-SAFRA-DIAGNOSTICO-${crypto.randomUUID()}-senha-incorreta`;
const wrong = await request('/api/admin/login', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    origin: preview,
  },
  body: JSON.stringify({ username: 'admin', password: wrongPassword }),
});
print('LOGIN_SENHA_INCORRETA_COM_PBKDF2', wrong);

let classification = 'INCONCLUSIVO';

if (malformed.status === 401 && wrong.status === 500) {
  classification = 'D1_BASE_OK_E_FALHA_NO_CAMINHO_PBKDF2_OU_APOS_VERIFICACAO';
} else if (malformed.status === 401 && wrong.status === 401) {
  classification = 'PBKDF2_E_CAMINHO_DE_FALHA_FUNCIONAM; ERRO_500_DO_LOGIN_VALIDO_E_POSTERIOR_A_VERIFICACAO';
} else if ([500, 503].includes(malformed.status)) {
  classification = 'FALHA_ANTES_DO_PBKDF2_D1_OU_RUNTIME';
} else if (wrong.status === 429) {
  classification = 'RATE_LIMIT_ATINGIDO_DURANTE_DIAGNOSTICO';
}

console.log(`\nDIAGNOSTICO: ${classification}`);
console.log('EFEITO_CONTROLADO: no maximo duas falhas de login no D1, isoladas pelo IP do runner GitHub.');
console.log('NENHUMA_CREDENCIAL_REAL_UTILIZADA: true');
console.log('NENHUMA_ESCRITA_EDITORIAL: true');
