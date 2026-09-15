const REPOSITORY = 'Seshomaru1984/pa-safra-compensacao-ambiental-social';
const RESOURCES = {
  site: 'public/content/site.json',
  videos: 'public/content/videos.json',
  pages: 'public/content/paginas.json',
  highlights: 'public/content/destaques.json',
  gallery: 'public/content/galeria.json',
  links: 'public/content/links.json',
};
const COOKIE_NAME = 'pa_safra_admin_session';
const MAX_BODY_BYTES = 180_000;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, max-age=0',
  },
});

function bytesFromBase64Url(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64UrlFromBytes(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function constantTimeEqual(left, right) {
  const a = left instanceof Uint8Array ? left : new TextEncoder().encode(String(left));
  const b = right instanceof Uint8Array ? right : new TextEncoder().encode(String(right));
  const size = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < size; i += 1) diff |= (a[i] || 0) ^ (b[i] || 0);
  return diff === 0;
}

function cookieValue(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return '';
}

async function verifySession(request, env) {
  const secret = String(env.PA_SAFRA_SESSION_SECRET || '');
  if (secret.length < 32) return null;
  const token = cookieValue(request, COOKIE_NAME);
  const [payloadEncoded, signatureEncoded, extra] = String(token || '').split('.');
  if (!payloadEncoded || !signatureEncoded || extra) return null;

  try {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadEncoded));
    const expected = base64UrlFromBytes(new Uint8Array(signature));
    if (!constantTimeEqual(expected, signatureEncoded)) return null;
    const payload = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(payloadEncoded)));
    const now = Math.floor(Date.now() / 1000);
    const configuredUser = String(env.PA_SAFRA_ADMIN_USER || '').trim().toLowerCase();
    if (!payload || payload.v !== 1 || payload.sub !== configuredUser || !Number.isInteger(payload.exp) || payload.exp <= now) return null;
    return { user: payload.sub, exp: payload.exp };
  } catch {
    return null;
  }
}

async function authorize(request, env) {
  if (String(env.PA_SAFRA_ADMIN_ENABLED || '').toLowerCase() !== 'true') {
    return { ok: false, status: 503, error: 'Administração ainda não habilitada.' };
  }
  const token = String(env.GITHUB_CONTENT_TOKEN || '').trim();
  if (!token) return { ok: false, status: 503, error: 'Credencial de publicação não configurada.' };
  const session = await verifySession(request, env);
  if (!session) return { ok: false, status: 401, error: 'Sessão administrativa inválida ou expirada.' };
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) return { ok: false, status: 403, error: 'Origem da requisição não autorizada.' };
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if (fetchSite && fetchSite !== 'same-origin') return { ok: false, status: 403, error: 'Contexto da requisição não autorizado.' };
  return { ok: true, token, user: session.user };
}

function ensurePlainObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} deve ser um objeto.`);
}

function ensureString(value, name, max = 5000, required = false) {
  if (value == null || value === '') {
    if (required) throw new Error(`${name} é obrigatório.`);
    return;
  }
  if (typeof value !== 'string') throw new Error(`${name} deve ser texto.`);
  if (value.length > max) throw new Error(`${name} excede o limite de ${max} caracteres.`);
}

function ensureBoolean(value, name) {
  if (typeof value !== 'boolean') throw new Error(`${name} deve ser verdadeiro ou falso.`);
}

function rejectUnknown(object, allowed, name) {
  for (const key of Object.keys(object)) if (!allowed.includes(key)) throw new Error(`Campo não permitido em ${name}: ${key}`);
}

function ensureHttpUrl(value, name, required = false) {
  if (!value) {
    if (required) throw new Error(`${name} é obrigatório.`);
    return;
  }
  ensureString(value, name, 800, required);
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
  } catch {
    throw new Error(`${name} deve usar http ou https.`);
  }
}

function ensureAssetPath(value, name) {
  if (!value) return;
  ensureString(value, name, 500);
  if (!/^\/assets\/[a-z0-9/_ .()\-]+$/i.test(value)) throw new Error(`${name} deve apontar para /assets/.`);
}

function ensureRichText(value, name, max = 15000) {
  ensureString(value, name, max);
  if (!value) return;
  const forbidden = [
    /<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|svg|math)\b/i,
    /\son[a-z]+\s*=/i,
    /javascript\s*:/i,
    /expression\s*\(/i,
    /url\s*\(/i,
    /style\s*=\s*["'][^"']*(position|display|z-index|background(?:-image)?|behavior|content)\s*:/i,
  ];
  if (forbidden.some((pattern) => pattern.test(value))) throw new Error(`${name} contém formatação não permitida.`);
}

function validateSite(site) {
  ensurePlainObject(site, 'site');
  rejectUnknown(site, ['page_title', 'description', 'brand_name', 'brand_tagline', 'hero', 'home', 'about', 'legacy', 'theme', 'footer'], 'site');
  ensureString(site.page_title, 'Título da aba', 180, true);
  ensureString(site.description, 'Descrição', 500, true);
  ensureString(site.brand_name, 'Nome curto', 80, true);
  ensureString(site.brand_tagline, 'Complemento do cabeçalho', 160);

  ensurePlainObject(site.hero, 'hero');
  rejectUnknown(site.hero, ['eyebrow', 'title', 'lead', 'title_alignment', 'title_size', 'image', 'image_alt'], 'hero');
  ensureString(site.hero.eyebrow, 'Identificação superior', 120);
  ensureString(site.hero.title, 'Título principal', 220, true);
  ensureRichText(site.hero.lead, 'Texto de apoio', 2500);
  ensureAssetPath(site.hero.image, 'Imagem principal');
  ensureString(site.hero.image_alt, 'Descrição acessível', 300);
  if (!['left', 'center', 'right'].includes(site.hero.title_alignment)) throw new Error('Alinhamento do título inválido.');
  if (!['standard', 'compact', 'small'].includes(site.hero.title_size)) throw new Error('Tamanho do título inválido.');

  for (const [key, label] of [['home', 'seção inicial'], ['about', 'sobre'], ['legacy', 'memória e legado'], ['theme', 'tema'], ['footer', 'rodapé']]) ensurePlainObject(site[key], label);

  rejectUnknown(site.home, ['intro_eyebrow', 'intro_title', 'intro_text'], 'home');
  ensureString(site.home.intro_eyebrow, 'Rótulo inicial', 120);
  ensureString(site.home.intro_title, 'Título da seção inicial', 220);
  ensureRichText(site.home.intro_text, 'Texto da seção inicial', 4000);

  rejectUnknown(site.about, ['title', 'summary', 'body'], 'about');
  ensureString(site.about.title, 'Título sobre', 180);
  ensureRichText(site.about.summary, 'Resumo sobre', 1800);
  ensureRichText(site.about.body, 'Texto completo sobre', 16000);

  rejectUnknown(site.legacy, [
    'eyebrow', 'title', 'body', 'closing_quote', 'image', 'image_alt', 'image_credit',
    'source_eyebrow', 'source_title', 'source_body', 'source_url', 'source_link_label', 'validation_note',
  ], 'legacy');
  ensureString(site.legacy.eyebrow, 'Rótulo do legado', 120);
  ensureString(site.legacy.title, 'Título do legado', 220);
  ensureRichText(site.legacy.body, 'Texto do legado', 18000);
  ensureRichText(site.legacy.closing_quote, 'Fechamento do legado', 2000);
  ensureAssetPath(site.legacy.image, 'Imagem do legado');
  ensureString(site.legacy.image_alt, 'Descrição da imagem do legado', 500);
  ensureString(site.legacy.image_credit, 'Crédito da imagem do legado', 1000);
  ensureString(site.legacy.source_eyebrow, 'Rótulo da fonte', 120);
  ensureString(site.legacy.source_title, 'Título da fonte', 220);
  ensureRichText(site.legacy.source_body, 'Texto da fonte', 5000);
  ensureHttpUrl(site.legacy.source_url, 'Link da fonte');
  ensureString(site.legacy.source_link_label, 'Texto do link da fonte', 180);
  ensureRichText(site.legacy.validation_note, 'Nota de validação', 5000);

  rejectUnknown(site.theme, ['primary', 'accent'], 'theme');
  for (const field of ['primary', 'accent']) {
    if (typeof site.theme[field] !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(site.theme[field])) throw new Error(`Cor inválida: ${field}.`);
  }

  rejectUnknown(site.footer, ['dedication', 'institutional_note'], 'footer');
  ensureRichText(site.footer.dedication, 'Homenagem', 2500);
  ensureRichText(site.footer.institutional_note, 'Nota institucional', 5000);
}

function validYoutube(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    return ['youtube.com', 'm.youtube.com', 'youtu.be'].includes(host);
  } catch {
    return false;
  }
}

function validateVideos(videos) {
  if (!Array.isArray(videos)) throw new Error('Palestras devem ser uma lista.');
  if (videos.length > 100) throw new Error('Limite de 100 palestras por arquivo.');
  videos.forEach((item, index) => {
    ensurePlainObject(item, `palestra ${index + 1}`);
    rejectUnknown(item, ['title', 'description', 'youtube_url', 'published'], `palestra ${index + 1}`);
    ensureString(item.title, `Título da palestra ${index + 1}`, 220, true);
    ensureRichText(item.description, `Descrição da palestra ${index + 1}`, 5000);
    ensureString(item.youtube_url, `Link da palestra ${index + 1}`, 500, true);
    if (!validYoutube(item.youtube_url)) throw new Error(`Link do YouTube inválido na palestra ${index + 1}.`);
    ensureBoolean(item.published, `Estado de publicação da palestra ${index + 1}`);
  });
}

function validateHighlights(items) {
  if (!Array.isArray(items)) throw new Error('Destaques devem ser uma lista.');
  if (items.length > 24) throw new Error('Limite de 24 destaques.');
  items.forEach((item, index) => {
    ensurePlainObject(item, `destaque ${index + 1}`);
    rejectUnknown(item, ['number', 'title', 'text', 'published'], `destaque ${index + 1}`);
    ensureString(item.number, `Número do destaque ${index + 1}`, 12);
    ensureString(item.title, `Título do destaque ${index + 1}`, 220, true);
    ensureRichText(item.text, `Texto do destaque ${index + 1}`, 5000);
    ensureBoolean(item.published, `Estado do destaque ${index + 1}`);
  });
}

function validateGallery(items) {
  if (!Array.isArray(items)) throw new Error('Galeria deve ser uma lista.');
  if (items.length > 120) throw new Error('Limite de 120 imagens.');
  items.forEach((item, index) => {
    ensurePlainObject(item, `imagem ${index + 1}`);
    rejectUnknown(item, ['image', 'image_alt', 'caption', 'credit', 'published'], `imagem ${index + 1}`);
    ensureAssetPath(item.image, `Arquivo da imagem ${index + 1}`);
    ensureString(item.image_alt, `Descrição acessível da imagem ${index + 1}`, 500);
    ensureString(item.caption, `Legenda da imagem ${index + 1}`, 1000);
    ensureString(item.credit, `Crédito da imagem ${index + 1}`, 1200);
    ensureBoolean(item.published, `Estado da imagem ${index + 1}`);
  });
}

function validatePages(items) {
  if (!Array.isArray(items)) throw new Error('Páginas extras devem ser uma lista.');
  if (items.length > 30) throw new Error('Limite de 30 páginas extras.');
  const reserved = new Set(['inicio', 'sobre', 'palestras', 'noticias', 'galeria', 'recursos', 'legado', 'admin']);
  const seen = new Set();
  items.forEach((item, index) => {
    ensurePlainObject(item, `página ${index + 1}`);
    rejectUnknown(item, ['slug', 'nav_label', 'eyebrow', 'title', 'summary', 'body', 'published'], `página ${index + 1}`);
    ensureString(item.slug, `Identificador da página ${index + 1}`, 80, true);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)) throw new Error(`Identificador inválido na página ${index + 1}.`);
    if (reserved.has(item.slug)) throw new Error(`Identificador reservado na página ${index + 1}.`);
    if (seen.has(item.slug)) throw new Error(`Identificador repetido: ${item.slug}.`);
    seen.add(item.slug);
    ensureString(item.nav_label, `Nome no menu da página ${index + 1}`, 80, true);
    ensureString(item.eyebrow, `Rótulo da página ${index + 1}`, 120);
    ensureString(item.title, `Título da página ${index + 1}`, 220, true);
    ensureRichText(item.summary, `Resumo da página ${index + 1}`, 3500);
    ensureRichText(item.body, `Conteúdo da página ${index + 1}`, 24000);
    ensureBoolean(item.published, `Estado da página ${index + 1}`);
  });
}

function validateLinks(data) {
  ensurePlainObject(data, 'links');
  rejectUnknown(data, ['intro', 'official', 'sources'], 'links');
  ensureString(data.intro, 'Texto de apresentação de Links úteis', 1000);
  if (!Array.isArray(data.official) || !Array.isArray(data.sources)) throw new Error('Links oficiais e fontes devem ser listas.');
  if (data.official.length > 30 || data.sources.length > 60) throw new Error('Quantidade de links acima do limite.');
  data.official.forEach((item, index) => {
    ensurePlainObject(item, `link oficial ${index + 1}`);
    rejectUnknown(item, ['acronym', 'title', 'description', 'url', 'published'], `link oficial ${index + 1}`);
    ensureString(item.acronym, `Sigla do link ${index + 1}`, 40);
    ensureString(item.title, `Título do link ${index + 1}`, 260, true);
    ensureRichText(item.description, `Descrição do link ${index + 1}`, 4000);
    ensureHttpUrl(item.url, `Endereço do link ${index + 1}`, true);
    ensureBoolean(item.published, `Estado do link ${index + 1}`);
  });
  data.sources.forEach((item, index) => {
    ensurePlainObject(item, `fonte ${index + 1}`);
    rejectUnknown(item, ['label', 'url', 'published'], `fonte ${index + 1}`);
    ensureString(item.label, `Nome da fonte ${index + 1}`, 260, true);
    ensureHttpUrl(item.url, `Endereço da fonte ${index + 1}`, true);
    ensureBoolean(item.published, `Estado da fonte ${index + 1}`);
  });
}

function validateResource(resource, data) {
  if (resource === 'site') return validateSite(data);
  if (resource === 'videos') return validateVideos(data);
  if (resource === 'pages') return validatePages(data);
  if (resource === 'highlights') return validateHighlights(data);
  if (resource === 'gallery') return validateGallery(data);
  if (resource === 'links') return validateLinks(data);
  throw new Error('Recurso editorial não permitido.');
}

function toBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

async function githubRequest(path, token, init = {}) {
  return fetch(`https://api.github.com/repos/${REPOSITORY}${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2026-03-10',
      'user-agent': 'pa-safra-native-admin/1.2',
      ...(init.headers || {}),
    },
  });
}

export async function onRequestPut({ request, env }) {
  const auth = await authorize(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY_BYTES) return json({ ok: false, error: 'Alteração grande demais.' }, 413);

  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) throw new Error('Alteração grande demais.');
    body = JSON.parse(raw);
  } catch (error) {
    return json({ ok: false, error: error.message || 'JSON inválido.' }, 400);
  }

  const resource = String(body?.resource || '');
  const filePath = RESOURCES[resource];
  if (!filePath) return json({ ok: false, error: 'Recurso editorial não permitido.' }, 400);

  try {
    validateResource(resource, body.data);
  } catch (error) {
    return json({ ok: false, error: error.message }, 422);
  }

  const branch = String(env.PA_SAFRA_CONTENT_BRANCH || 'main').trim() || 'main';
  const current = await githubRequest(`/contents/${filePath}?ref=${encodeURIComponent(branch)}`, auth.token);
  if (!current.ok) return json({ ok: false, error: `Não foi possível carregar a versão atual (${current.status}).` }, 502);
  const currentData = await current.json();
  if (!currentData?.sha) return json({ ok: false, error: 'SHA atual do conteúdo não encontrado.' }, 502);

  const formatted = `${JSON.stringify(body.data, null, 2)}\n`;
  const update = await githubRequest(`/contents/${filePath}`, auth.token, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message: `content(admin): atualizar ${resource}`,
      content: toBase64Utf8(formatted),
      sha: currentData.sha,
      branch,
    }),
  });

  const result = await update.json().catch(() => ({}));
  if (!update.ok) return json({ ok: false, error: result?.message || `Falha de publicação (${update.status}).` }, 502);

  return json({
    ok: true,
    resource,
    message: 'Alteração enviada para publicação.',
    commit: result?.commit?.sha || null,
    branch,
    user: auth.user,
  });
}
