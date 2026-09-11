# PA Safra — Compensação Ambiental e Social

Portal institucional e informativo do Projeto de Compensação Ambiental e Social — PA Safra, em Nova Xavantina/MT.

## Desenvolvimento

- `main`: estado consolidado e aprovado;
- `develop`: integração de desenvolvimento;
- branches `feat/...` e `fix/...`: alterações isoladas por etapa;
- validação automática: imagens, estrutura/conteúdo, contrato Pages CMS, readiness Cloudflare, ambiente Cloudflare, trava editorial, JavaScript, parser PowerShell, build e smoke.

O alvo remoto autorizado deste projeto é exclusivamente:

`Seshomaru1984/pa-safra-compensacao-ambiental-social`

## Conteúdo editável

A estrutura separa o conteúdo editorial do layout e prepara o projeto para edição via Pages CMS. Os dados editáveis ficam em `public/content/`, e as imagens públicas ficam em `public/assets/`.

A configuração do painel está em `.pages.yml`.

## Execução local

```powershell
npm ci
npm run dev
```

O servidor de desenvolvimento usa a porta local exclusiva `4286` com `--strictPort`.

## Build local e pacotes

Para gerar um build validado no Windows e arquivar automaticamente o ZIP dentro do projeto:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\tools\PA-SAFRA-BUILD-E-ARQUIVAR.ps1"
```

O script cria uma pasta em `_PACOTES-LOCAL/`, gera o ZIP inicialmente em `Downloads`, confere o SHA-256 e o move para essa pasta do projeto. `_PACOTES-LOCAL/` é ignorado pelo Git.

Detalhes: [`docs/BUILD-LOCAL-E-PACOTES.md`](docs/BUILD-LOCAL-E-PACOTES.md).

## Trava de publicação

A barreira contra publicação prematura usa `public/content/publicacao.json` como fonte de aprovação.

- `npm run build` executa a verificação de pré-publicação em modo advisory durante desenvolvimento, CI e previews;
- quando o build roda no Cloudflare Pages com `CF_PAGES=1` e `CF_PAGES_BRANCH=main`, a verificação passa automaticamente para modo bloqueante;
- `npm run prepublish:check` executa a mesma validação em modo bloqueante deliberado;
- produção só é liberada quando todas as validações obrigatórias estão `true` e `status` está definido como `aprovado`.

Nenhum item de aprovação deve ser marcado como concluído sem confirmação efetiva. A configuração de publicação não é exposta no Pages CMS.

## Preview Cloudflare

A V001-A11 adicionou validação remota automatizada. Depois que existir uma URL de branch `*.pages.dev`, o preview pode ser testado por:

```bash
PA_SAFRA_PREVIEW_URL="https://exemplo.pages.dev" npm run smoke:remote
```

ou pelo workflow manual `.github/workflows/remote-preview.yml`.

A branch preparada para a próxima validação externa é:

`feat/pa-v001-a12-preparar-preview-cloudflare`

## Publicação planejada

A arquitetura definida para produção é GitHub + Pages CMS + Cloudflare Pages + domínio próprio.

Parâmetros do Cloudflare Pages:

- branch de produção: `main`;
- build: `npm run build`;
- saída: `dist`;
- raiz: raiz do repositório.

O usuário informou que o domínio próprio já está disponível. Ele não será solicitado/configurado até o preview remoto, a revisão visual, o teste operacional do Pages CMS e as demais validações editoriais estarem concluídos.

## Validação editorial

Antes da publicação definitiva, devem ser confirmados créditos/licenças das imagens fornecidas pelo solicitante, dados de contato, redação jurídica, afirmações históricas/biográficas, revisão visual e teste operacional do Pages CMS.

Checklist: [`docs/PRE-PUBLICACAO-CHECKLIST.md`](docs/PRE-PUBLICACAO-CHECKLIST.md).
