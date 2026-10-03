$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositorioEsperado = 'https://github.com/Seshomaru1984/pa-safra-compensacao-ambiental-social.git'
$RepositorioApi = 'https://api.github.com/repos/Seshomaru1984/pa-safra-compensacao-ambiental-social'
$BranchEsperada = 'ops/pa-v001-a21-preview-content-write-e2e'
$ContentBranch = 'content/pa-v001-admin-preview'
$AppCheckpoint = '1624b9697cefa4c0a22654140871ecb308cf1de5'
$PreviewUrl = 'https://ada896a1.pa-safra-compensacao-ambiental-social.pages.dev'
$AdminUser = 'admin'
$Raiz = Join-Path $env:USERPROFILE 'PA SAFRA'
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogDir = Join-Path $env:USERPROFILE 'Downloads\PA-SAFRA-LOGS'
$LogPath = Join-Path $LogDir "PA-A21-R3-CONTENT-WRITE-$Timestamp.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Log {
    param([Parameter(Mandatory = $true)][string]$Message)
    $line = '[{0}] {1}' -f (Get-Date -Format 'HH:mm:ss'), $Message
    Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
    Write-Host $line
}

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$Label,
        [switch]$AllowFailure
    )

    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = @(& $Command @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previous
    }

    $text = (($output | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim()
    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "$Label falhou (exit $exitCode). $text"
    }

    return [pscustomobject]@{
        Success = ($exitCode -eq 0)
        ExitCode = $exitCode
        Text = $text
    }
}

function Convert-SecureToPlain {
    param([Parameter(Mandatory = $true)][Security.SecureString]$Secure)
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        if ($ptr -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        }
    }
}

function Get-PublicGitHubJsonFile {
    param([Parameter(Mandatory = $true)][string]$Path)

    $encodedRef = [uri]::EscapeDataString($ContentBranch)
    $uri = '{0}/contents/{1}?ref={2}' -f $RepositorioApi, $Path, $encodedRef
    $headers = @{
        Accept = 'application/vnd.github+json'
        'X-GitHub-Api-Version' = '2022-11-28'
        'User-Agent' = 'pa-safra-a21-r3-gate'
        'Cache-Control' = 'no-cache'
    }

    $file = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
    if ([string]::IsNullOrWhiteSpace([string]$file.sha) -or [string]::IsNullOrWhiteSpace([string]$file.content)) {
        throw 'GITHUB PUBLICO NAO RETORNOU SHA/CONTEUDO ESPERADOS.'
    }

    $raw = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(([string]$file.content -replace '\s','')))
    return [pscustomobject]@{
        Sha = [string]$file.sha
        Raw = $raw
        Json = ($raw | ConvertFrom-Json)
    }
}

function Invoke-AdminPut {
    param(
        [Parameter(Mandatory = $true)][string]$TargetUrl,
        [Parameter(Mandatory = $true)]$Session,
        [Parameter(Mandatory = $true)][string]$Resource,
        [Parameter(Mandatory = $true)]$Data
    )

    $payload = @{ resource = $Resource; data = $Data } | ConvertTo-Json -Depth 100 -Compress
    return Invoke-RestMethod `
        -Uri "$TargetUrl/api/admin/content" `
        -Method Put `
        -ContentType 'application/json' `
        -Body $payload `
        -Headers @{ Origin = $TargetUrl; 'Sec-Fetch-Site' = 'same-origin' } `
        -WebSession $Session
}

function Confirm-CanonicalRestore {
    param([Parameter(Mandatory = $true)]$Expected)

    $expectedCanonical = (@($Expected) | ConvertTo-Json -Depth 100 -Compress)
    for ($attempt = 1; $attempt -le 8; $attempt++) {
        Start-Sleep -Seconds 2
        $current = Get-PublicGitHubJsonFile -Path 'public/content/videos.json'
        $currentCanonical = (@($current.Json) | ConvertTo-Json -Depth 100 -Compress)
        if ($currentCanonical -ceq $expectedCanonical) {
            return $true
        }
    }
    return $false
}

$AdminPass1 = $null
$AdminPass2 = $null
$AdminPassword = $null
$AdminPassword2 = $null
$OriginalVideos = $null
$MutationApplied = $false
$RestoreConfirmed = $false
$AdminSession = $null

try {
    Write-Host ''
    Write-Host 'PA SAFRA - A21 R3 - CONTINUACAO POS-DEPLOY' -ForegroundColor Cyan
    Write-Host 'R1 e R2 estao invalidadas para novas execucoes deste gate.' -ForegroundColor Yellow
    Write-Host 'Esta rotina nao repete build, PAT, secret nem deploy.' -ForegroundColor Cyan
    Write-Host ''

    if (-not (Test-Path -LiteralPath (Join-Path $Raiz '.git') -PathType Container)) {
        throw "CLONE LOCAL DO PA SAFRA NAO ENCONTRADO: $Raiz"
    }
    Set-Location $Raiz

    $remote = (Invoke-Native -Command 'git.exe' -Arguments @('remote','get-url','origin') -Label 'Validar remote').Text.Trim()
    if ($remote -ne $RepositorioEsperado) {
        throw "REMOTE NAO AUTORIZADO: $remote"
    }
    Write-Log 'Repositorio PA Safra confirmado.'

    Invoke-Native -Command 'git.exe' -Arguments @('fetch','origin','--prune') -Label 'Atualizar referencias' | Out-Null
    $contentHead = (Invoke-Native -Command 'git.exe' -Arguments @('rev-parse',"origin/$ContentBranch") -Label 'Ler HEAD da branch editorial').Text.Trim().ToLowerInvariant()
    if ($contentHead -ne $AppCheckpoint) {
        throw "BRANCH EDITORIAL NAO ESTA NO CHECKPOINT LIMPO ESPERADO. ESPERADO=$AppCheckpoint OBTIDO=$contentHead"
    }

    $remoteHead = (Invoke-Native -Command 'git.exe' -Arguments @('rev-parse',"origin/$BranchEsperada") -Label 'Ler HEAD remoto A21').Text.Trim().ToLowerInvariant()
    $changedRaw = (Invoke-Native -Command 'git.exe' -Arguments @('diff','--name-only',"$AppCheckpoint..$remoteHead") -Label 'Auditar delta procedural').Text
    $changed = @()
    if (-not [string]::IsNullOrWhiteSpace($changedRaw)) {
        $changed = @($changedRaw -split "`r?`n" | Where-Object { $_ })
    }
    $unsafe = @($changed | Where-Object {
        $_ -ne '.github/workflows/validate.yml' -and
        $_ -notlike 'tools/PA-SAFRA-A21-R2-*' -and
        $_ -notlike 'tools/PA-SAFRA-A21-R3-*'
    })
    if ($unsafe.Count -gt 0) {
        throw "A21 CONTEM ALTERACAO FORA DO ESCOPO PROCEDURAL: $($unsafe -join ', ')"
    }
    Write-Log "Branch editorial permanece limpa em $AppCheckpoint; delta A21 posterior e somente procedural."

    $status0 = Invoke-RestMethod -Uri "$PreviewUrl/api/admin/status" -Method Get -Headers @{ 'Cache-Control' = 'no-cache' }
    if (-not $status0.enabled -or -not $status0.credentials_configured -or -not $status0.rate_limit_configured -or $status0.rate_limit_backend -ne 'd1') {
        throw 'PREVIEW A21 R3 NAO CONFIRMOU AUTH + D1.'
    }
    if (-not $status0.token_configured) {
        throw 'PREVIEW A21 R3 NAO CONFIRMOU GITHUB_CONTENT_TOKEN JA CONFIGURADO.'
    }
    if ($status0.write_enabled) {
        throw 'WRITE_ENABLED NAO PODE SER TRUE SEM SESSAO AUTENTICADA.'
    }
    if ([string]$status0.branch -ne $ContentBranch) {
        throw "BRANCH EDITORIAL INESPERADA NO RUNTIME: $($status0.branch)"
    }
    Write-Log 'Preview existente confirmado: token + D1 + branch correta; write_enabled=false sem sessao.'

    $originalFile = Get-PublicGitHubJsonFile -Path 'public/content/videos.json'
    $OriginalVideos = @($originalFile.Json)
    Write-Log "Conteudo original lido publicamente da branch editorial; SHA videos=$($originalFile.Sha.Substring(0,12))."

    Write-Host ''
    Write-Host 'USUARIO DO PAINEL: admin' -ForegroundColor Green
    $AdminPass1 = Read-Host 'Senha administrativa' -AsSecureString
    $AdminPass2 = Read-Host 'Repita a senha' -AsSecureString
    $AdminPassword = Convert-SecureToPlain $AdminPass1
    $AdminPassword2 = Convert-SecureToPlain $AdminPass2
    if ($AdminPassword -cne $AdminPassword2) {
        throw 'AS SENHAS ADMINISTRATIVAS NAO COINCIDEM.'
    }
    if ($AdminPassword.Length -lt 12 -or $AdminPassword.Length -gt 256) {
        throw 'SENHA ADMINISTRATIVA FORA DO INTERVALO PERMITIDO.'
    }
    $AdminPassword2 = $null

    $loginBody = @{ username = $AdminUser; password = $AdminPassword } | ConvertTo-Json -Compress
    $login = Invoke-RestMethod `
        -Uri "$PreviewUrl/api/admin/login" `
        -Method Post `
        -ContentType 'application/json' `
        -Body $loginBody `
        -Headers @{ Origin = $PreviewUrl } `
        -SessionVariable AdminSession
    if (-not $login.ok) {
        throw 'LOGIN A21 R3 NAO RETORNOU ok=true.'
    }

    $status1 = Invoke-RestMethod -Uri "$PreviewUrl/api/admin/status" -Method Get -WebSession $AdminSession -Headers @{ 'Cache-Control' = 'no-cache' }
    if (-not $status1.authenticated -or -not $status1.token_configured -or -not $status1.write_enabled) {
        throw 'SESSAO A21 R3 NAO HABILITOU ESCRITA CONTROLADA.'
    }
    if ([string]$status1.branch -ne $ContentBranch) {
        throw 'SESSAO A21 R3 APONTOU PARA BRANCH EDITORIAL INESPERADA.'
    }
    Write-Log 'Login e sessao: PASS; write_enabled=true somente apos autenticacao.'

    $testMarker = "PA-SAFRA-A21-$([guid]::NewGuid().ToString('N'))"
    $nextVideos = @($OriginalVideos) + @([pscustomobject]@{
        title = "Teste tecnico A21 - $testMarker"
        description = 'Registro temporario e nao publicado para validar escrita editorial controlada.'
        youtube_url = 'https://youtu.be/aqz-KE-bpKQ'
        published = $false
    })

    $write1 = Invoke-AdminPut -TargetUrl $PreviewUrl -Session $AdminSession -Resource 'videos' -Data $nextVideos
    if (-not $write1.ok -or [string]$write1.branch -ne $ContentBranch -or [string]::IsNullOrWhiteSpace([string]$write1.commit)) {
        throw 'PRIMEIRA ESCRITA EDITORIAL NAO FOI CONFIRMADA.'
    }
    $MutationApplied = $true
    Write-Log "Escrita controlada: PASS; commit temporario=$([string]$write1.commit)."

    $markerFound = $false
    for ($attempt = 1; $attempt -le 8; $attempt++) {
        Start-Sleep -Seconds 2
        $afterWrite = Get-PublicGitHubJsonFile -Path 'public/content/videos.json'
        $foundMarker = @($afterWrite.Json | Where-Object { $_.title -like "*$testMarker*" -and $_.published -eq $false })
        if ($foundMarker.Count -eq 1) {
            $markerFound = $true
            break
        }
    }
    if (-not $markerFound) {
        throw 'GITHUB PUBLICO NAO CONFIRMOU O REGISTRO TEMPORARIO NA BRANCH EDITORIAL.'
    }
    Write-Log 'GitHub confirmou o registro temporario somente na branch editorial autorizada.'

    $write2 = Invoke-AdminPut -TargetUrl $PreviewUrl -Session $AdminSession -Resource 'videos' -Data $OriginalVideos
    if (-not $write2.ok -or [string]$write2.branch -ne $ContentBranch -or [string]::IsNullOrWhiteSpace([string]$write2.commit)) {
        throw 'RESTAURACAO EDITORIAL NAO FOI CONFIRMADA.'
    }

    if (-not (Confirm-CanonicalRestore -Expected $OriginalVideos)) {
        throw 'CONTEUDO FINAL NA BRANCH EDITORIAL DIVERGE DO ORIGINAL.'
    }
    $RestoreConfirmed = $true
    $MutationApplied = $false
    Write-Log "Restauracao: PASS; commit restaurador=$([string]$write2.commit); conteudo final igual ao original."

    $logout = Invoke-RestMethod `
        -Uri "$PreviewUrl/api/admin/logout" `
        -Method Post `
        -ContentType 'application/json' `
        -Body '{}' `
        -Headers @{ Origin = $PreviewUrl } `
        -WebSession $AdminSession
    if (-not $logout.ok) {
        throw 'LOGOUT A21 R3 NAO RETORNOU ok=true.'
    }

    $status2 = Invoke-RestMethod -Uri "$PreviewUrl/api/admin/status" -Method Get -Headers @{ 'Cache-Control' = 'no-cache' }
    if ($status2.authenticated -or -not $status2.token_configured -or $status2.write_enabled) {
        throw 'ESTADO FINAL A21 R3 INESPERADO APOS LOGOUT.'
    }

    Write-Log 'Logout: PASS; token permanece apenas no Preview e escrita exige sessao valida.'
    Write-Log 'A21 F1: PASS. Escrita e restauracao comprovadas exclusivamente em content/pa-v001-admin-preview.'

    Write-Host ''
    Write-Host 'PA SAFRA A21 CONTENT WRITE LIVE: PASS' -ForegroundColor Green
    Write-Host 'BRANCH EDITORIAL: content/pa-v001-admin-preview' -ForegroundColor Green
    Write-Host 'PRODUCAO / MAIN / DEVELOP / DOMINIO / DNS: NAO ALTERADOS' -ForegroundColor Green
    Write-Host 'admin_nativo_validado: AINDA FALSE; UX completa permanece gate posterior.' -ForegroundColor Yellow
    Write-Host "LOG: $LogPath" -ForegroundColor Cyan
}
catch {
    $failure = $_.Exception.Message

    if ($MutationApplied -and -not $RestoreConfirmed -and $null -ne $OriginalVideos -and $null -ne $AdminSession) {
        try {
            Write-Log 'RECUPERACAO: tentativa automatica de restaurar videos.json apos falha intermediaria.'
            $recovery = Invoke-AdminPut -TargetUrl $PreviewUrl -Session $AdminSession -Resource 'videos' -Data $OriginalVideos
            if ($recovery.ok -and (Confirm-CanonicalRestore -Expected $OriginalVideos)) {
                $RestoreConfirmed = $true
                $MutationApplied = $false
                Write-Log "RECUPERACAO: PASS; conteudo original restaurado; commit=$([string]$recovery.commit)."
            }
            else {
                Write-Log 'RECUPERACAO: NAO CONFIRMADA. NAO AVANCAR SEM AUDITORIA MANUAL DA BRANCH EDITORIAL.'
            }
        }
        catch {
            Write-Log "RECUPERACAO: FALHA - $($_.Exception.Message)"
        }
    }

    if ($null -ne $AdminSession) {
        try {
            Invoke-RestMethod `
                -Uri "$PreviewUrl/api/admin/logout" `
                -Method Post `
                -ContentType 'application/json' `
                -Body '{}' `
                -Headers @{ Origin = $PreviewUrl } `
                -WebSession $AdminSession | Out-Null
        }
        catch {}
    }

    Write-Host ''
    Write-Host 'PA SAFRA A21 R3 CONTENT WRITE LIVE: FALHA' -ForegroundColor Red
    Write-Host $failure -ForegroundColor Red
    Add-Content -LiteralPath $LogPath -Value ("FALHA: {0}" -f $failure) -Encoding UTF8
    if ($MutationApplied -and -not $RestoreConfirmed) {
        Add-Content -LiteralPath $LogPath -Value '[ALERTA] MUTACAO PODE PERMANECER NA BRANCH EDITORIAL. NAO AVANCAR.' -Encoding UTF8
    }
    exit 1
}
finally {
    $AdminPassword = $null
    $AdminPassword2 = $null
    $AdminPass1 = $null
    $AdminPass2 = $null
}
