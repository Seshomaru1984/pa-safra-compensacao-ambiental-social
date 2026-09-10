<#
PA SAFRA - BUILD LOCAL E ARQUIVAMENTO DE PACOTE

Fluxo padrao para builds executados em um PC Windows:
1. valida que a pasta e o repositorio sao exclusivamente do PA Safra;
2. exige worktree limpo;
3. executa npm ci, npm run check, node --check app.js, npm run build e npm run smoke;
4. cria uma pasta de pacote dentro do proprio projeto em _PACOTES-LOCAL;
5. gera inicialmente o ZIP em Downloads;
6. calcula SHA-256;
7. move o ZIP de Downloads para a pasta de pacote criada no projeto;
8. grava BUILD-INFO.txt e SHA256.txt;
9. nao faz commit, push, merge, reset ou alteracao de branch.

A pasta _PACOTES-LOCAL e ignorada pelo Git.
#>

param(
    [switch]$NaoAbrirPasta
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ExpectedRepo = "Seshomaru1984/pa-safra-compensacao-ambiental-social"
$ForbiddenRepo = "Seshomaru1984/SIGUEG"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$Downloads = Join-Path $env:USERPROFILE "Downloads"
$ArtifactRoot = Join-Path $ProjectRoot "_PACOTES-LOCAL"
$Timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"

function Fail {
    param([string]$Message)
    Write-Host ""
    Write-Host "BUILD BLOQUEADO" -ForegroundColor Red
    Write-Host $Message -ForegroundColor Yellow
    exit 1
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory=$true)][string]$Exe,
        [Parameter(Mandatory=$true)][string[]]$Args,
        [Parameter(Mandatory=$true)][string]$Label
    )

    Write-Host "==> $Label" -ForegroundColor Cyan
    & $Exe @Args
    $code = $LASTEXITCODE

    if ($code -ne 0) {
        Fail "$Label falhou com exit code $code."
    }
}

$gitCmd = Get-Command git.exe -ErrorAction SilentlyContinue
if (-not $gitCmd) { $gitCmd = Get-Command git -ErrorAction SilentlyContinue }
if (-not $gitCmd) { Fail "Git nao encontrado." }

$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCmd) { Fail "npm.cmd nao encontrado." }

$nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCmd) { $nodeCmd = Get-Command node -ErrorAction SilentlyContinue }
if (-not $nodeCmd) { Fail "Node.js nao encontrado." }

$Git = $gitCmd.Source
$Npm = $npmCmd.Source
$Node = $nodeCmd.Source

if (-not (Test-Path -LiteralPath $ProjectRoot -PathType Container)) {
    Fail "Pasta do projeto nao encontrada: $ProjectRoot"
}

if (-not (Test-Path -LiteralPath $Downloads -PathType Container)) {
    Fail "Pasta Downloads nao encontrada: $Downloads"
}

if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot ".git") -PathType Container)) {
    Fail "A pasta do script nao pertence a um repositorio Git: $ProjectRoot"
}

$pkgPath = Join-Path $ProjectRoot "package.json"
if (-not (Test-Path -LiteralPath $pkgPath -PathType Leaf)) {
    Fail "package.json ausente em $ProjectRoot"
}

$pkg = Get-Content -LiteralPath $pkgPath -Raw | ConvertFrom-Json
if ($pkg.name -ne "pa-safra-compensacao-ambiental-social") {
    Fail "package.json nao corresponde ao PA Safra."
}

$originLines = @(& $Git -C $ProjectRoot remote get-url origin)
if ($LASTEXITCODE -ne 0 -or $originLines.Count -eq 0) {
    Fail "Nao foi possivel validar o remote origin."
}

$origin = ($originLines[0]).Trim()

if ($origin -match '(?i)(github\.com[/:])Seshomaru1984/SIGUEG(\.git)?$' -or $origin -match '(?i)/SIGUEG(\.git)?$') {
    Fail "REPOSITORIO PROIBIDO DETECTADO: $origin"
}

$allowedPattern = '(?i)(github\.com[/:])Seshomaru1984/pa-safra-compensacao-ambiental-social(\.git)?$'
if ($origin -notmatch $allowedPattern) {
    Fail "Remote nao autorizado: $origin"
}

Push-Location $ProjectRoot
try {
    $statusBefore = @(& $Git status --porcelain)
    if ($LASTEXITCODE -ne 0) {
        Fail "Falha ao consultar o worktree."
    }

    if ($statusBefore.Count -gt 0) {
        Fail "Worktree nao esta limpo. Commit/stash suas alteracoes antes de gerar um pacote."
    }

    $branch = (& $Git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($branch)) {
        Fail "Nao foi possivel identificar a branch atual."
    }

    $head = (& $Git rev-parse HEAD).Trim().ToLowerInvariant()
    if ($LASTEXITCODE -ne 0 -or $head.Length -lt 7) {
        Fail "Nao foi possivel identificar o HEAD atual."
    }

    $shortSha = $head.Substring(0, 12)
    $safeBranch = ($branch -replace '[^A-Za-z0-9._-]+','-').Trim('-')

    $PackageDir = Join-Path $ArtifactRoot "$Timestamp-$safeBranch-$shortSha"
    $ZipName = "PA-SAFRA-$Timestamp-$safeBranch-$shortSha-DIST.zip"
    $ZipInDownloads = Join-Path $Downloads $ZipName
    $ZipFinal = Join-Path $PackageDir $ZipName

    New-Item -ItemType Directory -Path $PackageDir -Force | Out-Null

    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " PA SAFRA - BUILD LOCAL" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "Projeto: $ProjectRoot"
    Write-Host "Branch:  $branch"
    Write-Host "HEAD:    $head"
    Write-Host "Pacote:  $PackageDir"
    Write-Host ""

    Invoke-Checked $Npm @("ci","--no-audit","--no-fund") "Instalar dependencias exatas (npm ci)"
    Invoke-Checked $Npm @("run","check") "Validar estrutura editorial"
    Invoke-Checked $Node @("--check","app.js") "Validar JavaScript"
    Invoke-Checked $Npm @("run","build") "Gerar dist"
    Invoke-Checked $Npm @("run","smoke") "Executar smoke test do build"

    $dist = Join-Path $ProjectRoot "dist"
    $index = Join-Path $dist "index.html"

    if (-not (Test-Path -LiteralPath $index -PathType Leaf)) {
        Fail "Build terminou sem dist/index.html."
    }

    if (Test-Path -LiteralPath $ZipInDownloads) {
        Remove-Item -LiteralPath $ZipInDownloads -Force
    }

    Write-Host "==> Criar ZIP inicialmente em Downloads" -ForegroundColor Cyan
    Compress-Archive -Path (Join-Path $dist "*") -DestinationPath $ZipInDownloads -CompressionLevel Optimal

    if (-not (Test-Path -LiteralPath $ZipInDownloads -PathType Leaf)) {
        Fail "ZIP nao foi criado em Downloads."
    }

    $zipHash = (Get-FileHash -LiteralPath $ZipInDownloads -Algorithm SHA256).Hash.ToLowerInvariant()
    $zipBytes = (Get-Item -LiteralPath $ZipInDownloads).Length

    Write-Host "==> Mover ZIP de Downloads para a pasta do projeto" -ForegroundColor Cyan
    Move-Item -LiteralPath $ZipInDownloads -Destination $ZipFinal -Force

    if (-not (Test-Path -LiteralPath $ZipFinal -PathType Leaf)) {
        Fail "ZIP nao foi encontrado no destino final."
    }

    $hashAfterMove = (Get-FileHash -LiteralPath $ZipFinal -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($hashAfterMove -ne $zipHash) {
        Fail "SHA-256 mudou durante a movimentacao do ZIP."
    }

    $buildInfo = @"
PA SAFRA - BUILD LOCAL VALIDADO
===============================
DATA: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
PROJETO: $ProjectRoot
REPOSITORIO: $ExpectedRepo
ORIGIN: $origin
BRANCH: $branch
HEAD: $head
NODE: $(& $Node --version)
NPM: $(& $Npm --version)
ZIP: $ZipName
ZIP BYTES: $zipBytes
ZIP SHA-256: $zipHash

GATES:
- npm ci: OK
- npm run check: OK
- node --check app.js: OK
- npm run build: OK
- npm run smoke: OK
- dist/index.html: OK
- ZIP criado em Downloads: OK
- ZIP movido para _PACOTES-LOCAL: OK
- SHA-256 antes/depois da movimentacao: OK

Este pacote e uma saida de build. Nao substitui os arquivos-fonte do repositorio.
"@

    Set-Content -LiteralPath (Join-Path $PackageDir "BUILD-INFO.txt") -Value $buildInfo -Encoding UTF8
    Set-Content -LiteralPath (Join-Path $PackageDir "SHA256.txt") -Value "$zipHash *$ZipName" -Encoding ASCII

    $statusAfter = @(& $Git status --porcelain)
    if ($LASTEXITCODE -ne 0) {
        Fail "Falha ao consultar worktree apos o build."
    }

    if ($statusAfter.Count -gt 0) {
        Fail "O build deixou alteracoes versionadas no worktree. Verifique antes de continuar."
    }

    Write-Host ""
    Write-Host "BUILD CONCLUIDO COM SUCESSO" -ForegroundColor Green
    Write-Host "Pasta:   $PackageDir" -ForegroundColor Green
    Write-Host "ZIP:     $ZipFinal" -ForegroundColor Green
    Write-Host "SHA-256: $zipHash" -ForegroundColor Green
    Write-Host ""
    Write-Host "O ZIP foi criado em Downloads e movido automaticamente para a pasta do projeto." -ForegroundColor Green

    if (-not $NaoAbrirPasta) {
        Start-Process explorer.exe -ArgumentList $PackageDir | Out-Null
    }
}
finally {
    Pop-Location
}
