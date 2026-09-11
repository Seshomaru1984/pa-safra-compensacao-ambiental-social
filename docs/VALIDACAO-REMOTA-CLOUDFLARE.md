# Validação remota do preview Cloudflare Pages

A etapa A11 adicionou um smoke test remoto para reduzir a dependência de inspeção manual após a conexão do repositório ao Cloudflare Pages. A V001-A12 prepara a branch de preview e registra o estado externo atual sem liberar produção.

## Estado antes da conexão

A versão consolidada até A11 está em `main` e `develop`, porém `public/content/publicacao.json` permanece com `status: pendente` e todos os checks obrigatórios ainda falsos. No ambiente Cloudflare Pages, `main` entra em modo bloqueante; portanto a produção não deve ser liberada antes das aprovações editoriais.

O usuário informou em 11/09/2026 que o domínio próprio já está disponível para uso. O nome, registrador e DNS não devem ser solicitados nem configurados durante o preview inicial. Esses dados serão solicitados somente quando o preview remoto, o fluxo editorial e os gates de publicação indicarem que chegou o momento de conectar o domínio.

## Configuração da integração Git

Conectar o Cloudflare Pages ao repositório:

`Seshomaru1984/pa-safra-compensacao-ambiental-social`

Configuração:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: raiz do repositório

Branches diferentes de `main` podem ser usadas como previews. A branch preparada para a próxima validação é:

`feat/pa-v001-a12-preparar-preview-cloudflare`

A URL `*.pages.dev` do preview deve continuar bloqueada para indexação enquanto o estado editorial estiver pendente.

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

O domínio próprio já está disponível segundo confirmação do usuário, mas não é necessário para esta validação. O preview inicial usa a URL gratuita `*.pages.dev` fornecida pelo Cloudflare Pages.

A conexão do domínio próprio somente deve ocorrer depois de:

1. preview remoto funcional e aprovado;
2. smoke remoto PASS;
3. revisão visual humana concluída;
4. Pages CMS testado operacionalmente;
5. pendências jurídicas, históricas, de contato e créditos resolvidas;
6. `publicacao.json` aprovado com todos os checks verdadeiros;
7. decisão explícita de iniciar a configuração de produção.

Quando esse ponto for alcançado, solicitar ao usuário apenas os dados necessários do domínio e do provedor/DNS. Não solicitar senhas, tokens ou cookies pelo chat.
