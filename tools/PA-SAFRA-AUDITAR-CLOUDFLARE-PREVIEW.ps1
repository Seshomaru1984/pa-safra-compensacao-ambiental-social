$ErrorActionPreference = 'Stop'

$RepositorioEsperado = 'https://github.com/Seshomaru1984/pa-safra-compensacao-ambiental-social.git'
$ProjetoPages = 'pa-safra-compensacao-ambiental-social'

function Invoke-WranglerJson {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & npx.cmd --yes wrangler@latest @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    if ($exitCode -ne 0) {
        $text = ($output | Out-String).Trim()
        throw "$Label falhou (exit $exitCode).`n$text"
    }

    $text = ($output | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($text)) {
        throw "$Label retornou resposta vazia."
    }

    try {
        return $text | ConvertFrom-Json
    }
    catch {
        throw "$Label nao retornou JSON valido.`n$text"
    }
}

function Invoke-WranglerText {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & npx.cmd --yes wrangler@latest @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    $text = ($output | Out-String).Trim()
    if ($exitCode -ne 0) {
        throw "$Label falhou (exit $exitCode).`n$text"
    }

    return $text
}

$remote = (& git.exe remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0 -or $remote -ne $RepositorioEsperado) {
    throw 'REMOTE NAO CORRESPONDE AO REPOSITORIO AUTORIZADO DO PA SAFRA.'
}

$branch = (& git.exe branch --show-current).Trim()
$head = (& git.exe rev-parse HEAD).Trim()
$status = @(& git.exe status --short)

Write-Host 'PA SAFRA - AUDITORIA CLOUDFLARE SOMENTE LEITURA' -ForegroundColor Cyan
Write-Host "Repositorio: OK - $RepositorioEsperado" -ForegroundColor Green
Write-Host "Branch: $branch"
Write-Host "HEAD: $head"

if ($status.Count -eq 0) {
    Write-Host 'Worktree: limpo' -ForegroundColor Green
}
else {
    Write-Host 'Worktree: possui alteracoes locais:' -ForegroundColor Yellow
    $status | ForEach-Object { Write-Host "  $_" }
}

$whoami = Invoke-WranglerJson -Arguments @('whoami', '--json') -Label 'wrangler whoami'
if (-not $whoami.loggedIn) {
    throw 'Wrangler nao esta autenticado.'
}
Write-Host "Wrangler: autenticado ($($whoami.authType))" -ForegroundColor Green

$projects = @(Invoke-WranglerJson -Arguments @('pages', 'project', 'list', '--json') -Label 'pages project list')
$project = $projects | Where-Object {
    $_.PSObject.Properties['Project Name'] -and $_.'Project Name' -eq $ProjetoPages
} | Select-Object -First 1

if (-not $project) {
    throw "Projeto Pages esperado nao encontrado: $ProjetoPages"
}
Write-Host "Pages: OK - $ProjetoPages" -ForegroundColor Green
Write-Host "Dominio Pages: $($project.'Project Domains')"

$databases = @(Invoke-WranglerJson -Arguments @('d1', 'list', '--json') -Label 'd1 list')
Write-Host ''
Write-Host "D1 databases encontrados: $($databases.Count)" -ForegroundColor Cyan
foreach ($database in $databases) {
    $name = if ($database.name) { $database.name } else { '(sem nome)' }
    $uuid = if ($database.uuid) { $database.uuid } else { '(sem id)' }
    Write-Host "  - $name | $uuid"
}

# Mantido apenas como verificação de legado da A17. A A18 não usa Workers KV.
$namespaces = @(Invoke-WranglerJson -Arguments @('kv', 'namespace', 'list') -Label 'kv namespace list')
Write-Host ''
Write-Host "KV namespaces encontrados (legado A17; esperado 0): $($namespaces.Count)" -ForegroundColor Cyan
foreach ($namespace in $namespaces) {
    $title = if ($namespace.title) { $namespace.title } else { '(sem titulo)' }
    Write-Host "  - $title"
}

$previewSecrets = Invoke-WranglerText -Arguments @(
    'pages', 'secret', 'list',
    '--project-name', $ProjetoPages,
    '--env', 'preview'
) -Label 'pages secret list preview'

Write-Host ''
Write-Host 'Secrets de preview (somente nomes; Wrangler nao exibe valores):' -ForegroundColor Cyan
if ([string]::IsNullOrWhiteSpace($previewSecrets)) {
    Write-Host '  Nenhuma saida retornada.'
}
else {
    Write-Host $previewSecrets
}

$previewDeployments = @(Invoke-WranglerJson -Arguments @(
    'pages', 'deployment', 'list',
    '--project-name', $ProjetoPages,
    '--environment', 'preview',
    '--json'
) -Label 'pages deployment list preview')

Write-Host ''
Write-Host "Deploys de preview encontrados: $($previewDeployments.Count)"
$previewDeployments | Select-Object -First 5 | ForEach-Object {
    Write-Host "  - $($_.Branch) | $($_.Source) | $($_.Deployment)"
}

$productionDeployments = @(Invoke-WranglerJson -Arguments @(
    'pages', 'deployment', 'list',
    '--project-name', $ProjetoPages,
    '--environment', 'production',
    '--json'
) -Label 'pages deployment list production')

Write-Host ''
Write-Host "Deploys de producao encontrados: $($productionDeployments.Count)"
$productionDeployments | Select-Object -First 3 | ForEach-Object {
    Write-Host "  - $($_.Branch) | $($_.Source) | $($_.Deployment)"
}

Write-Host ''
Write-Host 'AUDITORIA CONCLUIDA. NENHUMA OPERACAO DE ESCRITA FOI EXECUTADA.' -ForegroundColor Green
