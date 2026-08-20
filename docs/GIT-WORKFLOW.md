# Fluxo Git e rollback - PA Safra

## Repositorio exclusivo

Este projeto utiliza exclusivamente:

`Seshomaru1984/pa-safra-compensacao-ambiental-social`

Nenhum outro repositorio e autorizado para codigo, branches, commits, pull requests, backups ou experimentos deste projeto.

## Branches permanentes

- `main`: estado consolidado e aprovado.
- `develop`: base de integracao do desenvolvimento.

O desenvolvimento normal nao ocorre diretamente em `main`.

## Branches de etapa

Cada mudanca relevante deve nascer de `origin/develop` em branch propria:

`feat/pa-vNNN-aN-descricao`

Correcoes:

`fix/pa-vNNN-aN-descricao`

Branches `safety/...` sao checkpoints de protecao usados antes de operacoes estruturais.

## Gate antes do commit

1. confirmar repositorio e remote corretos;
2. `git fetch origin --prune`;
3. confirmar branch e SHA base;
4. exigir worktree limpo;
5. `git diff --check`;
6. validacoes especificas do projeto;
7. `node --check app.js`, quando aplicavel;
8. `npm run check`;
9. `npm run build`;
10. conferir arquivos alterados;
11. staging apenas dos arquivos autorizados.

## Pull requests

Branches de etapa sao publicadas e abertas como Pull Request para `develop`.

Nao ha merge automatico por padrao.

A promocao de `develop` para `main` ocorre apenas em checkpoint consolidado e validado.

## Rollback

A branch base nunca e reescrita para corrigir uma etapa falha.

- Falha antes do commit: restaura-se apenas o conjunto de arquivos da etapa e remove-se a branch incompleta.
- Falha apos commit: preserva-se o commit/branch para auditoria e a correcao ocorre em nova revisao.
- Falha apos push: a branch remota e preservada ate decisao explicita.

## Evidencias

Scripts de etapa devem registrar:
- versao e revisao;
- branch base;
- SHA base;
- branch criada;
- SHA final;
- arquivos alterados;
- resultados dos gates;
- URL do Pull Request;
- logs e hashes de retorno.