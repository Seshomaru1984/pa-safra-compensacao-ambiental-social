# PA-V001 - Informações opcionais de imagem

Data: 14/09/2026

## Regra confirmada

- Legenda, crédito e licença não devem receber textos artificiais como `a confirmar` ou `em conferência` para exibição pública.
- Quando nenhum dado de informação da imagem estiver preenchido, o bloco de informações/legenda deve ficar oculto no site.
- Quando somente parte dos dados estiver preenchida, devem ser exibidos apenas os dados efetivamente informados.
- A descrição acessível (`alt`) permanece independente dessa regra e continua disponível para acessibilidade.
- No Legado, `image_credit` vazio oculta a legenda da imagem original e da cópia inserida no corpo do texto.

## Alterações

- `public/image-fallback.js`: remove legenda padrão artificial e informações pendentes, ocultando o bloco quando vazio.
- `public/internal-header-body-media.js`: sincroniza `image_credit` e oculta a legenda do Legado quando o campo estiver vazio.
- `public/content/galeria.json`: remove textos de placeholder de crédito/licença.
- `content/pa-v001-admin-preview`: conteúdo da galeria sincronizado com a mesma regra.
- `tools/editorial-demand-test.mjs`: protege a regra contra regressão.

## Validação

Workflow `validate`, run `34904795806`, run number `1078`, HEAD `cf934bbfa138bc8ec6badc492e2cc7127b7d0399`: SUCCESS.

Foram aprovados check editorial, auditoria, autenticação, guard de branch, Cloudflare, JavaScript, PowerShell, build, smoke e navegador headless.

## Limite

A ocultação de informações vazias é uma regra de apresentação. Ela não declara, por si só, que direitos de uso de material de terceiros foram juridicamente confirmados. O gate `creditos_imagens_confirmados` permanece independente até a confirmação correspondente.
