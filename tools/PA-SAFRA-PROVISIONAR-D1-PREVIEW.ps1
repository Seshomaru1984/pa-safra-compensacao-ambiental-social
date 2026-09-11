$ErrorActionPreference = 'Stop'

$RepositorioEsperado = 'https://github.com/Seshomaru1984/pa-safra-compensacao-ambiental-social.git'
$ProjetoPages = 'pa-safra-compensacao-ambiental-social'
$BancoEsperado = 'pa-safra-auth-preview'
$MigrationRelativa = 'migrations/0001_admin_login_rate.sql'

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

    $text = ($output | Out-String).Trim()
    if ($exitCode -ne 0) {
        throw "$Label falhou (exit $exitCode).`n$text"
    }
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

function Invoke-Wrangler {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & npx.cmd --yes wrangler@latest @Arguments
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    if ($exitCode -ne 0) {
        throw "$Label falhou (exit $exitCode)."
    }
}

$remote = (& git.exe remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0 -or $remote -ne $RepositorioEsperado) {
    throw 'REMOTE NAO CORRESPONDE AO REPOSITORIO AUTORIZADO DO PA SAFRA.'
}

$migration = Join-Path $PWD $MigrationRelativa
if (-not (Test-Path -LiteralPath $migration -PathType Leaf)) {
    throw "Migration ausente: $MigrationRelativa"
}

$whoami = Invoke-WranglerJson -Arguments @('whoami', '--json') -Label 'wrangler whoami'
if (-not $whoami.loggedIn) {
    throw 'Wrangler nao esta autenticado.'
}

$projects = @(Invoke-WranglerJson -Arguments @('pages', 'project', 'list', '--json') -Label 'pages project list')
$project = $projects | Where-Object {
    $_.PSObject.Properties['Project Name'] -and $_.'Project Name' -eq $ProjetoPages
} | Select-Object -First 1
if (-not $project) {
    throw "Projeto Pages esperado nao encontrado: $ProjetoPages"
}

Write-Host ''
Write-Host 'PA SAFRA - PROVISIONAMENTO D1 DE PREVIEW' -ForegroundColor Cyan
Write-Host "Repositorio: $RepositorioEsperado" -ForegroundColor Green
Write-Host "Projeto Pages: $ProjetoPages" -ForegroundColor Green
Write-Host "Banco D1 alvo: $BancoEsperado" -ForegroundColor Yellow
Write-Host 'Este script NAO altera main, dominio, DNS, secrets ou bindings do Pages.' -ForegroundColor Yellow
Write-Host ''

$databases = @(Invoke-WranglerJson -Arguments @('d1', 'list', '--json') -Label 'd1 list')
$matches = @($databases | Where-Object { $_.name -eq $BancoEsperado })

if ($matches.Count -gt 1) {
    throw "Mais de um D1 com o nome exato '$BancoEsperado' foi encontrado. Abortando para evitar alvo ambiguo."
}

if ($matches.Count -eq 0) {
    Write-Host "Criando D1 dedicado: $BancoEsperado" -ForegroundColor Cyan
    Invoke-Wrangler -Arguments @('d1', 'create', $BancoEsperado) -Label 'd1 create'
    $databases = @(Invoke-WranglerJson -Arguments @('d1', 'list', '--json') -Label 'd1 list apos create')
    $matches = @($databases | Where-Object { $_.name -eq $BancoEsperado })
    if ($matches.Count -ne 1) {
        throw 'O D1 foi solicitado, mas nao foi possivel identificar unicamente o banco criado.'
    }
}
else {
    Write-Host 'D1 dedicado ja existe; nenhuma duplicata sera criada.' -ForegroundColor Green
}

$db = $matches[0]
Write-Host "D1 confirmado: $($db.name) | $($db.uuid)" -ForegroundColor Green

Write-Host ''
Write-Host 'Aplicando schema idempotente no D1 remoto...' -ForegroundColor Cyan
Invoke-Wrangler -Arguments @(
    'd1', 'execute', $BancoEsperado,
    '--remote',
    "--file=$migration",
    '--yes'
) -Label 'd1 execute migration'

$check = Invoke-WranglerJson -Arguments @(
    'd1', 'execute', $BancoEsperado,
    '--remote',
    '--command=SELECT name FROM sqlite_schema WHERE type=''table'' AND name=''admin_login_rate'';',
    '--json'
) -Label 'validacao tabela admin_login_rate'

$serialized = $check | ConvertTo-Json -Depth 20 -Compress
if ($serialized -notmatch 'admin_login_rate') {
    throw 'Tabela admin_login_rate nao foi confirmada apos a migration.'
}

Write-Host ''
Write-Host 'D1 DE PREVIEW: PROVISIONADO E VALIDADO.' -ForegroundColor Green
Write-Host "Nome: $BancoEsperado"
Write-Host "ID: $($db.uuid)"
Write-Host ''
Write-Host 'PROXIMO PASSO: vincular este banco ao ambiente Preview do Pages com o nome PA_SAFRA_AUTH_DB.' -ForegroundColor Yellow
Write-Host 'Nao configure o binding em Production nesta etapa.' -ForegroundColor Yellow
