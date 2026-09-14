$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositorioEsperado = 'https://github.com/Seshomaru1984/pa-safra-compensacao-ambiental-social.git'
$Branch = 'ops/pa-v001-a19-preview-auth-e2e'
$ProjetoPages = 'pa-safra-compensacao-ambiental-social'
$BancoD1 = 'pa-safra-auth-preview'
$BancoD1Id = 'e99dd1d3-977e-40fd-a814-a00e269fc423'
$BindingD1 = 'PA_SAFRA_AUTH_DB'
$ContentBranch = 'content/pa-v001-admin-preview'
$AdminUser = 'admin'
$PreviewUrl = 'https://ops-pa-v001-a19-preview-auth.pa-safra-compensacao-ambiental-social.pages.dev'
$Raiz = Join-Path $env:USERPROFILE 'PA SAFRA'
$BuildScript = Join-Path $Raiz 'tools\PA-SAFRA-BUILD-E-ARQUIVAR.ps1'
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogDir = Join-Path $env:USERPROFILE 'Downloads\PA-SAFRA-LOGS'
$LogPath = Join-Path $LogDir "PA-A19-R4-PBKDF2-$Timestamp.log"
$TempCredentialJs = Join-Path $env:TEMP ("pa-safra-a19-r4-hash-$([guid]::NewGuid().ToString('N')).js")
$RootConfigNames = @('wrangler.toml', 'wrangler.json', 'wrangler.jsonc')
$RootConfigPath = $null
$PlainPassword = $null

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
        [AllowNull()][string]$InputText = $null,
        [switch]$AllowFailure,
        [switch]$SuppressOutput
    )

    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        if ($PSBoundParameters.ContainsKey('InputText')) {
            $output = @($InputText | & $Command @Arguments 2>&1)
        }
        else {
            $output = @(& $Command @Arguments 2>&1)
        }
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
    return [pscustomobject]@{ Success = ($exitCode -eq 0); ExitCode = $exitCode; Text = $text }
}

function Invoke-Wrangler {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$Label,
        [AllowNull()][string]$InputText = $null,
        [switch]$SuppressOutput
    )
    $params = @{
        Command = 'npx.cmd'
        Arguments = @('--yes', 'wrangler@latest') + $Arguments
        Label = $Label
        SuppressOutput = $SuppressOutput
    }
    if ($PSBoundParameters.ContainsKey('InputText')) { $params.InputText = $InputText }
    return Invoke-Native @params
}

function Convert-SecureToPlain {
    param([Parameter(Mandatory = $true)][Security.SecureString]$Secure)
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally {
        if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
    }
}

function Get-RootWranglerFiles {
    $found = @()
    foreach ($name in $RootConfigNames) {
        $candidate = Join-Path $Raiz $name
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { $found += $candidate }
    }
    return @($found)
}

function Add-PreviewD1ToToml {
    param([Parameter(Mandatory = $true)][string]$Path)
    $raw = Get-Content -LiteralPath $Path -Raw
    if ($raw -notmatch '(?m)^\s*pages_build_output_dir\s*=') {
        throw 'CONFIG BAIXADA DO PAGES NAO CONTEM pages_build_output_dir.'
    }
    $productionBindingPattern = '(?ms)^\s*\[\[env\.production\.d1_databases\]\]\s*(?:(?!^\s*\[\[).)*?^\s*binding\s*=\s*["'']PA_SAFRA_AUTH_DB["'']'
    if ($raw -match $productionBindingPattern) {
        throw 'BINDING PA_SAFRA_AUTH_DB EXISTE EM PRODUCTION. EXECUCAO BLOQUEADA.'
    }
    if ($raw -match '(?m)^\s*binding\s*=\s*["'']PA_SAFRA_AUTH_DB["'']\s*$') {
        if ($raw -notmatch [regex]::Escape($BancoD1Id)) {
            throw 'BINDING PA_SAFRA_AUTH_DB APONTA PARA D1 INESPERADO.'
        }
        Write-Log 'Binding D1 Preview ja presente na configuracao baixada.'
        return
    }
    Add-Content -LiteralPath $Path -Encoding UTF8 -Value @"

# PA SAFRA A19 R4 - binding exclusivo do Preview
[[env.preview.d1_databases]]
binding = "$BindingD1"
database_name = "$BancoD1"
database_id = "$BancoD1Id"
"@
    Write-Log 'Binding D1 adicionado somente em env.preview.'
}

function Add-PreviewD1ToJson {
    param([Parameter(Mandatory = $true)][string]$Path)
    try { $cfg = (Get-Content -LiteralPath $Path -Raw) | ConvertFrom-Json }
    catch { throw 'CONFIG JSON BAIXADA DO PAGES NAO PODE SER INTERPRETADA.' }
    if (-not $cfg.pages_build_output_dir) { throw 'CONFIG BAIXADA NAO CONTEM pages_build_output_dir.' }
    if (-not $cfg.PSObject.Properties['env']) { $cfg | Add-Member -NotePropertyName env -NotePropertyValue ([pscustomobject]@{}) }
    if (-not $cfg.env.PSObject.Properties['preview']) { $cfg.env | Add-Member -NotePropertyName preview -NotePropertyValue ([pscustomobject]@{}) }
    if ($cfg.env.PSObject.Properties['production'] -and $cfg.env.production.PSObject.Properties['d1_databases']) {
        if (@($cfg.env.production.d1_databases | Where-Object { $_.binding -eq $BindingD1 }).Count -gt 0) {
            throw 'BINDING PA_SAFRA_AUTH_DB EXISTE EM PRODUCTION. EXECUCAO BLOQUEADA.'
        }
    }
    $previewD1 = @()
    if ($cfg.env.preview.PSObject.Properties['d1_databases']) { $previewD1 = @($cfg.env.preview.d1_databases) }
    $same = @($previewD1 | Where-Object { $_.binding -eq $BindingD1 })
    if ($same.Count -gt 0) {
        if (@($same | Where-Object { $_.database_id -ne $BancoD1Id }).Count -gt 0) {
            throw 'BINDING PA_SAFRA_AUTH_DB APONTA PARA D1 INESPERADO.'
        }
        Write-Log 'Binding D1 Preview ja presente na configuracao baixada.'
    }
    else {
        $entry = [pscustomobject]@{ binding = $BindingD1; database_name = $BancoD1; database_id = $BancoD1Id }
        $previewD1 = @($previewD1) + @($entry)
        if ($cfg.env.preview.PSObject.Properties['d1_databases']) { $cfg.env.preview.d1_databases = $previewD1 }
        else { $cfg.env.preview | Add-Member -NotePropertyName d1_databases -NotePropertyValue $previewD1 }
        Write-Log 'Binding D1 adicionado somente em env.preview.'
    }
    $cfg | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $Path -Encoding UTF8
}

try {
    Write-Host ''
    Write-Host 'PA SAFRA - A19 R4 - CORRECAO PBKDF2 DO PREVIEW' -ForegroundColor Cyan
    Write-Host 'A R2/R3 NAO DEVEM SER REEXECUTADAS. Esta e a correcao canonica.' -ForegroundColor Yellow
    Write-Host 'Escopo: Preview; sem GitHub write, producao, main, develop, dominio ou DNS.' -ForegroundColor Cyan
    Write-Host ''

    if (-not (Test-Path -LiteralPath (Join-Path $Raiz '.git') -PathType Container)) {
        throw "CLONE LOCAL DO PA SAFRA NAO ENCONTRADO: $Raiz"
    }
    Set-Location $Raiz

    $remote = (Invoke-Native -Command 'git.exe' -Arguments @('remote','get-url','origin') -Label 'Validar remote').Text.Trim()
    if ($remote -ne $RepositorioEsperado) { throw "REMOTE NAO AUTORIZADO: $remote" }
    Write-Log 'Repositorio PA Safra confirmado.'

    $status = (Invoke-Native -Command 'git.exe' -Arguments @('status','--porcelain=v1','--untracked-files=all') -Label 'Validar worktree').Text
    $relevantes = @()
    if (-not [string]::IsNullOrWhiteSpace($status)) {
        $relevantes = @($status -split "`r?`n" | Where-Object { $_ -and $_ -notmatch '^\?\? \.wrangler[/\\]' })
    }
    if ($relevantes.Count -gt 0) { throw "WORKTREE POSSUI ALTERACOES RELEVANTES: $($relevantes -join ' | ')" }

    Invoke-Native -Command 'git.exe' -Arguments @('fetch','origin','--prune') -Label 'Atualizar referencias' | Out-Null
    $remoteHead = (Invoke-Native -Command 'git.exe' -Arguments @('rev-parse',"origin/$Branch") -Label 'Ler HEAD remoto A19').Text.Trim().ToLower()
    $local = Invoke-Native -Command 'git.exe' -Arguments @('show-ref','--verify','--quiet',"refs/heads/$Branch") -Label 'Verificar branch local' -AllowFailure
    if ($local.Success) {
        Invoke-Native -Command 'git.exe' -Arguments @('switch',$Branch) -Label 'Entrar na A19' | Out-Null
        Invoke-Native -Command 'git.exe' -Arguments @('merge','--ff-only',"origin/$Branch") -Label 'Sincronizar A19' | Out-Null
    }
    else {
        Invoke-Native -Command 'git.exe' -Arguments @('switch','--track','-c',$Branch,"origin/$Branch") -Label 'Criar A19 local' | Out-Null
    }
    $head = (Invoke-Native -Command 'git.exe' -Arguments @('rev-parse','HEAD') -Label 'Confirmar HEAD').Text.Trim().ToLower()
    if ($head -ne $remoteHead) { throw "HEAD LOCAL DIVERGE DO REMOTO. LOCAL=$head REMOTO=$remoteHead" }
    Write-Log "A19 sincronizada no HEAD $head"

    $who = ((Invoke-Wrangler -Arguments @('whoami','--json') -Label 'Validar login Cloudflare' -SuppressOutput).Text | ConvertFrom-Json)
    if (-not $who.loggedIn) { throw 'Wrangler nao esta autenticado.' }
    Write-Log 'Wrangler autenticado.'

    $previewList = @(((Invoke-Wrangler -Arguments @('pages','deployment','list','--project-name',$ProjetoPages,'--environment','preview','--json') -Label 'Validar Pages Preview' -SuppressOutput).Text | ConvertFrom-Json))
    if ($previewList.Count -lt 1) { throw 'Projeto Pages/Preview nao confirmado.' }
    Write-Log 'Projeto Pages/Preview confirmado.'

    $status0 = Invoke-RestMethod -Uri "$PreviewUrl/api/admin/status" -Method Get -Headers @{ 'Cache-Control' = 'no-cache' }
    if (-not $status0.enabled -or -not $status0.credentials_configured -or -not $status0.rate_limit_configured -or $status0.rate_limit_backend -ne 'd1') {
        throw 'ESTADO REMOTO PREVIO NAO CORRESPONDE A A19 VALIDADA.'
    }
    if ($status0.token_configured -or $status0.write_enabled) { throw 'ESCRITA GITHUB ESTA HABILITADA INDEVIDAMENTE.' }
    if ([string]$status0.branch -ne $ContentBranch) { throw "BRANCH EDITORIAL INESPERADA: $($status0.branch)" }
    Write-Log 'Estado remoto previo preservado; GitHub write continua bloqueado.'

    if (-not (Test-Path -LiteralPath $BuildScript -PathType Leaf)) { throw "SCRIPT DE BUILD AUSENTE: $BuildScript" }
    Invoke-Native -Command 'powershell.exe' -Arguments @('-NoProfile','-ExecutionPolicy','Bypass','-File',$BuildScript,'-NaoAbrirPasta') -Label 'Build formal da correcao' | Out-Null
    Write-Log 'Build formal/smoke/pacote concluidos para a mudanca de login.'

    $existing = @(Get-RootWranglerFiles)
    if ($existing.Count -gt 0) { throw "CONFIG WRANGLER JA EXISTE NO ROOT: $($existing -join ', ')" }
    Invoke-Wrangler -Arguments @('pages','download','config',$ProjetoPages) -Label 'Baixar configuracao Pages' | Out-Null
    $downloaded = @(Get-RootWranglerFiles)
    if ($downloaded.Count -ne 1) { throw "ESPERAVA UMA CONFIG WRANGLER; ENCONTRADAS=$($downloaded.Count)." }
    $RootConfigPath = $downloaded[0]
    $extension = [IO.Path]::GetExtension($RootConfigPath).ToLowerInvariant()
    if ($extension -eq '.toml') { Add-PreviewD1ToToml -Path $RootConfigPath }
    elseif ($extension -eq '.json') { Add-PreviewD1ToJson -Path $RootConfigPath }
    elseif ($extension -eq '.jsonc') { throw 'CONFIG JSONC BAIXADA; EXECUCAO BLOQUEADA SEM PARSER DEDICADO.' }
    else { throw "FORMATO WRANGLER NAO SUPORTADO: $extension" }

    Write-Host ''
    Write-Host 'USUARIO DO PAINEL: admin' -ForegroundColor Green
    Write-Host 'Digite somente a senha do painel duas vezes. Ela nao sera registrada no log.' -ForegroundColor Cyan
    $pass1 = Read-Host 'Senha (12 a 256 caracteres)' -AsSecureString
    $pass2 = Read-Host 'Repita a senha' -AsSecureString
    $PlainPassword = Convert-SecureToPlain $pass1
    $plain2 = Convert-SecureToPlain $pass2
    try {
        if ($PlainPassword -ne $plain2) { throw 'AS SENHAS NAO COINCIDEM.' }
        if ($PlainPassword.Length -lt 12 -or $PlainPassword.Length -gt 256) { throw 'A SENHA DEVE TER ENTRE 12 E 256 CARACTERES.' }
    }
    finally { $plain2 = $null }

    $credentialJs = @'
const crypto = require('node:crypto');
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => input += c);
process.stdin.on('end', () => {
  const password = input.replace(/[\r\n]+$/, '');
  if (password.length < 12 || password.length > 256) process.exit(2);
  const iterations = 100000;
  const salt = crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  const b64u = b => Buffer.from(b).toString('base64url');
  process.stdout.write(`pbkdf2-sha256$${iterations}$${b64u(salt)}$${b64u(derived)}`);
});
'@
    Set-Content -LiteralPath $TempCredentialJs -Value $credentialJs -Encoding UTF8
    $newHash = (Invoke-Native -Command 'node.exe' -Arguments @($TempCredentialJs) -Label 'Gerar hash PBKDF2 100000' -InputText $PlainPassword -SuppressOutput).Text.Trim()
    if ($newHash -notmatch '^pbkdf2-sha256\$100000\$[^$]+\$[^$]+$') { throw 'HASH PBKDF2 GERADO EM FORMATO INESPERADO.' }
    Write-Log 'Novo hash PBKDF2-SHA256/100000 gerado localmente.'

    Invoke-Wrangler -Arguments @('pages','secret','put','PA_SAFRA_ADMIN_PASSWORD_HASH','--project-name',$ProjetoPages,'--env','preview') -Label 'Atualizar hash somente no Preview' -InputText $newHash -SuppressOutput | Out-Null
    Write-Log 'Somente PA_SAFRA_ADMIN_PASSWORD_HASH foi renovado no Preview.'
    Write-Log 'PA_SAFRA_SESSION_SECRET, GITHUB_CONTENT_TOKEN, D1 e demais secrets nao foram alterados.'

    $deploy = Invoke-Wrangler -Arguments @(
        'pages','deploy','dist',
        '--project-name',$ProjetoPages,
        '--branch',$Branch,
        '--experimental-provision=false',
        '--experimental-auto-create=false',
        '--install-skills=false'
    ) -Label 'Deploy Preview da correcao PBKDF2'
    Write-Log 'Deploy Preview da correcao concluido.'

    Remove-Item -LiteralPath $RootConfigPath -Force -ErrorAction Stop
    $RootConfigPath = $null
    Write-Log 'Configuracao Wrangler temporaria removida.'
    Start-Sleep -Seconds 2

    $status1 = Invoke-RestMethod -Uri "$PreviewUrl/api/admin/status" -Method Get -Headers @{ 'Cache-Control' = 'no-cache' }
    if (-not $status1.enabled -or -not $status1.credentials_configured -or -not $status1.rate_limit_configured -or $status1.rate_limit_backend -ne 'd1') {
        throw 'PREVIEW POS-DEPLOY NAO CONFIRMOU ADMIN/CREDENCIAIS/D1.'
    }
    if ($status1.token_configured -or $status1.write_enabled) { throw 'GITHUB WRITE FOI HABILITADO INDEVIDAMENTE.' }

    $loginBody = @{ username = $AdminUser; password = $PlainPassword } | ConvertTo-Json -Compress
    $login = Invoke-RestMethod -Uri "$PreviewUrl/api/admin/login" -Method Post -ContentType 'application/json' -Body $loginBody -Headers @{ Origin = $PreviewUrl } -SessionVariable AdminSession
    if (-not $login.ok -or [string]$login.user -ne $AdminUser) { throw 'LOGIN REAL NAO FOI CONFIRMADO.' }
    Write-Log 'Login real no Cloudflare Preview: PASS.'

    $statusAuth = Invoke-RestMethod -Uri "$PreviewUrl/api/admin/status" -Method Get -WebSession $AdminSession -Headers @{ 'Cache-Control' = 'no-cache' }
    if (-not $statusAuth.authenticated -or [string]$statusAuth.user -ne $AdminUser) { throw 'SESSAO ADMINISTRATIVA NAO FOI CONFIRMADA.' }
    if ($statusAuth.token_configured -or $statusAuth.write_enabled) { throw 'ESCRITA GITHUB APARECEU HABILITADA INDEVIDAMENTE APOS LOGIN.' }
    Write-Log 'Sessao assinada/cookie no Preview: PASS; escrita GitHub continua bloqueada.'

    $logout = Invoke-RestMethod -Uri "$PreviewUrl/api/admin/logout" -Method Post -Headers @{ Origin = $PreviewUrl } -WebSession $AdminSession
    if (-not $logout.ok) { throw 'LOGOUT NAO FOI CONFIRMADO.' }
    $statusFinal = Invoke-RestMethod -Uri "$PreviewUrl/api/admin/status" -Method Get -WebSession $AdminSession -Headers @{ 'Cache-Control' = 'no-cache' }
    if ($statusFinal.authenticated) { throw 'SESSAO PERMANECEU AUTENTICADA APOS LOGOUT.' }
    Write-Log 'Logout e invalidacao da sessao: PASS.'

    Write-Host ''
    Write-Host 'PA SAFRA A19 R4 PBKDF2 PREVIEW: PASS' -ForegroundColor Green
    Write-Host 'PBKDF2-SHA256: 100000 iteracoes' -ForegroundColor Green
    Write-Host 'GITHUB_CONTENT_TOKEN: NAO CONFIGURADO' -ForegroundColor Green
    Write-Host 'ESCRITA EDITORIAL: BLOQUEADA' -ForegroundColor Green
    Write-Host "LOG: $LogPath" -ForegroundColor Green
}
catch {
    $message = $_.Exception.Message
    Write-Host ''
    Write-Host "PA SAFRA A19 R4: FALHA - $message" -ForegroundColor Red
    Add-Content -LiteralPath $LogPath -Value "FALHA: $message" -Encoding UTF8
    exit 1
}
finally {
    $PlainPassword = $null
    Remove-Item -LiteralPath $TempCredentialJs -Force -ErrorAction SilentlyContinue
    if ($RootConfigPath -and (Test-Path -LiteralPath $RootConfigPath -PathType Leaf)) {
        Remove-Item -LiteralPath $RootConfigPath -Force -ErrorAction SilentlyContinue
    }
}
