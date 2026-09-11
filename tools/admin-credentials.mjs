import crypto from 'node:crypto';

const ITERATIONS = 310_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

function base64Url(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

async function hiddenPrompt(label) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Execute este utilitário em um terminal interativo.');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    const stdin = process.stdin;
    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
    };
    const onData = (chunk) => {
      const text = chunk.toString('utf8');
      for (const char of text) {
        if (char === '\u0003') {
          cleanup();
          process.stdout.write('\n');
          reject(new Error('Operação cancelada.'));
          return;
        }
        if (char === '\r' || char === '\n') {
          cleanup();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u007f' || char === '\b') {
          if (value.length) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        if (char >= ' ') {
          value += char;
          process.stdout.write('•');
        }
      }
    };

    process.stdout.write(label);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', onData);
  });
}

async function main() {
  console.log('PA Safra — geração local de credenciais administrativas');
  console.log('A senha não será exibida nem enviada pela rede.');

  const password = await hiddenPrompt('Senha: ');
  const confirmation = await hiddenPrompt('Confirme a senha: ');
  if (password !== confirmation) throw new Error('As senhas informadas não coincidem.');
  if (password.length < 12) throw new Error('Use uma senha com pelo menos 12 caracteres.');
  if (password.length > 256) throw new Error('Senha longa demais.');

  const salt = crypto.randomBytes(SALT_LENGTH);
  const derived = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
  const passwordHash = `pbkdf2-sha256$${ITERATIONS}$${base64Url(salt)}$${base64Url(derived)}`;
  const sessionSecret = base64Url(crypto.randomBytes(32));

  console.log('\nCopie os valores abaixo diretamente para os secrets/variáveis do Cloudflare.');
  console.log('Não salve a senha em arquivo de texto.');
  console.log(`PA_SAFRA_ADMIN_PASSWORD_HASH=${passwordHash}`);
  console.log(`PA_SAFRA_SESSION_SECRET=${sessionSecret}`);
}

main().catch((error) => {
  console.error(`ERRO: ${error.message}`);
  process.exitCode = 1;
});
