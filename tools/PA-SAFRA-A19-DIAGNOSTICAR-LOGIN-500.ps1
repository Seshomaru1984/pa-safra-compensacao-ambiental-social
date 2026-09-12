$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositorioEsperado = 'https://github.com/Seshomaru1984/pa-safra-compensacao-ambiental-social.git'
$ProjetoPages = 'pa-safra-compensacao-ambiental-social'
$PreviewUrl = 'https://ops-pa-v001-a19-preview-auth.pa-safra-compensacao-ambiental-social.pages.dev'
$Raiz = Join-Path $env:USERPROFILE 'PA SAFRA'
$LogDir = Join-Path $env:USERPROFILE 'Downloads\PA-SAFRA-LOGS'
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$TailOut = Join-Path $LogDir "PA-A19-DIAGNOSTICO-500-R3-$Timestamp.jsonl"
$TailErr = Join-Path $LogDir "PA-A19-DIAGNOSTICO-500-R3-$Timestamp.stderr.txt"

function Fail {
    param([Parameter(Mandatory = $true)][string]$Message)
    throw $Message
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
Write-Host 'PA SAFRA - A19 - DIAGNOSTICO DO LOGIN HTTP 500' -ForegroundColor Cyan
Write-Host 'Modo: leitura/observabilidade; nenhuma configuracao sera alterada.' -ForegroundColor Cyan
Write-Host 'Repositorio autorizado: OK' -ForegroundColor Green

# Confirma que existe Preview antes de abrir o tail. O tail e direcionado pelo ambiente,
# evitando depender de URL/ID de deployment que pode mudar de formato.
$previewList = @(& npx.cmd --yes wrangler@4.131.1 pages deployment list --project-name $ProjetoPages --environment preview --json 2>&1)
$previewListCode = $LASTEXITCODE
if ($previewListCode -ne 0) {
    $previewList | ForEach-Object { Write-Host ([string]$_) }
    Fail 'NAO FOI POSSIVEL LISTAR DEPLOYMENTS DE PREVIEW.'
}
$previewText = (($previewList | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim()
if ([string]::IsNullOrWhiteSpace($previewText) -or $previewText -eq '[]') {
    Fail 'NENHUM DEPLOYMENT DE PREVIEW FOI ENCONTRADO.'
}
Write-Host 'Preview existente: OK' -ForegroundColor Green

$argsTail = @(
    '--yes',
    'wrangler@4.131.1',
    'pages',
    'deployment',
    'tail',
    '--project-name',
    $ProjetoPages,
    '--environment',
    'preview',
    '--format',
    'json',
    '--status',
    'error'
)

Write-Host 'Abrindo tail do deployment Preview mais recente...' -ForegroundColor Cyan
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
    Write-Host 'Executando UMA tentativa de login...' -ForegroundColor Cyan
    $Http = $null
    try {
        $Resp = Invoke-WebRequest `
            -Uri "$PreviewUrl/api/admin/login" `
            -Method Post `
            -ContentType 'application/json' `
            -Headers @{ Origin = $PreviewUrl } `
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
    Start-Sleep -Seconds 2
}

Write-Host ''
Write-Host '================ TAIL CLOUDFLARE ================' -ForegroundColor Cyan
$tailText = ''
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
Write-Host 'DIAGNOSTICO CONCLUIDO.' -ForegroundColor Green
Write-Host "JSONL: $TailOut" -ForegroundColor Cyan
Write-Host "STDERR: $TailErr" -ForegroundColor Cyan
