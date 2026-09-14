$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositorioEsperado = 'https://github.com/Seshomaru1984/pa-safra-compensacao-ambiental-social.git'
$ProjetoPages = 'pa-safra-compensacao-ambiental-social'
$BranchEsperada = 'ops/pa-v001-a19-preview-auth-e2e'
$DeploymentUrlEsperada = 'https://c0c272d4.pa-safra-compensacao-ambiental-social.pages.dev'
$Raiz = Join-Path $env:USERPROFILE 'PA SAFRA'
$LogDir = Join-Path $env:USERPROFILE 'Downloads\PA-SAFRA-LOGS'
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$TailOut = Join-Path $LogDir "PA-A19-DIAGNOSTICO-500-R4-$Timestamp.jsonl"
$TailErr = Join-Path $LogDir "PA-A19-DIAGNOSTICO-500-R4-$Timestamp.stderr.txt"
$ListErr = Join-Path $env:TEMP ("PA-A19-R4-LIST-$([guid]::NewGuid().ToString('N')).stderr.txt")

function Fail {
    param([Parameter(Mandatory = $true)][string]$Message)
    throw $Message
}

function Get-OptionalProperty {
    param(
        [AllowNull()][object]$Object,
        [Parameter(Mandatory = $true)][string]$Name
    )

    if ($null -eq $Object) { return $null }
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) { return $null }
    return $property.Value
}

function Get-DeploymentBranch {
    param([AllowNull()][object]$Deployment)

    $trigger = Get-OptionalProperty -Object $Deployment -Name 'deployment_trigger'
    $metadata = Get-OptionalProperty -Object $trigger -Name 'metadata'
    return [string](Get-OptionalProperty -Object $metadata -Name 'branch')
}

function Get-DeploymentUrl {
    param([AllowNull()][object]$Deployment)
    return [string](Get-OptionalProperty -Object $Deployment -Name 'url')
}

function Get-DeploymentCreatedOn {
    param([AllowNull()][object]$Deployment)

    $raw = [string](Get-OptionalProperty -Object $Deployment -Name 'created_on')
    $parsed = [datetime]::MinValue
    if (-not [string]::IsNullOrWhiteSpace($raw)) {
        [datetime]::TryParse($raw, [ref]$parsed) | Out-Null
    }
    return $parsed
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if (-not (Test-Path -LiteralPath (Join-Path $Raiz '.git') -PathType Container)) {
    Fail "CLONE LOCAL DO PA SAFRA NAO ENCONTRADO: $Raiz"
}

Set-Location $Raiz
$remoteLines = @(& git.exe remote get-url origin)
if ($LASTEXITCODE -ne 0 -or $remoteLines.Count -lt 1) {
    Fail 'NAO FOI POSSIVEL VALIDAR O REMOTE.'
}
$remote = [string]$remoteLines[0]
if ($remote.Trim() -ne $RepositorioEsperado) {
    Fail 'REMOTE NAO AUTORIZADO. DIAGNOSTICO ABORTADO.'
}

Write-Host ''
Write-Host 'PA SAFRA - A19 - DIAGNOSTICO R4 DO LOGIN HTTP 500' -ForegroundColor Cyan
Write-Host 'Modo: leitura/observabilidade; nenhuma configuracao sera alterada.' -ForegroundColor Cyan
Write-Host 'Repositorio autorizado: OK' -ForegroundColor Green

$previousPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    $previewLines = @(
        & npx.cmd --yes wrangler@4.131.1 pages deployment list `
            --project-name $ProjetoPages `
            --environment preview `
            --json 2>$ListErr
    )
    $previewCode = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $previousPreference
}

if ($previewCode -ne 0) {
    if (Test-Path -LiteralPath $ListErr) { Get-Content -LiteralPath $ListErr }
    Fail 'NAO FOI POSSIVEL LISTAR DEPLOYMENTS DE PREVIEW.'
}

$previewText = (($previewLines | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim()
if ([string]::IsNullOrWhiteSpace($previewText)) {
    Fail 'LISTA DE DEPLOYMENTS DE PREVIEW VEIO VAZIA.'
}

try {
    $deployments = @($previewText | ConvertFrom-Json)
}
catch {
    Write-Host $previewText
    Fail 'JSON DA LISTA DE DEPLOYMENTS NAO PODE SER INTERPRETADO.'
}

if ($deployments.Count -lt 1) {
    Fail 'NENHUM DEPLOYMENT DE PREVIEW FOI ENCONTRADO.'
}

$target = $deployments |
    Where-Object { (Get-DeploymentUrl $_).TrimEnd('/') -eq $DeploymentUrlEsperada.TrimEnd('/') } |
    Select-Object -First 1

if ($null -eq $target) {
    $target = $deployments |
        Where-Object { (Get-DeploymentBranch $_) -eq $BranchEsperada } |
        Sort-Object { Get-DeploymentCreatedOn $_ } -Descending |
        Select-Object -First 1
}

if ($null -eq $target) {
    $target = $deployments |
        Sort-Object { Get-DeploymentCreatedOn $_ } -Descending |
        Select-Object -First 1
}

$deploymentId = [string](Get-OptionalProperty -Object $target -Name 'id')
$deploymentUrl = (Get-DeploymentUrl $target).TrimEnd('/')
$deploymentBranch = Get-DeploymentBranch $target

if ([string]::IsNullOrWhiteSpace($deploymentId)) {
    Fail 'DEPLOYMENT SELECIONADO NAO POSSUI ID.'
}
if ([string]::IsNullOrWhiteSpace($deploymentUrl) -or $deploymentUrl -notmatch '^https://[A-Za-z0-9.-]+\.pages\.dev$') {
    Fail "DEPLOYMENT SELECIONADO NAO POSSUI URL PAGES.DEV VALIDA: $deploymentUrl"
}

Write-Host "Deployment ID selecionado: $deploymentId" -ForegroundColor Green
Write-Host "Deployment URL: $deploymentUrl" -ForegroundColor Green
if (-not [string]::IsNullOrWhiteSpace($deploymentBranch)) {
    Write-Host "Deployment branch: $deploymentBranch" -ForegroundColor Green
}

$argsTail = @(
    '--yes',
    'wrangler@4.131.1',
    'pages',
    'deployment',
    'tail',
    $deploymentId,
    '--project-name',
    $ProjetoPages,
    '--format',
    'json',
    '--status',
    'error'
)

Write-Host 'Abrindo tail pelo deployment ID exato...' -ForegroundColor Cyan
$tail = Start-Process `
    -FilePath 'npx.cmd' `
    -ArgumentList $argsTail `
    -WorkingDirectory $Raiz `
    -RedirectStandardOutput $TailOut `
    -RedirectStandardError $TailErr `
    -PassThru

$SenhaSegura = $null
$Ptr = [IntPtr]::Zero
$Senha = $null

try {
    Start-Sleep -Seconds 8
    $tail.Refresh()
    if ($tail.HasExited) {
        Write-Host ''
        Write-Host 'TAIL NAO INICIOU.' -ForegroundColor Red
        if (Test-Path -LiteralPath $TailOut) { Get-Content -LiteralPath $TailOut }
        if (Test-Path -LiteralPath $TailErr) { Get-Content -LiteralPath $TailErr }
        Fail 'TAIL CLOUDFLARE FALHOU ANTES DO LOGIN.'
    }

    Write-Host 'Tail ativo: OK' -ForegroundColor Green
    $SenhaSegura = Read-Host 'Senha do painel admin' -AsSecureString
    $Ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SenhaSegura)
    $Senha = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Ptr)

    $Body = @{ username = 'admin'; password = $Senha } | ConvertTo-Json -Compress

    Write-Host ''
    Write-Host 'Executando UMA tentativa de login no deployment exato...' -ForegroundColor Cyan
    $Http = $null
    try {
        $Resp = Invoke-WebRequest `
            -Uri "$deploymentUrl/api/admin/login" `
            -Method Post `
            -ContentType 'application/json' `
            -Headers @{ Origin = $deploymentUrl } `
            -Body $Body `
            -TimeoutSec 45 `
            -UseBasicParsing
        $Http = [int]$Resp.StatusCode
        Write-Host "HTTP LOGIN: $Http" -ForegroundColor Green
    }
    catch {
        if ($_.Exception.Response) {
            try { $Http = [int]$_.Exception.Response.StatusCode } catch { }
        }
        if ($null -ne $Http) {
            Write-Host "HTTP LOGIN: $Http" -ForegroundColor Yellow
        }
        else {
            Write-Host "LOGIN FALHOU SEM STATUS HTTP: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }

    Start-Sleep -Seconds 8
}
finally {
    $Senha = $null
    if ($Ptr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Ptr)
    }
    if ($null -ne $SenhaSegura) {
        try { $SenhaSegura.Dispose() } catch { }
    }
    if ($null -ne $tail) {
        $tail.Refresh()
        if (-not $tail.HasExited) {
            & taskkill.exe /PID $tail.Id /T /F 2>$null | Out-Null
        }
    }
    if (Test-Path -LiteralPath $ListErr) {
        Remove-Item -LiteralPath $ListErr -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

Write-Host ''
Write-Host '================ TAIL CLOUDFLARE ================' -ForegroundColor Cyan
if (Test-Path -LiteralPath $TailOut) {
    $tailText = Get-Content -LiteralPath $TailOut -Raw
    if (-not [string]::IsNullOrWhiteSpace($tailText)) {
        Write-Host $tailText
    }
    else {
        Write-Host '(sem eventos capturados)' -ForegroundColor Yellow
    }
}

Write-Host ''
Write-Host '================ STDERR TAIL ================' -ForegroundColor Cyan
if (Test-Path -LiteralPath $TailErr) {
    $tailErrText = Get-Content -LiteralPath $TailErr -Raw
    if (-not [string]::IsNullOrWhiteSpace($tailErrText)) {
        Write-Host $tailErrText
    }
    else {
        Write-Host '(vazio)'
    }
}

Write-Host ''
Write-Host 'DIAGNOSTICO R4 CONCLUIDO.' -ForegroundColor Green
Write-Host "JSONL: $TailOut" -ForegroundColor Cyan
Write-Host "STDERR: $TailErr" -ForegroundColor Cyan
