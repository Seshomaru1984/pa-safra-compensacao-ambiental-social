$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

Add-Type -AssemblyName System.Net.Http

$RepositorioEsperado = 'https://github.com/Seshomaru1984/pa-safra-compensacao-ambiental-social.git'
$BranchEsperada = 'ops/pa-v001-a20-preview-rate-limit-e2e'
$ProjetoPages = 'pa-safra-compensacao-ambiental-social'
$BancoD1 = 'pa-safra-auth-preview'
$BancoD1Id = 'e99dd1d3-977e-40fd-a814-a00e269fc423'
$PreviewUrl = 'https://ops-pa-v001-a19-preview-auth.pa-safra-compensacao-ambiental-social.pages.dev'
$Raiz = Join-Path $env:USERPROFILE 'PA SAFRA'
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogDir = Join-Path $env:USERPROFILE 'Downloads\PA-SAFRA-LOGS'
$LogPath = Join-Path $LogDir "PA-A20-RATE-LIMIT-$Timestamp.log"

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
        [switch]$AllowFailure,
        [switch]$SuppressOutput
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
    if (-not $SuppressOutput -and -not [string]::IsNullOrWhiteSpace($text)) {
        Add-Content -LiteralPath $LogPath -Value $text -Encoding UTF8
        Write-Host $text
    }

    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "$Label falhou (exit $exitCode). Consulte: $LogPath"
    }

    return [pscustomobject]@{
        Success = ($exitCode -eq 0)
        ExitCode = $exitCode
        Text = $text
    }
}

function Invoke-Wrangler {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$Label,
        [switch]$AllowFailure,
        [switch]$SuppressOutput
    )

    return Invoke-Native `
        -Command 'npx.cmd' `
        -Arguments (@('--yes', 'wrangler@latest') + $Arguments) `
        -Label $Label `
        -AllowFailure:$AllowFailure `
        -SuppressOutput:$SuppressOutput
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

function Invoke-Http {
    param(
        [Parameter(Mandatory = $true)][ValidateSet('GET','POST')][string]$Method,
        [Parameter(Mandatory = $true)][string]$Uri,
        [hashtable]$Headers = @{},
        [AllowNull()][string]$Body = $null
    )

    $handler = [System.Net.Http.HttpClientHandler]::new()
    $handler.UseCookies = $false
    $client = [System.Net.Http.HttpClient]::new($handler)
    $request = $null
    $response = $null
    try {
        $httpMethod = if ($Method -eq 'GET') { [System.Net.Http.HttpMethod]::Get } else { [System.Net.Http.HttpMethod]::Post }
        $request = [System.Net.Http.HttpRequestMessage]::new($httpMethod, $Uri)
        foreach ($key in $Headers.Keys) {
            [void]$request.Headers.TryAddWithoutValidation([string]$key, [string]$Headers[$key])
        }
        if ($null -ne $Body) {
            $request.Content = [System.Net.Http.StringContent]::new($Body, [Text.Encoding]::UTF8, 'application/json')
        }

        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        $retryAfter = $null
        $setCookie = $null
        if ($response.Headers.Contains('Retry-After')) {
            $retryAfter = [string](($response.Headers.GetValues('Retry-After') | Select-Object -First 1))
        }
        if ($response.Headers.Contains('Set-Cookie')) {
            $setCookie = [string](($response.Headers.GetValues('Set-Cookie') | Select-Object -First 1))
        }

        return [pscustomobject]@{
            Status = [int]$response.StatusCode
            Body = [string]$text
            RetryAfter = $retryAfter
            SetCookie = $setCookie
        }
    }
    finally {
        if ($null -ne $response) { $response.Dispose() }
        if ($null -ne $request) { $request.Dispose() }
        $client.Dispose()
        $handler.Dispose()
    }
}

function Convert-JsonBody {
    param([Parameter(Mandatory = $true)][string]$Text)
    try {
        return $Text | ConvertFrom-Json
    }
    catch {
        throw "RESPOSTA JSON INVALIDA: $Text"
    }
}

function Get-RateState {
    param([Parameter(Mandatory = $true)][string]$RateKey)
    $sql = "SELECT count, window_started_at, blocked_until FROM admin_login_rate WHERE client_key = '$RateKey' LIMIT 1;"
    $raw = (Invoke-Wrangler -Arguments @(
        'd1','execute',$BancoD1,'--remote',"--command=$sql",'--json'
    ) -Label 'Ler estado do rate limiter' -SuppressOutput).Text
    $parsed = $raw | ConvertFrom-Json
    foreach ($item in @($parsed)) {
        if ($item.PSObject.Properties['results'] -and @($item.results).Count -gt 0) {
            return @($item.results)[0]
        }
    }
    return $null
}

function Remove-RateState {
    param([Parameter(Mandatory = $true)][string]$RateKey)
    if ($RateKey -notmatch '^login:[0-9a-f]{64}$') {
        throw 'RATE KEY INVALIDA; LIMPEZA D1 BLOQUEADA.'
    }
    $sql = "DELETE FROM admin_login_rate WHERE client_key = '$RateKey';"
    Invoke-Wrangler -Arguments @(
        'd1','execute',$BancoD1,'--remote',"--command=$sql",'--json'
    ) -Label 'Limpar estado de teste do rate limiter' -SuppressOutput | Out-Null
}

function Assert-Status {
    param(
        [Parameter(Mandatory = $true)]$Response,
        [Parameter(Mandatory = $true)][int]$Expected,
        [Parameter(Mandatory = $true)][string]$Label
    )
    if ([int]$Response.Status -ne $Expected) {
        throw "${Label}: esperado HTTP $Expected, recebido HTTP $($Response.Status). Corpo=$($Response.Body)"
    }
}

$Pass1 = $null
$Pass2 = $null
$PlainPassword = $null
$PlainPassword2 = $null
$RateKey = $null
$CleanupAllowed = $false

try {
    Write-Host ''
    Write-Host 'PA SAFRA - A20 - RATE LIMITER LIVE NO PREVIEW' -ForegroundColor Cyan
    Write-Host 'Escopo: somente Preview + D1 tecnico de Preview. Nenhuma escrita editorial.' -ForegroundColor Cyan
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

    $status = (Invoke-Native -Command 'git.exe' -Arguments @('status','--porcelain=v1','--untracked-files=all') -Label 'Verificar worktree').Text
    $relevantes = @()
    if (-not [string]::IsNullOrWhiteSpace($status)) {
        $relevantes = @(
            $status -split "`r?`n" |
            Where-Object { $_ -and $_ -notmatch '^\?\? \.wrangler[/\\]' }
        )
    }
    if ($relevantes.Count -gt 0) {
        throw "WORKTREE POSSUI ALTERACOES FORA DE .wrangler: $($relevantes -join ' | ')"
    }

    Invoke-Native -Command 'git.exe' -Arguments @('fetch','origin','--prune') -Label 'Atualizar referencias' | Out-Null
    $remoteHead = (Invoke-Native -Command 'git.exe' -Arguments @('rev-parse',"origin/$BranchEsperada") -Label 'Ler HEAD remoto A20').Text.Trim().ToLower()
    if ($remoteHead -notmatch '^[0-9a-f]{40}$') {
        throw "HEAD REMOTO A20 INVALIDO: $remoteHead"
    }

    $localRef = Invoke-Native -Command 'git.exe' -Arguments @('show-ref','--verify','--quiet',"refs/heads/$BranchEsperada") -Label 'Verificar branch local A20' -AllowFailure
    if ($localRef.Success) {
        Invoke-Native -Command 'git.exe' -Arguments @('switch',$BranchEsperada) -Label 'Entrar na A20' | Out-Null
        Invoke-Native -Command 'git.exe' -Arguments @('merge','--ff-only',"origin/$BranchEsperada") -Label 'Sincronizar A20' | Out-Null
    }
    else {
        Invoke-Native -Command 'git.exe' -Arguments @('switch','--track','-c',$BranchEsperada,"origin/$BranchEsperada") -Label 'Criar branch local A20' | Out-Null
    }

    $head = (Invoke-Native -Command 'git.exe' -Arguments @('rev-parse','HEAD') -Label 'Confirmar HEAD A20').Text.Trim().ToLower()
    if ($head -ne $remoteHead) {
        throw "HEAD LOCAL DIVERGE DO REMOTO A20. LOCAL=$head REMOTO=$remoteHead"
    }
    Write-Log "A20 sincronizada no HEAD $head"

    $who = ((Invoke-Wrangler -Arguments @('whoami','--json') -Label 'Validar login Cloudflare' -SuppressOutput).Text | ConvertFrom-Json)
    if (-not $who.loggedIn) {
        throw 'Wrangler nao esta autenticado.'
    }
    Write-Log 'Wrangler autenticado.'

    $d1List = @(((Invoke-Wrangler -Arguments @('d1','list','--json') -Label 'Validar D1' -SuppressOutput).Text | ConvertFrom-Json))
    $db = $d1List | Where-Object { $_.name -eq $BancoD1 -and $_.uuid -eq $BancoD1Id } | Select-Object -First 1
    if (-not $db) {
        throw "D1 ESPERADO NAO ENCONTRADO: $BancoD1 / $BancoD1Id"
    }
    Write-Log 'D1 de Preview confirmado.'

    $statusResponse = Invoke-Http -Method GET -Uri "$PreviewUrl/api/admin/status" -Headers @{ 'Cache-Control' = 'no-cache' }
    Assert-Status -Response $statusResponse -Expected 200 -Label 'Status remoto inicial'
    $statusJson = Convert-JsonBody -Text $statusResponse.Body
    if (-not $statusJson.enabled -or -not $statusJson.credentials_configured -or -not $statusJson.rate_limit_configured -or $statusJson.rate_limit_backend -ne 'd1') {
        throw 'PREVIEW NAO ESTA PRONTO PARA O GATE DE RATE LIMITER.'
    }
    if ($statusJson.token_configured -or $statusJson.write_enabled) {
        throw 'ESCRITA GITHUB APARECEU HABILITADA; A20 BLOQUEADA.'
    }
    Write-Log 'Status remoto confirmou auth + D1; GitHub write permanece bloqueado.'

    $trace = (Invoke-WebRequest -UseBasicParsing -Uri "$PreviewUrl/cdn-cgi/trace" -Method Get).Content
    $ipLine = @($trace -split "`r?`n" | Where-Object { $_ -match '^ip=' } | Select-Object -First 1)
    if ($ipLine.Count -ne 1) {
        throw 'NAO FOI POSSIVEL DETERMINAR O IP DO CLIENTE PELO TRACE CLOUDFLARE.'
    }
    $clientIp = ([string]$ipLine[0]).Substring(3).Trim()
    if ([string]::IsNullOrWhiteSpace($clientIp)) {
        throw 'TRACE CLOUDFLARE RETORNOU IP VAZIO.'
    }

    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        $digest = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes("pa-safra-admin-login|$clientIp"))
    }
    finally {
        $sha.Dispose()
    }
    $hex = -join ($digest | ForEach-Object { $_.ToString('x2') })
    $RateKey = "login:$hex"
    Write-Log 'Identificador tecnico do cliente derivado localmente; IP bruto nao sera gravado no log.'

    $preState = Get-RateState -RateKey $RateKey
    if ($null -ne $preState) {
        throw "JA EXISTE ESTADO DE RATE LIMITER PARA ESTE CLIENTE (count=$($preState.count), blocked_until=$($preState.blocked_until)). A20 NAO APAGA ESTADO PREEXISTENTE."
    }
    Write-Log 'Precondicao D1: nenhum estado preexistente para este cliente.'

    Write-Host ''
    Write-Host 'USUARIO DO PAINEL: admin' -ForegroundColor Green
    Write-Host 'Digite a senha administrativa somente para provar o bloqueio e o desbloqueio controlado.' -ForegroundColor Cyan
    $Pass1 = Read-Host 'Senha administrativa' -AsSecureString
    $Pass2 = Read-Host 'Repita a senha' -AsSecureString
    $PlainPassword = Convert-SecureToPlain $Pass1
    $PlainPassword2 = Convert-SecureToPlain $Pass2
    if ($PlainPassword -cne $PlainPassword2) {
        throw 'AS SENHAS NAO COINCIDEM.'
    }
    if ($PlainPassword.Length -lt 12 -or $PlainPassword.Length -gt 256) {
        throw 'SENHA FORA DO INTERVALO PERMITIDO.'
    }
    $PlainPassword2 = $null

    $wrongPassword = "PA-SAFRA-A20-$([guid]::NewGuid().ToString('N'))-senha-incorreta"
    $wrongBody = @{ username = 'admin'; password = $wrongPassword } | ConvertTo-Json -Compress

    $first = Invoke-Http -Method POST -Uri "$PreviewUrl/api/admin/login" -Headers @{ Origin = $PreviewUrl } -Body $wrongBody
    Assert-Status -Response $first -Expected 401 -Label 'Falha 1'
    $firstState = Get-RateState -RateKey $RateKey
    if ($null -eq $firstState -or [int]$firstState.count -ne 1) {
        throw 'D1 NAO CONFIRMOU count=1 PARA O IDENTIFICADOR DERIVADO. TESTE INTERROMPIDO ANTES DO LOCK.'
    }
    $CleanupAllowed = $true
    Write-Log 'Falha 1: HTTP 401 e D1 count=1 confirmados.'

    for ($attempt = 2; $attempt -le 4; $attempt += 1) {
        $response = Invoke-Http -Method POST -Uri "$PreviewUrl/api/admin/login" -Headers @{ Origin = $PreviewUrl } -Body $wrongBody
        Assert-Status -Response $response -Expected 401 -Label "Falha $attempt"
        Write-Log "Falha $attempt: HTTP 401 confirmado."
    }

    $fifth = Invoke-Http -Method POST -Uri "$PreviewUrl/api/admin/login" -Headers @{ Origin = $PreviewUrl } -Body $wrongBody
    Assert-Status -Response $fifth -Expected 429 -Label 'Falha 5'
    $retry = 0
    if (-not [int]::TryParse([string]$fifth.RetryAfter, [ref]$retry) -or $retry -lt 1) {
        throw 'QUINTA FALHA RETORNOU 429, MAS Retry-After ESTA AUSENTE OU INVALIDO.'
    }
    Write-Log "Falha 5: HTTP 429 + Retry-After confirmado ($retry s)."

    $lockedState = Get-RateState -RateKey $RateKey
    $nowEpoch = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    if ($null -eq $lockedState -or [int]$lockedState.count -lt 5 -or [int64]$lockedState.blocked_until -le $nowEpoch) {
        throw 'D1 NAO CONFIRMOU ESTADO DE LOCK APOS A QUINTA FALHA.'
    }
    Write-Log 'D1 confirmou count >= 5 e blocked_until futuro.'

    $correctBody = @{ username = 'admin'; password = $PlainPassword } | ConvertTo-Json -Compress
    $blockedCorrect = Invoke-Http -Method POST -Uri "$PreviewUrl/api/admin/login" -Headers @{ Origin = $PreviewUrl } -Body $correctBody
    Assert-Status -Response $blockedCorrect -Expected 429 -Label 'Senha correta durante lock'
    Write-Log 'Senha correta durante lock: HTTP 429 confirmado.'

    Remove-RateState -RateKey $RateKey
    $afterCleanup = Get-RateState -RateKey $RateKey
    if ($null -ne $afterCleanup) {
        throw 'LIMPEZA CONTROLADA DO ESTADO DE TESTE NAO FOI CONFIRMADA.'
    }
    $CleanupAllowed = $false
    Write-Log 'Estado de teste removido do D1 de Preview e ausencia confirmada.'

    $badOrigin = Invoke-Http -Method POST -Uri "$PreviewUrl/api/admin/login" -Headers @{ Origin = 'https://example.invalid' } -Body $correctBody
    Assert-Status -Response $badOrigin -Expected 403 -Label 'Origem invalida'
    if ($null -ne (Get-RateState -RateKey $RateKey)) {
        throw 'ORIGEM INVALIDA ALTEROU O RATE LIMITER INDEVIDAMENTE.'
    }
    Write-Log 'Same-origin live: origem invalida rejeitada com HTTP 403 sem alterar D1.'

    $login = Invoke-Http -Method POST -Uri "$PreviewUrl/api/admin/login" -Headers @{ Origin = $PreviewUrl } -Body $correctBody
    Assert-Status -Response $login -Expected 200 -Label 'Login correto apos limpeza'
    if ([string]::IsNullOrWhiteSpace([string]$login.SetCookie)) {
        throw 'LOGIN CORRETO NAO RETORNOU COOKIE DE SESSAO.'
    }
    foreach ($required in @('pa_safra_admin_session=', 'HttpOnly', 'Secure', 'SameSite=Strict')) {
        if ($login.SetCookie -notlike "*$required*") {
            throw "COOKIE DE SESSAO SEM ATRIBUTO OBRIGATORIO: $required"
        }
    }
    $cookiePair = ([string]$login.SetCookie -split ';')[0]
    Write-Log 'Login correto apos limpeza: HTTP 200 + cookie seguro confirmado.'

    $authenticatedStatus = Invoke-Http -Method GET -Uri "$PreviewUrl/api/admin/status" -Headers @{ Cookie = $cookiePair; 'Cache-Control' = 'no-cache' }
    Assert-Status -Response $authenticatedStatus -Expected 200 -Label 'Status autenticado'
    $authenticatedJson = Convert-JsonBody -Text $authenticatedStatus.Body
    if (-not $authenticatedJson.authenticated) {
        throw 'SESSAO NAO FOI RECONHECIDA APOS LOGIN CORRETO.'
    }
    if ($authenticatedJson.token_configured -or $authenticatedJson.write_enabled) {
        throw 'ESCRITA GITHUB FOI HABILITADA INDEVIDAMENTE DURANTE A20.'
    }
    Write-Log 'Sessao autenticada confirmada; GitHub write continua bloqueado.'

    $logout = Invoke-Http -Method POST -Uri "$PreviewUrl/api/admin/logout" -Headers @{ Origin = $PreviewUrl; Cookie = $cookiePair }
    Assert-Status -Response $logout -Expected 200 -Label 'Logout'
    foreach ($required in @('pa_safra_admin_session=', 'Max-Age=0', 'HttpOnly', 'Secure', 'SameSite=Strict')) {
        if ($logout.SetCookie -notlike "*$required*") {
            throw "COOKIE DE LOGOUT SEM ATRIBUTO OBRIGATORIO: $required"
        }
    }
    Write-Log 'Logout: HTTP 200 + expiracao do cookie confirmados.'

    $finalStatus = Invoke-Http -Method GET -Uri "$PreviewUrl/api/admin/status" -Headers @{ 'Cache-Control' = 'no-cache' }
    Assert-Status -Response $finalStatus -Expected 200 -Label 'Status final sem cookie'
    $finalJson = Convert-JsonBody -Text $finalStatus.Body
    if ($finalJson.authenticated -or $finalJson.token_configured -or $finalJson.write_enabled) {
        throw 'ESTADO FINAL DO PREVIEW INESPERADO.'
    }
    if ($null -ne (Get-RateState -RateKey $RateKey)) {
        throw 'ESTADO DE RATE LIMITER RESIDUAL ENCONTRADO AO FINAL DA A20.'
    }

    Write-Host ''
    Write-Host 'PA SAFRA A20 RATE LIMITER LIVE: PASS' -ForegroundColor Green
    Write-Host '4 falhas: 401 | 5a: 429 + Retry-After | senha correta bloqueada: 429' -ForegroundColor Green
    Write-Host 'D1: estado de teste removido | login apos limpeza: 200 | same-origin: 403 para origem invalida' -ForegroundColor Green
    Write-Host 'GITHUB_CONTENT_TOKEN: NAO CONFIGURADO | ESCRITA EDITORIAL: BLOQUEADA' -ForegroundColor Green
    Write-Host "LOG: $LogPath" -ForegroundColor Green
}
catch {
    Write-Host ''
    Write-Host 'PA SAFRA A20 RATE LIMITER LIVE: FALHA' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Add-Content -LiteralPath $LogPath -Value ("FALHA: {0}" -f $_.Exception.Message) -Encoding UTF8
    exit 1
}
finally {
    if ($CleanupAllowed -and -not [string]::IsNullOrWhiteSpace([string]$RateKey)) {
        try {
            Remove-RateState -RateKey $RateKey
            Add-Content -LiteralPath $LogPath -Value '[CLEANUP] Estado de teste removido no finally.' -Encoding UTF8
        }
        catch {
            Add-Content -LiteralPath $LogPath -Value ("[CLEANUP-FALHA] {0}" -f $_.Exception.Message) -Encoding UTF8
        }
    }
    $PlainPassword = $null
    $PlainPassword2 = $null
    $Pass1 = $null
    $Pass2 = $null
}
