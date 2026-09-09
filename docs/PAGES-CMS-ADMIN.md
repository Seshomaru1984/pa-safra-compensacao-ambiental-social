# Pages CMS — operação do PA Safra

## Objetivo

O Pages CMS será a camada de edição do conteúdo. O layout, o JavaScript e a estrutura técnica permanecem no repositório; os administradores editam somente os campos expostos em `.pages.yml`.

## Primeira conexão

1. Acesse `https://app.pagescms.org/` e entre com GitHub.
2. Autorize/instale o GitHub App do Pages CMS somente para `Seshomaru1984/pa-safra-compensacao-ambiental-social`.
3. Abra o repositório no Pages CMS.
4. Selecione a branch que será usada para a edição/validação.
5. O Pages CMS lerá `.pages.yml` da própria branch.

Enquanto V001-A3/V001-A4 estiverem em revisão, não use `main` como branch de edição editorial definitiva.

## O que o administrador poderá editar

- título e descrição do site;
- nome curto e complemento do cabeçalho;
- título, texto, imagem e alinhamento da capa;
- cores básicas;
- seção inicial;
- texto "Sobre este site";
- eixos/destaques;
- galeria;
- notícias;
- vídeos/palestras por URL do YouTube;
- páginas adicionais;
- frase e nota institucional do rodapé.

O administrador não recebe editor livre de HTML/CSS/JavaScript do portal.

## Imagens

Há duas origens de mídia configuradas:

- `site_images`: imagens institucionais e da galeria em `public/assets/img`;
- `uploads`: imagens de notícias e páginas em `public/assets/uploads`.

Os nomes de novos arquivos são normalizados com `rename: safe`.

## Identidade dos commits

`settings.commit.identity: user` está habilitado. Quando os dados estiverem disponíveis, as alterações podem registrar a identidade do usuário que efetuou a edição.

## Botão "Validar alterações"

A V001-A4 adiciona uma ação no Pages CMS chamada **Validar alterações**. Ela dispara `.github/workflows/validate.yml` na branch atualmente aberta no CMS.

A rotina executa:

- `npm ci`;
- `npm run check`;
- `node --check app.js`;
- `npm run build`.

A ação **não faz merge e não publica em produção**.

O `workflow_dispatch` precisa estar presente no workflow disponível no branch padrão para que o acionamento manual do GitHub fique operacional. Por isso, o botão deve ser considerado funcional para operação definitiva somente depois da promoção controlada desta configuração.

## Colaboradores sem GitHub

O Pages CMS permite convidar colaboradores por e-mail. Eles podem editar conteúdo e mídia do repositório autorizado, mas não gerenciam `.pages.yml` nem as configurações administrativas do CMS.

## Regra de segurança editorial

Antes da publicação definitiva, continuam obrigatórias as validações de:

- créditos/licenças das imagens fornecidas pelo solicitante;
- dados de contato;
- redação jurídica definitiva;
- afirmações históricas/biográficas que dependam de documentação específica.
