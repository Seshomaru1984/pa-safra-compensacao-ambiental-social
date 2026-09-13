import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const required = [
  'public/content/publicacao.json',
  'public/content/site.json',
  'public/content/galeria.json',
  'index.html',
  'docs/evidencias/PA-V001-A21-R3-CONTENT-WRITE-PASS-20260913.md',
  'docs/evidencias/PA-V001-A22-ADMIN-UI-FLOW-PASS-20260913.md',
];

const errors = [];
for (const rel of required) {
  if (!exists(rel)) errors.push(`Arquivo obrigatório ausente: ${rel}`);
}

if (errors.length) {
  console.error('EDITORIAL BLOCKERS AUDIT: FALHOU');
  errors.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

const publication = JSON.parse(read('public/content/publicacao.json'));
const site = JSON.parse(read('public/content/site.json'));
const gallery = JSON.parse(read('public/content/galeria.json'));
const index = read('index.html');

const checks = publication.checks || {};
const blockers = new Map();
const add = (key, message) => {
  if (!blockers.has(key)) blockers.set(key, []);
  blockers.get(key).push(message);
};

const siteText = JSON.stringify(site);
const galleryText = JSON.stringify(gallery);
const combined = `${siteText}\n${galleryText}\n${index}`;

if (/redação jurídica definitiva[^.]*após validação/i.test(site.footer?.institutional_note || '')) {
  add('redacao_juridica_confirmada', 'A nota institucional declara explicitamente que a redação jurídica definitiva ainda depende de validação.');
}
if (/Termo de Ajustamento de Conduta \(TAC\) firmado entre o Espólio de Wolnei Divino Franco e o Ministério Público/i.test(site.about?.body || '')) {
  add('redacao_juridica_confirmada', 'O texto institucional contém caracterização jurídica específica do TAC; o instrumento/documento jurídico correspondente não está registrado como evidência de aprovação no repositório.');
}

for (const item of gallery) {
  if (/a confirmar/i.test(String(item?.credit || ''))) {
    add('creditos_imagens_confirmados', `Galeria ainda contém crédito/licença pendente para ${item?.image || 'imagem sem caminho'}.`);
  }
}
for (const marker of ['Crédito/licença a confirmar', 'Crédito editorial a confirmar']) {
  if (index.includes(marker)) add('creditos_imagens_confirmados', `A interface pública ainda contém o marcador “${marker}”.`);
}
if (index.includes('George Zarur') && !/licen[çc]a[^<]{0,120}(confirmad|autorizad|cedid)/i.test(index)) {
  add('creditos_imagens_confirmados', 'O registro histórico possui atribuição a George Zarur, mas não há declaração de licença/autorização confirmada no conteúdo público.');
}

const contactTokens = [
  /mailto:/i,
  /tel:/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
];
const hasContact = contactTokens.some((pattern) => pattern.test(combined));
if (!hasContact) add('dados_contato_confirmados', 'Não há e-mail, telefone ou outro canal de contato confirmado no conteúdo atual.');
if (/dados de contato serão publicados somente após validação/i.test(site.footer?.institutional_note || '')) {
  add('dados_contato_confirmados', 'A nota institucional declara explicitamente que os dados de contato ainda dependem de validação.');
}

const historicalMarkers = [
  'foi um dos primeiros advogados da região',
  'participou da fundação da cidade de Campinápolis',
  'foi o primeiro advogado a trabalhar na legalização das terras da viúva Estephânia Brawn',
  'Em 1990, em Perdizes/MG',
];
for (const marker of historicalMarkers) {
  if (index.includes(marker)) add('afirmacoes_historicas_confirmadas', `Afirmação biográfica/histórica específica ainda presente: “${marker}”.`);
}
if (/informações biográficas específicas[^<]*devem ser acompanhadas da documentação correspondente antes da publicação definitiva/i.test(index)) {
  add('afirmacoes_historicas_confirmadas', 'A própria página registra que as informações biográficas específicas ainda exigem documentação antes da publicação definitiva.');
}

const visualApprovalEvidence = 'docs/evidencias/PA-V001-REVISAO-VISUAL-APROVADA.md';
if (!exists(visualApprovalEvidence)) {
  add('revisao_visual_confirmada', `Não existe evidência de aprovação visual manual em ${visualApprovalEvidence}.`);
}

const adminEvidenceOk = exists('docs/evidencias/PA-V001-A21-R3-CONTENT-WRITE-PASS-20260913.md')
  && exists('docs/evidencias/PA-V001-A22-ADMIN-UI-FLOW-PASS-20260913.md');
if (checks.admin_nativo_validado === true && !adminEvidenceOk) {
  errors.push('admin_nativo_validado=true sem as evidências A21/A22 obrigatórias.');
}

for (const [key, items] of blockers.entries()) {
  if (checks[key] === true) {
    errors.push(`${key}=true apesar de bloqueios objetivos:\n  - ${items.join('\n  - ')}`);
  }
}

const pendingExpected = [
  'redacao_juridica_confirmada',
  'creditos_imagens_confirmados',
  'dados_contato_confirmados',
  'afirmacoes_historicas_confirmadas',
  'revisao_visual_confirmada',
];
for (const key of pendingExpected) {
  if (typeof checks[key] !== 'boolean') errors.push(`Gate editorial ausente ou não booleano: ${key}.`);
}

if (publication.status === 'aprovado' && Object.values(checks).some((value) => value !== true)) {
  errors.push('status=aprovado é inconsistente com validações ainda pendentes.');
}

if (errors.length) {
  console.error('EDITORIAL BLOCKERS AUDIT: FALHOU');
  errors.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log('EDITORIAL BLOCKERS AUDIT: OK');
console.log(`- admin_nativo_validado=${checks.admin_nativo_validado}`);
for (const key of pendingExpected) {
  const items = blockers.get(key) || [];
  console.log(`- ${key}=${checks[key]} | bloqueios observáveis=${items.length}`);
  items.forEach((item) => console.log(`  · ${item}`));
}
console.log('- nenhum gate editorial pendente foi promovido automaticamente.');
console.log('- produção permanece dependente da resolução e aprovação explícita dos cinco gates editoriais restantes.');
