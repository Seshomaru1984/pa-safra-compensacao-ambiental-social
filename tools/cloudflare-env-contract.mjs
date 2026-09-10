import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const prepublish = path.join(root, 'tools', 'prepublish.mjs');

function run(branch) {
  return spawnSync(process.execPath, [prepublish], {
    cwd: root,
    env: {
      ...process.env,
      CF_PAGES: '1',
      CF_PAGES_BRANCH: branch,
      GITHUB_HEAD_REF: '',
      GITHUB_REF_NAME: '',
    },
    encoding: 'utf8',
  });
}

const preview = run('feat/preview-cloudflare-contract');
if (preview.status !== 0) {
  console.error('CLOUDFLARE ENV CONTRACT: preview deveria permanecer em modo advisory.');
  console.error(preview.stdout);
  console.error(preview.stderr);
  process.exit(1);
}

const previewOutput = `${preview.stdout}\n${preview.stderr}`;
if (!previewOutput.includes('modo=ADVISORY')) {
  console.error('CLOUDFLARE ENV CONTRACT: modo advisory nao foi confirmado no preview.');
  process.exit(1);
}

const production = run('main');
if (production.status === 0) {
  console.error('CLOUDFLARE ENV CONTRACT: main deveria estar bloqueada enquanto houver pendencias.');
  process.exit(1);
}

const productionOutput = `${production.stdout}\n${production.stderr}`;
if (!productionOutput.includes('modo=BLOQUEANTE')) {
  console.error('CLOUDFLARE ENV CONTRACT: modo bloqueante nao foi confirmado em main.');
  process.exit(1);
}
if (!productionOutput.includes('publicacao em producao bloqueada enquanto houver pendencias editoriais')) {
  console.error('CLOUDFLARE ENV CONTRACT: mensagem esperada de bloqueio nao foi encontrada.');
  process.exit(1);
}

console.log('CLOUDFLARE ENV CONTRACT: OK');
console.log('- preview: ADVISORY');
console.log('- main pendente: BLOQUEANTE');
