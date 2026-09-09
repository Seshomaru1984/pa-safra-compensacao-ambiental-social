# Build local e organizacao de pacotes - PA Safra

## Regra adotada

Sempre que um build for executado em um PC Windows do projeto PA Safra, o pacote final deve ficar dentro do proprio projeto, e nao solto em `Downloads`.

O fluxo padrao e automatizado pelo script:

`tools/PA-SAFRA-BUILD-E-ARQUIVAR.ps1`

## Estrutura gerada

O script cria, automaticamente:

```text
PA SAFRA/
  _PACOTES-LOCAL/
    AAAA-MM-DD-HHMMSS-<branch>-<sha>/
      PA-SAFRA-...-DIST.zip
      BUILD-INFO.txt
      SHA256.txt
```

`_PACOTES-LOCAL/` e ignorado pelo Git e nunca deve ser commitado.

## Fluxo executado

1. confirma `package.json` do PA Safra;
2. confirma que `origin` aponta exclusivamente para `Seshomaru1984/pa-safra-compensacao-ambiental-social`;
3. bloqueia caso detecte o repositorio proibido de outro projeto;
4. exige worktree limpo;
5. executa `npm ci`;
6. executa `npm run check`;
7. executa `node --check app.js`;
8. executa `npm run build`;
9. confirma `dist/index.html`;
10. cria o ZIP inicialmente em `%USERPROFILE%\Downloads`;
11. calcula SHA-256;
12. move o ZIP para a pasta gerada em `_PACOTES-LOCAL`;
13. calcula novamente o SHA-256 apos a movimentacao;
14. grava metadados do build e abre a pasta final no Explorer.

## Execucao

A partir da raiz do projeto:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\tools\PA-SAFRA-BUILD-E-ARQUIVAR.ps1"
```

Para nao abrir o Explorer ao final:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\tools\PA-SAFRA-BUILD-E-ARQUIVAR.ps1" -NaoAbrirPasta
```

## Diferenca entre fonte e build

O ZIP gerado contem a saida de `dist/`, apropriada para teste ou publicacao estatica. Ele nao substitui o repositorio-fonte e nao deve ser extraido por cima da pasta do projeto.

## Arquivos baixados durante o desenvolvimento

Quando um build ou pacote for entregue por download durante o desenvolvimento, a mesma convencao deve ser usada: criar uma pasta correspondente dentro de `_PACOTES-LOCAL/` e armazenar o ZIP ali, junto com hash e identificacao da versao quando disponiveis.
