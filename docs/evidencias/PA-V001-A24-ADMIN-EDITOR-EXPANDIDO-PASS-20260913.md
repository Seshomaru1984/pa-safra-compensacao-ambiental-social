# PA Safra — V001-A24 — painel editorial expandido

Data: 2026-09-13

## Objetivo

Expandir o painel administrativo nativo além de Página inicial e Palestras/Vídeos, mantendo a arquitetura de lista branca, a branch editorial de Preview e as travas de produção.

## Decisão de escopo

Por decisão do responsável pelo projeto, o módulo **Notícias** foi retirado do escopo operacional porque exigiria atualização contínua e poderia transmitir aparência de abandono quando desatualizado.

A A24 mantém `noticias.json` apenas como artefato inerte de compatibilidade. O recurso:

- não aparece como área administrativa;
- não é uma view pública ativa no runtime;
- não é carregado pelo painel;
- não pertence à lista branca de escrita da API administrativa.

## Áreas administrativas

O `/admin` passa a oferecer nove áreas:

1. Página inicial;
2. Sobre o Projeto;
3. Destaques;
4. Palestras e vídeos;
5. Galeria;
6. Links úteis;
7. Memória e legado;
8. Páginas extras;
9. Aparência e rodapé.

## Editor de texto

Os campos de texto rico oferecem ferramentas básicas controladas:

- negrito;
- itálico;
- sublinhado;
- lista com marcadores;
- lista numerada;
- alinhamento à esquerda;
- centralização;
- alinhamento à direita;
- justificado;
- tamanho de texto;
- cor de texto;
- criação de link;
- remoção de formatação.

A API valida conteúdo rico e rejeita scripts, handlers de evento, `javascript:`, `url()`, `expression()` e estilos fora do escopo editorial permitido.

## Conteúdo preservado

O texto existente de **Memória e legado** foi copiado para a fonte editorial sem reescrita biográfica/histórica. O teste de navegador exige explicitamente a permanência das referências a Wolnei Divino Franco, “primeiros advogados da região” e Perdizes/MG ao salvar outro módulo.

`links.json` foi criado com os mesmos links e descrições já presentes no portal público.

A única alteração textual deliberada decorrente da decisão de escopo foi retirar a palavra “notícias” da enumeração de conteúdos da página inicial.

## Segurança e publicação

Permanecem preservados:

- login nativo;
- sessão assinada;
- cookie seguro;
- rate limiter D1;
- same-origin;
- token de escrita apenas server-side;
- guard fail-closed da branch editorial;
- produção, `main`, `develop`, domínio e DNS intocados.

A lista branca da API passa a aceitar somente:

- `site`;
- `videos`;
- `pages`;
- `highlights`;
- `gallery`;
- `links`.

## Validação automática

PR: `#26` — draft.

Branch: `ops/pa-v001-a24-admin-editor-expandido`.

HEAD validado: `388ec6e8fa5ec2b0dd1f05b7d9e9eebce3eaac1b`.

GitHub Actions `validate`, run `34764155874`: **SUCCESS**.

Passaram:

- reconstrução e integridade de imagens;
- estrutura editorial;
- auditoria dos bloqueios editoriais;
- contrato do admin ampliado;
- autenticação/rate limiter;
- guard da branch editorial;
- readiness e contrato Cloudflare;
- trava de pré-publicação;
- sintaxe JavaScript;
- parser PowerShell;
- build;
- smoke;
- Chrome headless do painel ampliado;
- artifact do build.

## Classificação

**A24 T1: PASS.**

O painel ampliado está tecnicamente consistente no CI. Isso não equivale a merge, publicação em produção, revisão visual final nem aprovação dos cinco gates editoriais/jurídicos pendentes.
