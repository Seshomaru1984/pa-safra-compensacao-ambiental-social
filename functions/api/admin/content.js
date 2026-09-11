const REPOSITORY = 'Seshomaru1984/pa-safra-compensacao-ambiental-social';
const RESOURCES = {
  site: 'public/content/site.json',
  videos: 'public/content/videos.json',
};
const MAX_BODY_BYTES = 120_000;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, max-age=0',
  },
});

function allowedEmails(env) {
  return String(env.PA_SAFRA_ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function authorize(request, env) {
  if (String(env.PA_SAFRA_ADMIN_ENABLED || '').toLowerCase() !== 'true') {
    return { ok: false, status: 503, error: 'Administração ainda não habilitada.' };
  }

  const token = String(env.GITHUB_CONTENT_TOKEN || '').trim();
  if (!token) return { ok: false, status: 503, error: 'Credencial de publicação não configurada.' };

  const email = String(request.headers.get('Cf-Access-Authenticated-User-Email') || '')
    .trim()
    .toLowerCase();
  const assertion = String(request.headers.get('Cf-Access-Jwt-Assertion') || '').trim();
  if (!email || !assertion || !allowedEmails(env).includes(email)) {
    return { ok: false, status: 403, error: 'Acesso administrativo não autorizado.' };
  }

  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return { ok: false, status: 403, error: 'Origem da requisição não autorizada.' };
  }

  return { ok: true, token, email };
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

function rejectUnknown(object, allowed, name) {
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) throw new Error(`Campo não permitido em ${name}: ${key}`);
  }
}

function validateSite(site) {
  ensurePlainObject(site, 'site');
  rejectUnknown(site, ['page_title', 'description', 'brand_name', 'brand_tagline', 'hero', 'home', 'about', 'theme', 'footer'], 'site');
  ensureString(site.page_title, 'Título da aba', 180, true);
  ensureString(site.description, 'Descrição', 500, true);
  ensureString(site.brand_name, 'Nome curto', 80, true);
  ensureString(site.brand_tagline, 'Complemento do cabeçalho', 160);

  ensurePlainObject(site.hero, 'hero');
  rejectUnknown(site.hero, ['eyebrow', 'title', 'lead', 'title_alignment', 'title_size', 'image', 'image_alt'], 'hero');
  ensureString(site.hero.eyebrow, 'Identificação superior', 120);
  ensureString(site.hero.title, 'Título principal', 220, true);
  ensureString(site.hero.lead, 'Texto de apoio', 800);
  ensureString(site.hero.image, 'Imagem principal', 300);
  ensureString(site.hero.image_alt, 'Descrição acessível', 300);
  if (!['left', 'right'].includes(site.hero.title_alignment)) throw new Error('Alinhamento do título inválido.');
  if (!['standard', 'compact', 'small'].includes(site.hero.title_size)) throw new Error('Tamanho do título inválido.');

  for (const [key, label] of [['home', 'seção inicial'], ['about', 'sobre'], ['theme', 'tema'], ['footer', 'rodapé']]) {
    ensurePlainObject(site[key], label);
  }
  rejectUnknown(site.home, ['intro_eyebrow', 'intro_title', 'intro_text'], 'home');
  rejectUnknown(site.about, ['title', 'summary', 'body'], 'about');
  rejectUnknown(site.theme, ['primary', 'accent'], 'theme');
  rejectUnknown(site.footer, ['dedication', 'institutional_note'], 'footer');

  ensureString(site.home.intro_eyebrow, 'Rótulo inicial', 120);
  ensureString(site.home.intro_title, 'Título da seção inicial', 220);
  ensureString(site.home.intro_text, 'Texto da seção inicial', 1500);
  ensureString(site.about.title, 'Título sobre', 180);
  ensureString(site.about.summary, 'Resumo sobre', 600);
  ensureString(site.about.body, 'Texto completo sobre', 12000);
  ensureString(site.footer.dedication, 'Homenagem', 1200);
  ensureString(site.footer.institutional_note, 'Nota institucional', 2000);

  for (const field of ['primary', 'accent']) {
    if (typeof site.theme[field] !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(site.theme[field])) {
      throw new Error(`Cor inválida: ${field}.`);
    }
  }
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
    ensureString(item.description, `Descrição da palestra ${index + 1}`, 1800);
    ensureString(item.youtube_url, `Link da palestra ${index + 1}`, 500, true);
    if (!validYoutube(item.youtube_url)) throw new Error(`Link do YouTube inválido na palestra ${index + 1}.`);
    if (typeof item.published !== 'boolean') throw new Error(`Estado de publicação inválido na palestra ${index + 1}.`);
  });
}

function toBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function githubRequest(path, token, init = {}) {
  return fetch(`https://api.github.com/repos/${REPOSITORY}${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2026-03-10',
      'user-agent': 'pa-safra-native-admin/1.0',
      ...(init.headers || {}),
    },
  });
}

export async function onRequestPut({ request, env }) {
  const auth = authorize(request, env);
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
    if (resource === 'site') validateSite(body.data);
    if (resource === 'videos') validateVideos(body.data);
  } catch (error) {
    return json({ ok: false, error: error.message }, 422);
  }

  const branch = String(env.PA_SAFRA_CONTENT_BRANCH || 'main').trim() || 'main';
  const current = await githubRequest(`/contents/${filePath}?ref=${encodeURIComponent(branch)}`, auth.token);
  if (!current.ok) {
    return json({ ok: false, error: `Não foi possível carregar a versão atual (${current.status}).` }, 502);
  }
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
  if (!update.ok) {
    return json({ ok: false, error: result?.message || `Falha de publicação (${update.status}).` }, 502);
  }

  return json({
    ok: true,
    resource,
    message: 'Alteração enviada para publicação.',
    commit: result?.commit?.sha || null,
    branch,
    user: auth.email,
  });
}
