import fs from 'node:fs';

const preview = 'https://ops-pa-v001-a19-preview-auth.pa-safra-compensacao-ambiental-social.pages.dev';
const evidencePath = 'a19-runtime-diagnostic-result.json';

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
      'cache-control': response.headers.get('cache-control'),
    },
    text: text.slice(0, 1200),
  };
}

const evidence = {
  schema: 'PA_SAFRA_A19_RUNTIME_DIAGNOSTIC_V2',
  generated_at: new Date().toISOString(),
  preview,
  real_credential_used: false,
  editorial_write_performed: false,
  probes: {},
  classification: 'INCONCLUSIVO',
};

try {
  const status = await request('/api/admin/status', {
    method: 'GET',
    headers: { 'cache-control': 'no-cache' },
  });
  evidence.probes.status = status;

  let parsedStatus = null;
  try {
    parsedStatus = JSON.parse(status.text);
  } catch {
    // Resposta crua preservada na evidência.
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
  evidence.environment_ready = environmentReady;

  if (!environmentReady) {
    evidence.classification = 'AMBIENTE_PREVIEW_NAO_EQUIVALENTE_A_A19_VALIDADA';
    process.exitCode = 2;
  } else {
    const wrongPassword = `PA-SAFRA-DIAGNOSTICO-${crypto.randomUUID()}-senha-incorreta`;
    const wrong = await request('/api/admin/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: preview,
      },
      body: JSON.stringify({ username: 'admin', password: wrongPassword }),
    });
    evidence.probes.wrong_password = wrong;

    if (wrong.status === 401) {
      evidence.classification = 'PBKDF2_E_CAMINHO_DE_FALHA_FUNCIONAM_LOGIN_VALIDO_FALHA_DEPOIS_DA_VERIFICACAO';
    } else if (wrong.status === 500) {
      evidence.classification = 'FALHA_NAO_TRATADA_NO_CAMINHO_PBKDF2_OU_ANTES_DO_RETORNO_401';
    } else if (wrong.status === 503) {
      evidence.classification = 'FALHA_CONTROLADA_NO_D1_OU_PROTECAO_DE_ACESSO';
    } else if (wrong.status === 429) {
      evidence.classification = 'RATE_LIMIT_JA_ATIVO_PARA_O_RUNNER_DIAGNOSTICO_ADIADO';
    } else {
      evidence.classification = `STATUS_INESPERADO_SENHA_INCORRETA_${wrong.status}`;
    }
  }
} catch (error) {
  evidence.classification = 'ERRO_DO_EXECUTOR_DE_DIAGNOSTICO';
  evidence.executor_error = String(error?.stack || error);
  process.exitCode = 3;
} finally {
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(`DIAGNOSTICO: ${evidence.classification}`);
  console.log(`EVIDENCIA: ${evidencePath}`);
  console.log('NENHUMA_CREDENCIAL_REAL_UTILIZADA: true');
  console.log('NENHUMA_ESCRITA_EDITORIAL: true');
}
