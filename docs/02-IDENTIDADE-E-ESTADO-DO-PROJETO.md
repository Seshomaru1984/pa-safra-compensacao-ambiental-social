# 02 - Identidade e estado do projeto

Atualizado em 15/09/2026. Este arquivo registra o checkpoint técnico corrente do projeto PA Safra.

## 1. Identidade e fronteiras

| Campo | Estado atual |
|---|---|
| Nome do projeto | Projeto de Compensação Ambiental e Social - PA Safra |
| Identificador curto | `pa-safra-compensacao-ambiental-social` |
| Contexto territorial | PA Safra refere-se ao Projeto de Assentamento Banco Safra, no município de Nova Xavantina/MT; não indica vínculo com instituição bancária comercial |
| Público prioritário | Comunidades de Alvorada, Córrego do Jatobá, Vila do Banco Safra e demais munícipes de Nova Xavantina |
| Repositório | `Seshomaru1984/pa-safra-compensacao-ambiental-social` |
| Branch de integração e testagem | `develop` |
| Branch editorial do Admin em Preview | `content/pa-v001-admin-preview` |
| Produção | `main`, protegida pelos gates editoriais vigentes |
| Administração | `/admin`, com login próprio, áreas editoriais principais e atalhos dedicados para `Mapas e acessos` e `Contato` |
| Escopo atual | Estado técnico integrado e disponível para testagem do solicitante em `develop`; `main` permanece fora do escopo autorizado |

## 2. Integrações relevantes concluídas

### Reconstrução limpa e Admin

- PR #39 integrado em `develop`.
- Upload simples de imagens integrado ao Admin.
- Fluxo de um `Salvar` e um `Pré-visualizar` por área preservado.
- Escritas editoriais serializadas e regressões de salvamentos consecutivos cobertas por testes.

### Informações opcionais de imagem

- PR #40 integrado em `develop`.
- PR #41 corrigiu regressões detectadas no review do PR #40.
- Legenda, crédito e licença vazios não geram placeholders públicos.
- A descrição acessível (`alt`) permanece independente.

### Mapas e acessos

- PR #44 integrado em `develop`.
- Commit de merge: `9cd80bffb5f66bbd6f44377e2042a39f9cbcad76`.
- Mapa interativo mobile-first com geolocalização sob ação explícita do usuário.
- Controle visível `Camadas`.
- Camadas opcionais de relevo, sistema viário, drenagem, massas d'água, projetos de assentamento e limites municipais.
- Hover de legenda no desktop e clique como fallback para touch/mobile.
- Autoenquadramento ao ativar camada oficial.
- Geometrias oficiais consultadas por proxy restrito à região de interesse.
- CI e Cloudflare pós-merge aprovados antes da liberação para testagem.

### Contato no Admin e navegação final

- PR #45 integrado em `develop`.
- HEAD candidato validado: `d30c18df7e7eadcd43ea92b7d78beabaa551e075`.
- Commit de merge: `958884cf0f4cfc0cfc733c20a8aedad061046cd8`.
- CI do PR: run 1189, SUCCESS.
- CI pós-merge: run 1190, SUCCESS.
- Cloudflare Pages pós-merge: SUCCESS.
- `Contato` passou a ter aba explícita no Admin, reutilizando o mesmo registro `contato` de `public/content/paginas.json`.
- `Mapas e acessos` permanece como aba explícita no Admin e reutiliza o registro `acesso-localizacao`.
- Não foi criada fonte editorial paralela nem nova API de escrita.
- Slugs existentes foram preservados.

## 3. Navegação pública vigente

A ordem institucional do menu principal é:

1. Início
2. Sobre o Projeto
3. Mapas e acessos
4. Palestras
5. Galeria
6. Memória e legado
7. Links Úteis
8. Contato

A decisão organiza primeiro apresentação e contexto territorial, depois conteúdo e memória, deixando `Contato` como ação final do menu. A reorganização é aplicada de forma idempotente após o carregamento das páginas dinâmicas, sem alterar hashes ou URLs existentes.

## 4. Estado do conteúdo e recursos

- Página `Mapas e acessos`, publicada e editável pelo Admin.
- Página `Contato`, publicada e editável pelo Admin.
- Contato confirmado: `gustavomzfranco@hotmail.com`.
- Upload de JPG, PNG e WebP no Admin para os campos integrados.
- Foto e conteúdo de Memória e legado preservados.
- Galeria sem placeholders artificiais de crédito ou licença quando os campos estiverem vazios.
- Mapa interativo disponível no ambiente de testagem.
- Links, vídeos, conteúdo institucional e páginas complementares permanecem versionados em `public/content/*.json`.

## 5. Estado técnico para testagem

| Item | Estado |
|---|---|
| HEAD integrado antes deste checkpoint documental | `958884cf0f4cfc0cfc733c20a8aedad061046cd8` |
| PR #44 | MESCLADO em `develop` |
| PR #45 | MESCLADO em `develop` |
| CI pós-merge final | run 1190, SUCCESS |
| Cloudflare Pages pós-merge | SUCCESS |
| Build | PASS |
| Smoke | PASS |
| Autenticação | PASS |
| Guard de branch editorial | PASS |
| Cloudflare readiness/env | PASS |
| JavaScript | PASS |
| PowerShell | PASS |
| Admin em navegador headless | PASS |
| Site público em navegador headless | PASS |
| Estado para testagem do solicitante | PRONTO |
| Promoção para `main` | NÃO AUTORIZADA |
| Produção | NÃO EXECUTADA |

Ambiente estável de testagem:

- Site: `https://develop.pa-safra-compensacao-ambiental-social.pages.dev/`
- Admin: `https://develop.pa-safra-compensacao-ambiental-social.pages.dev/admin/`

## 6. Roteiro mínimo da testagem do solicitante

- Conferir a ordem do menu público em desktop e celular.
- Confirmar `Mapas e acessos` e `Contato` no menu público.
- Entrar no Admin e confirmar as abas explícitas `Mapas e acessos` e `Contato`.
- Editar e salvar o conteúdo de Contato sem afetar Mapas e acessos ou outras páginas.
- Editar e salvar Mapas e acessos sem afetar Contato ou outras páginas.
- Conferir mapa, camadas, hover/click das legendas, autoenquadramento e `Minha localização`.
- Testar upload, substituição e remoção de imagens.
- Conferir Home, Sobre, Palestras, Galeria, Memória e legado e Links Úteis.
- Repetir revisão visual em desktop e celular, incluindo ausência de overflow horizontal.

## 7. Gates editoriais atuais

| Gate | Estado |
|---|---|
| `redacao_juridica_confirmada` | `false` |
| `creditos_imagens_confirmados` | `false` |
| `dados_contato_confirmados` | `true` |
| `afirmacoes_historicas_confirmadas` | `false` |
| `revisao_visual_confirmada` | `false` |
| `admin_nativo_validado` | `true` |

Esses gates não impedem a testagem em Preview/develop. Eles continuam impedindo promoção definitiva para `main` e publicação em produção enquanto aplicáveis.

Validação automatizada e headless não substitui revisão visual humana. O gate `revisao_visual_confirmada` só pode ser alterado após aprovação efetiva do ambiente.

## 8. Continuidade

O próximo passo é receber o retorno do solicitante sobre o ambiente de `develop` e registrar correções objetivas, se houver.

Não promover automaticamente para `main`, não alterar domínio e não declarar produção concluída sem autorização específica e sem os gates correspondentes.