<#
INICIAR-PA-SAFRA.ps1
Bootstrap + launcher do site "Projeto de Compensacao Ambiental e Social - PA Safra".

Padrao tecnico inspirado no fluxo de desenvolvimento do SIGUEG:
- pasta raiz previsivel;
- Node/Vite;
- validacao antes de iniciar;
- Git/GitHub;
- atalho de desenvolvimento na Area de Trabalho;
- execucao em janela separada;
- script idempotente, sem sobrescrever o projeto em cada inicializacao.

Primeira execucao:
1. cria a estrutura do site;
2. grava as imagens fornecidas no projeto;
3. instala dependencias;
4. executa check, parser JS e build;
5. inicializa Git;
6. cria/publica o repositorio GitHub via gh;
7. cria o atalho "PA Safra - Desenvolvimento";
8. abre o site em http://127.0.0.1:4173/.

Execucoes seguintes:
- nao reescrevem os arquivos do site;
- validam e iniciam o ambiente local.

Use -ForceRewrite apenas se quiser recriar os arquivos base desta versao.
#>

param(
  [string]$Root = "",
  [string]$Owner = "Seshomaru1984",
  [string]$RepoName = "pa-safra-compensacao-ambiental-social",
  [switch]$Public,
  [switch]$ForceRewrite,
  [switch]$Publish,
  [switch]$NoStart
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$LocalUrl = "http://127.0.0.1:4173/"
$RepoFullName = "$Owner/$RepoName"

function Write-Step([string]$Text) {
  Write-Host ""
  Write-Host "==> $Text" -ForegroundColor Cyan
}

function Fail([string]$Message) {
  Write-Host ""
  Write-Host "ERRO: $Message" -ForegroundColor Red
  Write-Host ""
  Read-Host "Pressione ENTER para fechar"
  exit 1
}

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = @($machine, $user) -join ";"
}

function Resolve-Root([string]$RequestedRoot) {
  if (-not [string]::IsNullOrWhiteSpace($RequestedRoot)) {
    return [IO.Path]::GetFullPath($RequestedRoot)
  }

  if (Test-Path "E:\") {
    return "E:\PA SAFRA"
  }

  return (Join-Path $env:USERPROFILE "PA SAFRA")
}

function Ensure-Command {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][string]$WingetId,
    [Parameter(Mandatory=$true)][string]$Label
  )

  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if (-not $winget) {
    Fail "$Label nao encontrado e winget nao esta disponivel para instalacao automatica."
  }

  Write-Step "Instalando $Label"
  & $winget.Source install --id $WingetId --exact --silent --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    Fail "Falha ao instalar $Label pelo winget. Codigo: $LASTEXITCODE"
  }

  Refresh-Path
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    Fail "$Label foi instalado, mas ainda nao apareceu no PATH. Feche e abra o PowerShell e execute o script novamente."
  }

  return $cmd.Source
}

function Invoke-External {
  param(
    [Parameter(Mandatory=$true)][string]$Command,
    [Parameter(Mandatory=$true)][string[]]$Arguments,
    [Parameter(Mandatory=$true)][string]$Label
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    Fail "$Label falhou. Codigo: $LASTEXITCODE"
  }
}

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-Utf8File([string]$Path, [string]$Content) {
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  [IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}

function Write-Base64File([string]$Path, [string]$Base64) {
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  [IO.File]::WriteAllBytes($Path, [Convert]::FromBase64String($Base64))
}

function Create-DesktopShortcut([string]$ProjectRoot, [string]$LauncherPath) {
  $desktop = [Environment]::GetFolderPath("Desktop")
  if ([string]::IsNullOrWhiteSpace($desktop)) {
    Fail "Nao foi possivel localizar a Area de Trabalho."
  }

  $powershell = (Get-Command powershell.exe -ErrorAction SilentlyContinue).Source
  if (-not $powershell) {
    Fail "powershell.exe nao encontrado."
  }

  $shortcutPath = Join-Path $desktop "PA Safra - Desenvolvimento.lnk"
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $powershell
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$LauncherPath`""
  $shortcut.WorkingDirectory = $ProjectRoot
  $shortcut.Description = "Abrir o ambiente local de desenvolvimento do PA Safra"
  $shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,13"
  $shortcut.Save()

  Write-Host "Atalho: $shortcutPath" -ForegroundColor Green
}

function Test-LocalSite {
  try {
    $response = Invoke-WebRequest -Uri $LocalUrl -UseBasicParsing -TimeoutSec 2
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Start-DevWindow([string]$ProjectRoot) {
  $escapedRoot = $ProjectRoot.Replace("'", "''")
  $commandBody = @"
`$Host.UI.RawUI.WindowTitle = 'PA Safra - Vite :4173'
Set-Location -LiteralPath '$escapedRoot'
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' PA SAFRA - DESENVOLVIMENTO LOCAL' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Pasta: $escapedRoot'
Write-Host 'URL:   $LocalUrl'
Write-Host ''
npm run dev
"@

  Start-Process powershell.exe -ArgumentList @(
    "-NoExit",
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-Command", $commandBody
  ) | Out-Null
}

function Publish-GitHub {
  param(
    [string]$ProjectRoot,
    [string]$Git,
    [string]$Gh
  )

  Push-Location $ProjectRoot
  try {
    if (-not (Test-Path (Join-Path $ProjectRoot ".git"))) {
      Invoke-External $Git @("init", "-b", "main") "git init"
    }

    $userName = (& $Git config --get user.name 2>$null)
    if (-not $userName) {
      Invoke-External $Git @("config", "user.name", $Owner) "git config user.name"
    }

    $userEmail = (& $Git config --get user.email 2>$null)
    if (-not $userEmail) {
      Invoke-External $Git @("config", "user.email", "$Owner@users.noreply.github.com") "git config user.email"
    }

    Invoke-External $Git @("add", ".") "git add"

    & $Git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
      Invoke-External $Git @("commit", "-m", "feat: estrutura inicial do portal PA Safra") "git commit"
    } else {
      Write-Host "Git: nenhum arquivo novo para commit." -ForegroundColor DarkGray
    }

    & $Gh auth status *> $null
    if ($LASTEXITCODE -ne 0) {
      Write-Step "Autenticacao do GitHub"
      Write-Host "O GitHub CLI vai abrir o fluxo de login."
      & $Gh auth login
      if ($LASTEXITCODE -ne 0) {
        Fail "Nao foi possivel autenticar o GitHub CLI."
      }
    }

    & $Gh repo view $RepoFullName --json name *> $null
    $repoExists = ($LASTEXITCODE -eq 0)

    $remote = (& $Git remote get-url origin 2>$null)

    if (-not $repoExists) {
      Write-Step "Criando repositorio GitHub $RepoFullName"
      $visibility = if ($Public) { "--public" } else { "--private" }

      Invoke-External $Gh @(
        "repo", "create", $RepoFullName,
        $visibility,
        "--description", "Projeto de Compensacao Ambiental e Social - PA Safra, Nova Xavantina/MT",
        "--source", $ProjectRoot,
        "--remote", "origin",
        "--push"
      ) "gh repo create"

      Write-Host "Repositorio criado: https://github.com/$RepoFullName" -ForegroundColor Green
      return
    }

    if (-not $remote) {
      Invoke-External $Git @("remote", "add", "origin", "https://github.com/$RepoFullName.git") "git remote add"
    }

    Invoke-External $Git @("push", "-u", "origin", "main") "git push"
    Write-Host "Repositorio atualizado: https://github.com/$RepoFullName" -ForegroundColor Green
  }
  finally {
    Pop-Location
  }
}

$Root = Resolve-Root $Root
$MarkerPath = Join-Path $Root ".pa-safra-project"
$PackagePath = Join-Path $Root "package.json"
$CanonicalLauncher = Join-Path $Root "INICIAR-PA-SAFRA.ps1"

Clear-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " PA SAFRA - CRIAR / INICIAR SITE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pasta:      $Root"
Write-Host "Repositorio:$RepoFullName"
Write-Host "URL local:  $LocalUrl"

if (-not (Test-Path $Root)) {
  New-Item -ItemType Directory -Path $Root -Force | Out-Null
}

$existingEntries = @(Get-ChildItem -LiteralPath $Root -Force -ErrorAction SilentlyContinue)
if ($existingEntries.Count -gt 0 -and -not (Test-Path $MarkerPath) -and -not $ForceRewrite) {
  Fail "A pasta '$Root' ja possui arquivos e nao foi identificada como projeto PA Safra. Use outra pasta ou -ForceRewrite conscientemente."
}

$Bootstrap = (-not (Test-Path $PackagePath)) -or $ForceRewrite

if ($Bootstrap) {
  Write-Step "Criando estrutura inicial do site"
$IndexHtml = @'
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Projeto de Compensação Ambiental e Social - PA Safra: educação ambiental, informação e recursos para comunidades de Nova Xavantina/MT." />
  <meta name="theme-color" content="#173f35" />
  <title>Projeto de Compensação Ambiental e Social - PA Safra</title>
  <link rel="icon" href="assets/icons/pa-safra.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <a class="skip-link" href="#conteudo">Ir para o conteúdo</a>

  <header class="site-header" id="topo">
    <div class="shell header-inner">
      <a class="brand" href="#inicio" aria-label="PA Safra - Página inicial">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 64 64" role="img">
            <path d="M32 4c9 8 14 17 14 27 0 13-8 23-14 29-6-6-14-16-14-29C18 21 23 12 32 4Z" fill="currentColor" opacity=".18"/>
            <path d="M32 11c-6 8-8 16-7 24m7-24c6 8 8 16 7 24M17 42c8-3 22-3 30 0M20 49c7-2 17-2 24 0" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
          </svg>
        </span>
        <span>
          <strong>PA Safra</strong>
          <small>Compensação Ambiental e Social</small>
        </span>
      </a>

      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="menu-principal">Menu</button>
      <nav id="menu-principal" class="main-nav" aria-label="Navegação principal">
        <a href="#inicio" data-nav="inicio">Início</a>
        <a href="#sobre" data-nav="sobre">Sobre este site</a>
        <a href="#legado" data-nav="legado">Memória e legado</a>
        <a href="#palestras" data-nav="palestras">Palestras</a>
        <a href="#recursos" data-nav="recursos">Recursos oficiais</a>
      </nav>
    </div>
  </header>

  <main id="conteudo" tabindex="-1">
    <section class="view is-active" data-view="inicio" aria-labelledby="titulo-inicio">
      <div class="hero">
        <div class="shell hero-grid">
          <div class="hero-copy">
            <p class="eyebrow">Nova Xavantina • Mato Grosso</p>
            <h1 id="titulo-inicio">Projeto de Compensação Ambiental e Social - PA Safra</h1>
            <p class="hero-lead">Informação, educação ambiental e recursos úteis para fortalecer a prevenção, a responsabilidade socioambiental e a cidadania nas comunidades da região.</p>
            <div class="hero-actions">
              <a class="button primary" href="#sobre">Conheça o projeto</a>
              <a class="button ghost" href="#recursos">Órgãos e referências</a>
            </div>
            <div class="community-note" aria-label="Comunidades prioritárias">
              <span>Alvorada</span>
              <span>Córrego do Jatobá</span>
              <span>Vila do Banco Safra</span>
              <span>Nova Xavantina</span>
            </div>
          </div>

          <div class="hero-media" aria-label="Imagens da região e registro histórico">
            <figure class="photo photo-main">
              <img src="assets/img/rio-nova-xavantina.jpg" alt="Trecho de rio com vegetação nas margens e banco de areia" />
              <figcaption>Região de Nova Xavantina. Crédito: <a href="https://www.anoticiaemfoco.com.br/" target="_blank" rel="noopener noreferrer">A Notícia em Foco</a>.</figcaption>
            </figure>
            <figure class="photo photo-secondary">
              <img src="assets/img/atrativos-nova-xavantina.jpg" alt="Montagem com paisagens naturais e atrativos de Nova Xavantina" />
              <figcaption>Atrativos naturais da região. Crédito editorial a confirmar.</figcaption>
            </figure>
          </div>
        </div>
      </div>

      <div class="shell section-stack">
        <section class="intro-band" aria-labelledby="eixos-titulo">
          <div>
            <p class="eyebrow">Eixos do projeto</p>
            <h2 id="eixos-titulo">Reparação que também informa, previne e aproxima</h2>
          </div>
          <p>O site foi estruturado para reunir conteúdo institucional do projeto, palestras gravadas, referências ambientais e caminhos rápidos para órgãos públicos e informações de interesse local.</p>
        </section>

        <section class="card-grid" aria-label="Áreas principais do site">
          <article class="feature-card">
            <span class="feature-number">01</span>
            <h3>Educação ambiental</h3>
            <p>Conteúdos para ampliar a compreensão sobre preservação, prevenção de danos e uso responsável dos recursos naturais.</p>
          </article>
          <article class="feature-card">
            <span class="feature-number">02</span>
            <h3>Informação acessível</h3>
            <p>Materiais reunidos em linguagem clara, com navegação simples para moradores, trabalhadores rurais e demais interessados.</p>
          </article>
          <article class="feature-card">
            <span class="feature-number">03</span>
            <h3>Comunidade e território</h3>
            <p>Foco nas comunidades de Alvorada, Córrego do Jatobá, Vila do Banco Safra e nos demais munícipes de Nova Xavantina.</p>
          </article>
        </section>

        <section class="landscape-panel" aria-labelledby="territorio-titulo">
          <div class="landscape-copy">
            <p class="eyebrow">Território</p>
            <h2 id="territorio-titulo">Cerrado, rios e Serra do Roncador</h2>
            <p>Nova Xavantina reúne formações rochosas, cachoeiras, praias naturais e ilhas fluviais associadas ao Rio das Mortes, em uma paisagem marcada pelo Cerrado e por zonas de transição para a Amazônia.</p>
            <a class="text-link" href="https://visitenovaxavantina.com.br/" target="_blank" rel="noopener noreferrer">Conhecer o portal turístico de Nova Xavantina ↗</a>
          </div>
          <img src="assets/img/atrativos-nova-xavantina.jpg" alt="Montagem de atrativos naturais de Nova Xavantina, incluindo serra, rio e cachoeira" />
        </section>
      </div>
    </section>

    <section class="view" data-view="sobre" aria-labelledby="titulo-sobre" hidden>
      <div class="page-hero compact">
        <div class="shell page-hero-grid">
          <div>
            <p class="eyebrow">Institucional</p>
            <h1 id="titulo-sobre">Sobre este site</h1>
            <p>Finalidade, público e compromisso ambiental do projeto.</p>
          </div>
          <img src="assets/img/rio-nova-xavantina.jpg" alt="Trecho de rio e vegetação na região de Nova Xavantina" />
        </div>
      </div>

      <div class="shell prose-layout">
        <article class="prose-card">
          <p>Este site foi criado no âmbito do Termo de Ajustamento de Conduta (TAC) firmado entre o Espólio de Wolnei Divino Franco e o Ministério Público do Estado de Mato Grosso, como parte das medidas de compensação ambiental e social pela degradação ocorrida na região de Nova Xavantina/MT.</p>

          <p>Nosso objetivo é centralizar informações, disponibilizar palestras gravadas e oferecer recursos úteis para a comunidade de Alvorada, Córrego do Jatobá, Vila do Banco Safra e demais munícipes de Nova Xavantina.</p>

          <p>Acreditamos que a educação ambiental e o acesso à informação são ferramentas essenciais para prevenir novos danos, promover o desenvolvimento sustentável e fortalecer a cidadania.</p>

          <p>A existência humana na Terra depende da preservação da natureza. Este site é uma contribuição para que possamos, juntos, construir um futuro mais equilibrado e consciente.</p>
        </article>

        <aside class="side-panel" aria-labelledby="compromissos-titulo">
          <p class="eyebrow">Compromissos</p>
          <h2 id="compromissos-titulo">Clareza, utilidade pública e responsabilidade</h2>
          <ul class="plain-list">
            <li>Centralizar informação relevante para a comunidade.</li>
            <li>Disponibilizar conteúdo educativo de forma simples.</li>
            <li>Direcionar o usuário a fontes e órgãos oficiais.</li>
            <li>Registrar com transparência as referências utilizadas.</li>
          </ul>
        </aside>
      </div>
    </section>

    <section class="view" data-view="legado" aria-labelledby="titulo-legado" hidden>
      <div class="page-hero legacy-hero">
        <div class="shell legacy-grid">
          <div>
            <p class="eyebrow">Memória e responsabilidade</p>
            <h1 id="titulo-legado">Um legado ligado à terra e à comunidade</h1>
          </div>
          <figure class="legacy-photo">
            <img src="assets/img/registro-historico.jpg" alt="Registro histórico em preto e branco com três homens adultos" />
            <figcaption>Registro histórico. Crédito: <a href="https://georgezarur.com.br/" target="_blank" rel="noopener noreferrer">George Zarur</a>.</figcaption>
          </figure>
        </div>
      </div>

      <div class="shell prose-layout legacy-content">
        <article class="prose-card emphasized">
          <p>Este projeto nasce da necessidade de reparar um dano ambiental, mas também do desejo de honrar a memória de Wolnei Divino Franco, que dedicou sua vida a esta terra e que, infelizmente, não pôde ver a conclusão deste trabalho.</p>

          <p>Ele foi um dos primeiros advogados da região, participou da fundação da cidade de Campinápolis/MT — que derivou do município de Nova Xavantina/MT — e foi o primeiro advogado a trabalhar na legalização das terras da viúva Estephânia Brawn.</p>

          <p>Em 1990, em Perdizes/MG, colaborou com o Ministério Público na elaboração de Termos de Ajustamento de Conduta (TACs), quando uma empresa suíça, que havia despejado amônia em um córrego da cidade, firmou um acordo para doar um laboratório de química para a Escola Estadual de Perdizes.</p>

          <p class="closing-quote">Que esta iniciativa sirva como um legado de responsabilidade ambiental e cuidado com a comunidade.</p>
        </article>

        <aside class="source-note">
          <p class="eyebrow">Referência histórica pública</p>
          <h2>Campinápolis</h2>
          <p>A história oficial registra a origem em Vila Jatobá, a presença de área de 25 mil hectares pertencente à viúva Estephânia Brawn, a condição posterior de distrito de Nova Xavantina e a emancipação de Campinápolis em 1986.</p>
          <a class="button small" href="https://www.campinapolis.mt.leg.br/institucional/historia" target="_blank" rel="noopener noreferrer">Consultar a Câmara Municipal ↗</a>
          <p class="validation-note"><strong>Nota de desenvolvimento:</strong> informações biográficas específicas sobre a atuação profissional de Wolnei Divino Franco e o episódio de Perdizes/MG foram fornecidas pelos responsáveis pelo projeto e devem ser acompanhadas da documentação correspondente antes da publicação definitiva.</p>
        </aside>
      </div>
    </section>

    <section class="view" data-view="palestras" aria-labelledby="titulo-palestras" hidden>
      <div class="page-hero compact warm">
        <div class="shell">
          <p class="eyebrow">Educação ambiental</p>
          <h1 id="titulo-palestras">Palestras e materiais</h1>
          <p>Área preparada para receber gravações, materiais de apoio e conteúdos de interesse da comunidade.</p>
        </div>
      </div>

      <div class="shell section-stack">
        <div class="status-banner" role="status">
          <strong>Área em preparação.</strong>
          <span>Os conteúdos serão incluídos após validação do material, autoria, créditos e autorização para disponibilização.</span>
        </div>
        <section class="card-grid placeholder-grid" aria-label="Estrutura prevista para palestras">
          <article class="feature-card placeholder-card">
            <span class="tag">Previsto</span>
            <h2>Preservação e prevenção</h2>
            <p>Conteúdos introdutórios sobre proteção ambiental, prevenção de danos e responsabilidades compartilhadas.</p>
          </article>
          <article class="feature-card placeholder-card">
            <span class="tag">Previsto</span>
            <h2>Comunidade e território</h2>
            <p>Materiais voltados à realidade das comunidades rurais e aos desafios ambientais locais.</p>
          </article>
          <article class="feature-card placeholder-card">
            <span class="tag">Previsto</span>
            <h2>Fontes oficiais</h2>
            <p>Guias e referências para localizar informações confiáveis em órgãos ambientais e instituições públicas.</p>
          </article>
        </section>
      </div>
    </section>

    <section class="view" data-view="recursos" aria-labelledby="titulo-recursos" hidden>
      <div class="page-hero compact blue">
        <div class="shell">
          <p class="eyebrow">Acesso direto</p>
          <h1 id="titulo-recursos">Recursos e órgãos oficiais</h1>
          <p>Links institucionais para consulta de informações ambientais, orientações e serviços públicos.</p>
        </div>
      </div>

      <div class="shell section-stack">
        <section class="official-grid" aria-label="Órgãos oficiais">
          <a class="official-card" href="https://www.sema.mt.gov.br/" target="_blank" rel="noopener noreferrer">
            <span class="official-acronym">SEMA-MT</span>
            <h2>Secretaria de Estado de Meio Ambiente de Mato Grosso</h2>
            <p>Portal estadual de informações, serviços e políticas ambientais.</p>
            <span class="official-link">Acessar site oficial ↗</span>
          </a>
          <a class="official-card" href="https://mpmt.mp.br/" target="_blank" rel="noopener noreferrer">
            <span class="official-acronym">MPMT</span>
            <h2>Ministério Público do Estado de Mato Grosso</h2>
            <p>Portal institucional do Ministério Público de Mato Grosso.</p>
            <span class="official-link">Acessar site oficial ↗</span>
          </a>
          <a class="official-card" href="https://www.gov.br/ibama/pt-br" target="_blank" rel="noopener noreferrer">
            <span class="official-acronym">IBAMA</span>
            <h2>Instituto Brasileiro do Meio Ambiente e dos Recursos Naturais Renováveis</h2>
            <p>Informações federais sobre educação ambiental, fiscalização, recuperação e reparação de danos.</p>
            <span class="official-link">Acessar site oficial ↗</span>
          </a>
        </section>

        <section class="research-panel" aria-labelledby="fontes-titulo">
          <div>
            <p class="eyebrow">Fontes públicas consultadas</p>
            <h2 id="fontes-titulo">Transparência editorial</h2>
          </div>
          <div class="source-links">
            <a href="https://www.campinapolis.mt.leg.br/institucional/historia" target="_blank" rel="noopener noreferrer">História de Campinápolis — Câmara Municipal</a>
            <a href="https://www.ibge.gov.br/cidades-e-estados/mt/nova-xavantina.html" target="_blank" rel="noopener noreferrer">Nova Xavantina — IBGE</a>
            <a href="https://www.ibge.gov.br/cidades-e-estados/mt/campinapolis.html" target="_blank" rel="noopener noreferrer">Campinápolis — IBGE</a>
            <a href="https://www.gov.br/ibama/pt-br/assuntos/educacao-ambiental/educacao-ambiental-no-ibama" target="_blank" rel="noopener noreferrer">Educação Ambiental — Ibama</a>
            <a href="https://www.gov.br/ibama/pt-br/assuntos/processo-sancionador-ambiental/reparacao-de-danos" target="_blank" rel="noopener noreferrer">Reparação de danos — Ibama</a>
          </div>
        </section>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="shell footer-grid">
      <div>
        <strong>Projeto de Compensação Ambiental e Social - PA Safra</strong>
        <p>Nova Xavantina/MT</p>
      </div>
      <div class="footer-note">
        <p>Versão inicial de desenvolvimento. Conteúdo institucional e histórico sujeito à validação documental antes da publicação definitiva.</p>
        <p>© <span id="ano"></span> PA Safra</p>
      </div>
    </div>
  </footer>

  <script src="app.js" defer></script>
</body>
</html>
'@
$StylesCss = @'
:root {
  --forest-950: #0c2a24;
  --forest-900: #12352d;
  --forest-800: #173f35;
  --forest-700: #1f5949;
  --forest-600: #2b735d;
  --river-700: #245d69;
  --river-500: #4e8792;
  --sand-50: #fbf9f3;
  --sand-100: #f3eee2;
  --sand-200: #e7dcc6;
  --clay-500: #b46d3f;
  --ink-950: #18211e;
  --ink-800: #283832;
  --ink-600: #596963;
  --white: #fff;
  --line: rgba(16, 50, 42, .14);
  --shadow: 0 24px 70px rgba(20, 44, 37, .13);
  --radius-lg: 28px;
  --radius-md: 18px;
  --shell: min(1180px, calc(100% - 40px));
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  color: var(--ink-950);
  background: var(--sand-50);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
img { display: block; max-width: 100%; }
a { color: inherit; }
button, a { -webkit-tap-highlight-color: transparent; }

.shell { width: var(--shell); margin-inline: auto; }
.skip-link {
  position: fixed;
  left: 16px;
  top: -60px;
  z-index: 1000;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--white);
  color: var(--forest-950);
  box-shadow: var(--shadow);
}
.skip-link:focus { top: 16px; }

.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid rgba(255,255,255,.08);
  background: rgba(12, 42, 36, .96);
  color: var(--white);
  backdrop-filter: blur(14px);
}
.header-inner {
  min-height: 78px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  min-width: max-content;
}
.brand-mark {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255,255,255,.24);
  border-radius: 50%;
  color: #d8c69d;
  background: rgba(255,255,255,.06);
}
.brand-mark svg { width: 34px; height: 34px; }
.brand strong { display: block; font-size: 1rem; letter-spacing: .02em; }
.brand small { display: block; margin-top: -2px; color: rgba(255,255,255,.72); font-size: .72rem; }
.main-nav { display: flex; align-items: center; gap: 8px; }
.main-nav a {
  padding: 10px 12px;
  border-radius: 999px;
  text-decoration: none;
  color: rgba(255,255,255,.78);
  font-size: .92rem;
  font-weight: 650;
  transition: .2s ease;
}
.main-nav a:hover,
.main-nav a[aria-current="page"] { background: rgba(255,255,255,.1); color: var(--white); }
.menu-toggle {
  display: none;
  border: 1px solid rgba(255,255,255,.22);
  background: transparent;
  color: var(--white);
  padding: 9px 12px;
  border-radius: 10px;
  font: inherit;
}

.hero {
  position: relative;
  overflow: hidden;
  color: var(--white);
  background:
    radial-gradient(circle at 90% 12%, rgba(140, 185, 159, .22), transparent 31%),
    linear-gradient(135deg, var(--forest-950), var(--forest-700) 68%, #355f52);
}
.hero::after {
  content: "";
  position: absolute;
  inset: auto -8% -40% auto;
  width: 520px;
  height: 520px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 50%;
  box-shadow: 0 0 0 60px rgba(255,255,255,.018), 0 0 0 120px rgba(255,255,255,.012);
}
.hero-grid {
  position: relative;
  z-index: 2;
  min-height: 620px;
  padding: 72px 0 76px;
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(420px, .98fr);
  gap: 72px;
  align-items: center;
}
.eyebrow {
  margin: 0 0 12px;
  color: var(--clay-500);
  font-size: .78rem;
  font-weight: 800;
  letter-spacing: .16em;
  text-transform: uppercase;
}
.hero .eyebrow,
.page-hero .eyebrow { color: #d9c9a6; }
h1, h2, h3 { margin-top: 0; line-height: 1.08; letter-spacing: -.035em; }
h1 { font-size: clamp(2.6rem, 5vw, 5rem); }
h2 { font-size: clamp(1.8rem, 3vw, 3.2rem); }
h3 { font-size: 1.3rem; }
.hero h1 { max-width: 840px; margin-bottom: 22px; }
.hero-lead { max-width: 720px; margin: 0; color: rgba(255,255,255,.78); font-size: clamp(1.08rem, 1.65vw, 1.28rem); }
.hero-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 32px; }
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 18px;
  border: 1px solid var(--forest-800);
  border-radius: 999px;
  text-decoration: none;
  font-weight: 800;
  transition: transform .2s ease, background .2s ease, border .2s ease;
}
.button:hover { transform: translateY(-1px); }
.button.primary { background: #e2d2ae; border-color: #e2d2ae; color: var(--forest-950); }
.button.ghost { border-color: rgba(255,255,255,.32); color: var(--white); background: rgba(255,255,255,.05); }
.button.small { min-height: 42px; padding-inline: 15px; font-size: .9rem; background: var(--forest-800); color: var(--white); }
.community-note { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 34px; }
.community-note span { padding: 7px 10px; border: 1px solid rgba(255,255,255,.15); border-radius: 999px; color: rgba(255,255,255,.72); font-size: .78rem; }

.hero-media {
  position: relative;
  min-height: 470px;
}
.photo { margin: 0; overflow: hidden; border-radius: var(--radius-lg); box-shadow: 0 30px 80px rgba(0,0,0,.28); background: #102f28; }
.photo img { width: 100%; height: 100%; object-fit: cover; }
.photo figcaption, .legacy-photo figcaption { padding: 10px 12px; background: rgba(9, 28, 24, .92); color: rgba(255,255,255,.72); font-size: .74rem; line-height: 1.45; }
.photo figcaption a, .legacy-photo figcaption a { color: var(--white); }
.photo-main { position: absolute; inset: 0 54px 84px 0; }
.photo-secondary { position: absolute; width: 58%; right: 0; bottom: 0; border: 6px solid var(--forest-800); }
.photo-secondary img { aspect-ratio: 1.22; }

.section-stack { padding-block: 78px; display: grid; gap: 58px; }
.intro-band { display: grid; grid-template-columns: .85fr 1.15fr; gap: 64px; align-items: end; border-bottom: 1px solid var(--line); padding-bottom: 44px; }
.intro-band h2 { margin-bottom: 0; }
.intro-band > p { max-width: 720px; margin: 0; color: var(--ink-600); font-size: 1.05rem; }
.card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.feature-card { position: relative; min-height: 265px; padding: 28px; border: 1px solid var(--line); border-radius: var(--radius-md); background: rgba(255,255,255,.55); }
.feature-number { display: inline-flex; margin-bottom: 42px; color: var(--river-700); font-size: .78rem; font-weight: 900; letter-spacing: .14em; }
.feature-card p { margin-bottom: 0; color: var(--ink-600); }
.landscape-panel { overflow: hidden; display: grid; grid-template-columns: 1fr 1fr; min-height: 420px; border-radius: var(--radius-lg); background: var(--forest-900); color: var(--white); box-shadow: var(--shadow); }
.landscape-panel img { width: 100%; height: 100%; object-fit: cover; }
.landscape-copy { padding: clamp(34px, 5vw, 64px); align-self: center; }
.landscape-copy p:not(.eyebrow) { color: rgba(255,255,255,.74); }
.text-link { display: inline-block; margin-top: 18px; color: #e2d2ae; font-weight: 800; text-decoration: none; }
.text-link:hover { text-decoration: underline; }

.view[hidden] { display: none !important; }
.page-hero { padding: 76px 0; color: var(--white); background: linear-gradient(135deg, var(--forest-950), var(--forest-700)); }
.page-hero.compact { padding: 62px 0; }
.page-hero.warm { background: linear-gradient(135deg, #3e3326, #725a3d); }
.page-hero.blue { background: linear-gradient(135deg, #15343a, var(--river-700)); }
.page-hero h1 { margin-bottom: 14px; font-size: clamp(2.5rem, 5vw, 4.8rem); }
.page-hero p:not(.eyebrow) { max-width: 760px; margin-bottom: 0; color: rgba(255,255,255,.75); font-size: 1.06rem; }
.page-hero-grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 48px; align-items: center; }
.page-hero-grid img { width: 100%; max-height: 230px; object-fit: cover; border-radius: var(--radius-md); box-shadow: 0 18px 50px rgba(0,0,0,.25); }

.prose-layout { padding-block: 72px; display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(300px, .65fr); gap: 32px; align-items: start; }
.prose-card { padding: clamp(30px, 4vw, 56px); border: 1px solid var(--line); border-radius: var(--radius-lg); background: var(--white); box-shadow: var(--shadow); font-size: 1.08rem; }
.prose-card p { margin: 0 0 1.4em; }
.prose-card p:last-child { margin-bottom: 0; }
.prose-card.emphasized { border-top: 5px solid #b99865; }
.closing-quote { padding-top: 24px; border-top: 1px solid var(--line); font-weight: 800; color: var(--forest-800); font-size: 1.2rem; }
.side-panel, .source-note { padding: 28px; border-radius: var(--radius-md); background: var(--sand-100); border: 1px solid var(--sand-200); }
.side-panel h2, .source-note h2 { font-size: 1.7rem; }
.plain-list { margin: 22px 0 0; padding: 0; list-style: none; }
.plain-list li { position: relative; padding: 12px 0 12px 24px; border-top: 1px solid rgba(25,55,46,.1); }
.plain-list li::before { content: ""; position: absolute; left: 0; top: 22px; width: 8px; height: 8px; border-radius: 50%; background: var(--forest-600); }

.legacy-hero { padding: 64px 0 0; background: linear-gradient(135deg, #192b27, #3f524a); }
.legacy-grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: 64px; align-items: end; }
.legacy-grid h1 { margin-bottom: 58px; }
.legacy-photo { margin: 0; justify-self: end; max-width: 580px; overflow: hidden; border-radius: var(--radius-lg) var(--radius-lg) 0 0; background: #101816; box-shadow: 0 -15px 50px rgba(0,0,0,.22); }
.legacy-photo img { width: 100%; max-height: 420px; object-fit: cover; filter: contrast(1.03); }
.validation-note { margin-top: 24px; padding-top: 22px; border-top: 1px solid rgba(19,59,49,.14); color: var(--ink-600); font-size: .86rem; }

.status-banner { display: flex; gap: 12px 22px; flex-wrap: wrap; padding: 20px 24px; border: 1px solid #d8c7a2; border-radius: var(--radius-md); background: #fff8e8; color: #4e4028; }
.placeholder-card { min-height: 220px; }
.tag { display: inline-flex; margin-bottom: 28px; padding: 6px 9px; border-radius: 999px; background: var(--sand-100); color: var(--forest-800); font-size: .72rem; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }

.official-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.official-card { min-height: 330px; padding: 30px; display: flex; flex-direction: column; border-radius: var(--radius-md); background: var(--white); border: 1px solid var(--line); text-decoration: none; box-shadow: 0 14px 40px rgba(20,44,37,.06); transition: transform .2s ease, box-shadow .2s ease; }
.official-card:hover { transform: translateY(-3px); box-shadow: var(--shadow); }
.official-acronym { margin-bottom: 42px; color: var(--river-700); font-weight: 900; letter-spacing: .13em; }
.official-card h2 { font-size: 1.55rem; }
.official-card p { color: var(--ink-600); }
.official-link { margin-top: auto; padding-top: 22px; color: var(--forest-700); font-weight: 850; }
.research-panel { padding: clamp(28px, 5vw, 54px); display: grid; grid-template-columns: .8fr 1.2fr; gap: 48px; border-radius: var(--radius-lg); background: var(--forest-900); color: var(--white); }
.research-panel h2 { margin-bottom: 0; }
.source-links { display: grid; }
.source-links a { padding: 15px 0; border-bottom: 1px solid rgba(255,255,255,.12); color: rgba(255,255,255,.84); text-decoration: none; }
.source-links a:hover { color: var(--white); }

.site-footer { padding: 34px 0; border-top: 1px solid var(--line); background: #f0eadf; }
.footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; align-items: start; }
.site-footer p { margin: 4px 0 0; color: var(--ink-600); font-size: .88rem; }
.footer-note { justify-self: end; max-width: 610px; }

@media (max-width: 980px) {
  :root { --shell: min(100% - 28px, 1180px); }
  .menu-toggle { display: inline-flex; }
  .main-nav {
    position: absolute;
    left: 14px;
    right: 14px;
    top: calc(100% + 8px);
    display: none;
    flex-direction: column;
    align-items: stretch;
    padding: 10px;
    border-radius: 14px;
    background: var(--forest-950);
    box-shadow: var(--shadow);
  }
  .main-nav.is-open { display: flex; }
  .main-nav a { border-radius: 9px; }
  .hero-grid { min-height: auto; grid-template-columns: 1fr; gap: 38px; padding: 58px 0 68px; }
  .hero-media { min-height: 390px; }
  .intro-band, .landscape-panel, .page-hero-grid, .legacy-grid, .prose-layout, .research-panel { grid-template-columns: 1fr; }
  .legacy-grid { gap: 20px; }
  .legacy-grid h1 { margin-bottom: 24px; }
  .legacy-photo { justify-self: stretch; max-width: none; }
  .card-grid, .official-grid { grid-template-columns: 1fr; }
  .feature-card { min-height: auto; }
  .feature-number { margin-bottom: 28px; }
  .landscape-panel img { max-height: 420px; }
  .page-hero-grid img { max-width: 520px; }
}

@media (max-width: 620px) {
  .header-inner { min-height: 70px; }
  .brand small { display: none; }
  h1 { font-size: clamp(2.35rem, 12vw, 3.6rem); }
  .hero-media { min-height: 310px; }
  .photo-main { inset: 0 38px 62px 0; }
  .photo-secondary { width: 60%; }
  .section-stack, .prose-layout { padding-block: 50px; }
  .intro-band { gap: 24px; }
  .landscape-copy, .prose-card { padding: 26px; }
  .footer-grid { grid-template-columns: 1fr; }
  .footer-note { justify-self: start; }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { transition: none !important; }
}
'@
$AppJs = @'
(() => {
  'use strict';

  const validViews = new Set(['inicio', 'sobre', 'legado', 'palestras', 'recursos']);
  const views = [...document.querySelectorAll('[data-view]')];
  const navLinks = [...document.querySelectorAll('[data-nav]')];
  const menu = document.getElementById('menu-principal');
  const menuToggle = document.querySelector('.menu-toggle');
  const year = document.getElementById('ano');

  function resolveView() {
    const hash = window.location.hash.replace('#', '').trim().toLowerCase();
    return validViews.has(hash) ? hash : 'inicio';
  }

  function renderView({ focus = false } = {}) {
    const selected = resolveView();

    views.forEach((view) => {
      const active = view.dataset.view === selected;
      view.hidden = !active;
      view.classList.toggle('is-active', active);
    });

    navLinks.forEach((link) => {
      if (link.dataset.nav === selected) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    menu?.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');

    window.scrollTo({ top: 0, behavior: 'auto' });
    if (focus) {
      document.getElementById('conteudo')?.focus({ preventScroll: true });
    }
  }

  menuToggle?.addEventListener('click', () => {
    const open = menu?.classList.toggle('is-open') ?? false;
    menuToggle.setAttribute('aria-expanded', String(open));
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      menu?.classList.remove('is-open');
      menuToggle?.setAttribute('aria-expanded', 'false');
    });
  });

  window.addEventListener('hashchange', () => renderView({ focus: true }));
  year.textContent = String(new Date().getFullYear());
  renderView();
})();
'@
$IconSvg = @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="18" fill="#173f35"/>
  <path d="M32 10c8 8 12 16 12 25 0 10-6 18-12 24-6-6-12-14-12-24 0-9 4-17 12-25Z" fill="#d8c69d" fill-opacity=".18"/>
  <path d="M32 15c-5 7-7 14-6 21m6-21c5 7 7 14 6 21M19 42c7-3 19-3 26 0M22 49c6-2 14-2 20 0" fill="none" stroke="#d8c69d" stroke-width="3" stroke-linecap="round"/>
</svg>
'@
$PackageJson = @'
{
  "name": "pa-safra-compensacao-ambiental-social",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 4173 --strictPort",
    "build": "vite build",
    "check": "node tools/check.mjs"
  },
  "devDependencies": {
    "vite": "^7.0.0"
  }
}
'@
$CheckMjs = @'
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'index.html',
  'styles.css',
  'app.js',
  'assets/icons/pa-safra.svg',
  'assets/img/rio-nova-xavantina.jpg',
  'assets/img/registro-historico.jpg',
  'assets/img/atrativos-nova-xavantina.jpg'
];

const errors = [];
for (const rel of required) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) errors.push(`Arquivo ausente: ${rel}`);
}

const htmlPath = path.join(root, 'index.html');
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const mustContain = [
    'Projeto de Compensação Ambiental e Social - PA Safra',
    'Sobre este site',
    'Memória e legado',
    'Vila do Banco Safra',
    'https://www.sema.mt.gov.br/',
    'https://mpmt.mp.br/',
    'https://www.gov.br/ibama/pt-br'
  ];
  for (const token of mustContain) {
    if (!html.includes(token)) errors.push(`Conteúdo obrigatório ausente: ${token}`);
  }
}

if (errors.length) {
  console.error('=== PA SAFRA / CHECK ===');
  for (const error of errors) console.error(`ERRO: ${error}`);
  process.exit(1);
}

console.log('=== PA SAFRA / CHECK ===');
console.log('RESULTADO: OK');
'@
$WorkflowYaml = @'
name: validate

on:
  push:
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: node --check app.js
      - run: npm run build
'@
$ReadmeMd = @'
# Projeto de Compensação Ambiental e Social - PA Safra

Portal de desenvolvimento do Projeto de Compensação Ambiental e Social - PA Safra, com foco em Nova Xavantina/MT e nas comunidades de Alvorada, Córrego do Jatobá e Vila do Banco Safra.

## Desenvolvimento local

Execute `INICIAR-PA-SAFRA.ps1` ou use o atalho `PA Safra - Desenvolvimento` criado na Área de Trabalho.

Endereço local:

`http://127.0.0.1:4173/`

## Validação

- `npm run check`
- `node --check app.js`
- `npm run build`

## GitHub

Repositório previsto:

`Seshomaru1984/pa-safra-compensacao-ambiental-social`

O script inicial cria o repositório como privado por padrão e publica o primeiro commit usando GitHub CLI (`gh`).
'@
$GitIgnore = @'
node_modules/
dist/
.vscode/
.DS_Store
Thumbs.db
npm-debug.log*
'@
$MarkerContent = @'
PA SAFRA
Projeto de Compensação Ambiental e Social
Gerenciado por INICIAR-PA-SAFRA.ps1
'@
$Image1Base64 = @'
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
'@
$Image2Base64 = @'
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
'@
$Image3Base64 = @'
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
'@

  Write-Utf8File (Join-Path $Root "index.html") $IndexHtml
  Write-Utf8File (Join-Path $Root "styles.css") $StylesCss
  Write-Utf8File (Join-Path $Root "app.js") $AppJs
  Write-Utf8File (Join-Path $Root "assets\icons\pa-safra.svg") $IconSvg
  Write-Utf8File (Join-Path $Root "package.json") $PackageJson
  Write-Utf8File (Join-Path $Root "tools\check.mjs") $CheckMjs
  Write-Utf8File (Join-Path $Root ".github\workflows\validate.yml") $WorkflowYaml
  Write-Utf8File (Join-Path $Root "README.md") $ReadmeMd
  Write-Utf8File (Join-Path $Root ".gitignore") $GitIgnore
  Write-Utf8File $MarkerPath $MarkerContent
  Write-Base64File (Join-Path $Root "assets\img\rio-nova-xavantina.jpg") $Image1Base64
  Write-Base64File (Join-Path $Root "assets\img\registro-historico.jpg") $Image2Base64
  Write-Base64File (Join-Path $Root "assets\img\atrativos-nova-xavantina.jpg") $Image3Base64

  Write-Host "Arquivos base criados." -ForegroundColor Green
}
else {
  Write-Host ""
  Write-Host "Projeto existente detectado. Arquivos do site nao serao reescritos." -ForegroundColor DarkGray
}

$currentScript = [IO.Path]::GetFullPath($MyInvocation.MyCommand.Path)
if ($currentScript -ne [IO.Path]::GetFullPath($CanonicalLauncher)) {
  Copy-Item -LiteralPath $currentScript -Destination $CanonicalLauncher -Force
}

Create-DesktopShortcut $Root $CanonicalLauncher

Write-Step "Verificando ferramentas de desenvolvimento"
$Git = Ensure-Command -Name "git.exe" -WingetId "Git.Git" -Label "Git"
$Node = Ensure-Command -Name "node.exe" -WingetId "OpenJS.NodeJS.LTS" -Label "Node.js LTS"
$Npm = Ensure-Command -Name "npm.cmd" -WingetId "OpenJS.NodeJS.LTS" -Label "npm"
$Gh = Ensure-Command -Name "gh.exe" -WingetId "GitHub.cli" -Label "GitHub CLI"

Write-Host "Git:  $Git"
Write-Host "Node: $Node"
Write-Host "npm:  $Npm"
Write-Host "gh:   $Gh"

Push-Location $Root
try {
  if (-not (Test-Path (Join-Path $Root "node_modules"))) {
    Write-Step "Instalando dependencias npm"
    Invoke-External $Npm @("install") "npm install"
  }

  Write-Step "Gate de qualidade"
  Invoke-External $Npm @("run", "check") "npm run check"
  Invoke-External $Node @("--check", "app.js") "node --check app.js"
  Invoke-External $Npm @("run", "build") "npm run build"
}
finally {
  Pop-Location
}

$originExists = $false
if (Test-Path (Join-Path $Root ".git")) {
  Push-Location $Root
  try {
    & $Git remote get-url origin *> $null
    $originExists = ($LASTEXITCODE -eq 0)
  }
  finally {
    Pop-Location
  }
}

if ($Bootstrap -or $Publish -or -not $originExists) {
  Write-Step "Git e GitHub"
  Publish-GitHub -ProjectRoot $Root -Git $Git -Gh $Gh
}

if ($NoStart) {
  Write-Host ""
  Write-Host "Concluido sem iniciar o servidor (-NoStart)." -ForegroundColor Green
  exit 0
}

Write-Step "Iniciando site local"
if (Test-LocalSite) {
  Write-Host "O servidor ja esta ativo em $LocalUrl" -ForegroundColor Green
}
else {
  Start-DevWindow $Root

  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-LocalSite) {
      $ready = $true
      break
    }
  }

  if (-not $ready) {
    Write-Host "O Vite foi iniciado, mas a URL ainda nao respondeu dentro de 30 segundos." -ForegroundColor Yellow
    Write-Host "Confira a janela 'PA Safra - Vite :4173'."
  }
}

Start-Process $LocalUrl | Out-Null

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " PA SAFRA PRONTO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Pasta:  $Root"
Write-Host "Local:  $LocalUrl"
Write-Host "GitHub: https://github.com/$RepoFullName"
Write-Host ""
Write-Host "Nas proximas vezes, use o atalho 'PA Safra - Desenvolvimento' na Area de Trabalho."
