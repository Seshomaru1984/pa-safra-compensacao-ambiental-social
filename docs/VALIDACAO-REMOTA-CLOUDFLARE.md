# Validação remota do preview Cloudflare Pages

A etapa A11 adiciona um smoke test remoto para reduzir a dependência de inspeção manual após a conexão do repositório ao Cloudflare Pages.

## Antes da conexão

A versão consolidada até A10 está em `main`, porém `public/content/publicacao.json` permanece com `status: pendente` e checks obrigatórios ainda falsos. No ambiente Cloudflare Pages, `main` entra em modo bloqueante; portanto a produção não deve ser liberada antes das aprovações editoriais.

## Configuração da integração Git

Conectar o Cloudflare Pages ao repositório:

`Seshomaru1984/pa-safra-compensacao-ambiental-social`

Configuração:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: raiz do repositório

Branches diferentes de `main` podem ser usadas como previews. A URL `*.pages.dev` do preview deve continuar bloqueada para indexação enquanto o estado editorial estiver pendente.

## Smoke remoto

O comando local/CI é:

```bash
PA_SAFRA_PREVIEW_URL="https://exemplo.pages.dev" npm run smoke:remote
```

Por padrão o teste aceita apenas hosts `*.pages.dev`. Para um domínio próprio futuro, informar também o host exato:

```bash
PA_SAFRA_PREVIEW_URL="https://www.exemplo.com" PA_SAFRA_ALLOWED_HOST="www.exemplo.com" npm run smoke:remote
```

O teste verifica:

- HTTPS e host autorizado;
- identidade do PA Safra e integridade UTF-8;
- ausência do placeholder `contato@exemplo.com`;
- `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy` e `X-Frame-Options`;
- `publicacao.json` remoto com branch de produção `main` e status pendente nesta etapa;
- `robots.txt` com `Disallow: /` enquanto pendente;
- assinatura WebP e tamanho mínimo das duas imagens do solicitante.

## GitHub Actions

O workflow `.github/workflows/remote-preview.yml` pode ser acionado manualmente com a URL de preview. Ele executa o mesmo `npm run smoke:remote` e registra o resultado no resumo da execução.

## Domínio

Nenhum domínio precisa ser adquirido para esta validação. O preview inicial usa a URL gratuita `*.pages.dev` fornecida pelo Cloudflare Pages. A aquisição/conexão de domínio próprio deve ocorrer apenas após a aprovação visual, editorial, jurídica e operacional prevista no projeto.
