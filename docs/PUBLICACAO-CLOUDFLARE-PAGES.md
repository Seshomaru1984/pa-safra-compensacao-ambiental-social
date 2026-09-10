# Cloudflare Pages — preparação de publicação do PA Safra

## Arquitetura definida

- código e conteúdo: GitHub;
- edição: Pages CMS;
- build: Vite;
- hospedagem: Cloudflare Pages;
- domínio: domínio próprio a registrar/configurar posteriormente.

## Configuração recomendada no Cloudflare Pages

Conectar por **Git integration** ao repositório:

`Seshomaru1984/pa-safra-compensacao-ambiental-social`

Usar:

- Production branch: `main`;
- Build command: `npm run build`;
- Build output directory: `dist`;
- Root directory: raiz do repositório.

## Política de publicação

`main` deve continuar sendo a única branch de produção.

Branches de desenvolvimento e Pull Requests servem para validação e preview. A promoção para produção ocorre somente depois de revisão e merge controlado em `main`.

Não configurar a branch `develop` ou branches `feat/...` como produção.

## Preview

Com a integração Git do Cloudflare Pages, branches e Pull Requests podem receber deployments de preview separados da produção. Isso será usado para validar visualmente alterações do site antes da promoção para `main`.

## Pages CMS

O Pages CMS altera arquivos no GitHub. Após a publicação definitiva da arquitetura, mudanças editoriais precisam seguir a política de branch definida para não transformar uma edição de conteúdo em publicação não revisada.

O botão **Validar alterações** da V001-A4 executa somente o gate técnico; não faz deploy nem merge.

## Domínio

O domínio próprio será conectado somente depois que:

1. o preview estiver visualmente aprovado;
2. o fluxo Pages CMS estiver validado;
3. os créditos/licenças pendentes estiverem resolvidos;
4. os dados institucionais estiverem confirmados;
5. `main` contiver a versão aprovada.

## Estado desta etapa

A V001-A4 apenas prepara o repositório e documenta os parâmetros de publicação. Nenhuma conta Cloudflare, domínio ou produção é alterada automaticamente por esta etapa.
