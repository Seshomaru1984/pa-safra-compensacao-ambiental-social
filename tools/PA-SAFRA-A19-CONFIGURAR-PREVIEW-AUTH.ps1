$ErrorActionPreference = 'Stop'

$RepositorioEsperado = 'https://github.com/Seshomaru1984/pa-safra-compensacao-ambiental-social.git'
$BranchEsperada = 'ops/pa-v001-a19-preview-auth-e2e'
$ProjetoPages = 'pa-safra-compensacao-ambiental-social'
$BancoD1 = 'pa-safra-auth-preview'
$BancoD1Id = 'e99dd1d3-977e-40fd-a814-a00e269fc423'
$BindingD1 = 'PA_SAFRA_AUTH_DB'
$ContentBranch = 'content/pa-v001-admin-preview'
$AdminUser = 'admin'
$Raiz = Join-Path $env:USERPROFILE 'PA SAFRA'
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogDir = Join-Path $env:USERPROFILE 'Downloads\PA-SAFRA-LOGS'
$LogPath = Join-Path $LogDir "PA-A19-PREVIEW-AUTH-$Timestamp.log"
$TempConfig = Join-Path $Raiz 'wrangler.a19.preview.jsonc'
$TempCredentialJs = Join-Path $env:TEMP ("pa-safra-a19-credentials-$([guid]::NewGuid().ToString('N')).js")

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
        [AllowNull()][string]$InputText = $null,
        [switch]$AllowFailure,
        [switch]$SuppressOutput
    )

    $args = @('--yes', 'wrangler@latest') + $Arguments
    $params = @{
        Command = 'npx.cmd'
        Arguments = $args
        Label = $Label
        AllowFailure = $AllowFailure
        SuppressOutput = $SuppressOutput
    }
    if ($PSBoundParameters.ContainsKey('InputText')) {
        $params.InputText = $InputText
    }
    return Invoke-Native @params
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

function Put-PreviewSecret {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Value
    )

    Write-Log "Configurando secret PREVIEW: $Name"
    Invoke-Wrangler `
        -Arguments @('pages','secret','put',$Name,'--project-name',$ProjetoPages,'--env','preview') `
        -Label "Configurar secret $Name" `
        -InputText $Value `
        -SuppressOutput | Out-Null
}

$Pass1 = $null
$Pass2 = $null
$PlainPassword = $null
$PreviewUrl = $null

try {
    Write-Host ''
    Write-Host 'PA SAFRA - A19 - PREVIEW ADMINISTRATIVO' -ForegroundColor Cyan
    Write-Host 'Escopo: somente Preview Cloudflare; producao e GitHub write permanecem bloqueados.' -ForegroundColor Cyan
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

    $remoteHead = (Invoke-Native -Command 'git.exe' -Arguments @('rev-parse',"origin/$BranchEsperada") -Label 'Ler HEAD remoto A19').Text.Trim().ToLower()
    if ($remoteHead -notmatch '^[0-9a-f]{40}$') {
        throw "HEAD REMOTO A19 INVALIDO: $remoteHead"
    }

    $localRef = Invoke-Native -Command 'git.exe' -Arguments @('show-ref','--verify','--quiet',"refs/heads/$BranchEsperada") -Label 'Verificar branch local A19' -AllowFailure
    if ($localRef.Success) {
        Invoke-Native -Command 'git.exe' -Arguments @('switch',$BranchEsperada) -Label 'Entrar na A19' | Out-Null
        Invoke-Native -Command 'git.exe' -Arguments @('merge','--ff-only',"origin/$BranchEsperada") -Label 'Sincronizar A19' | Out-Null
    }
    else {
        Invoke-Native -Command 'git.exe' -Arguments @('switch','--track','-c',$BranchEsperada,"origin/$BranchEsperada") -Label 'Criar branch local A19' | Out-Null
    }

    $head = (Invoke-Native -Command 'git.exe' -Arguments @('rev-parse','HEAD') -Label 'Confirmar HEAD A19').Text.Trim().ToLower()
    if ($head -ne $remoteHead) {
        throw "HEAD LOCAL DIVERGE DO REMOTO A19. LOCAL=$head REMOTO=$remoteHead"
    }
    Write-Log "A19 sincronizada no HEAD $head"

    $who = ((Invoke-Wrangler -Arguments @('whoami','--json') -Label 'Validar login Cloudflare' -SuppressOutput).Text | ConvertFrom-Json)
    if (-not $who.loggedIn) {
        throw 'Wrangler nao esta autenticado.'
    }
    Write-Log 'Wrangler autenticado.'

    $previewList = @(((Invoke-Wrangler -Arguments @('pages','deployment','list','--project-name',$ProjetoPages,'--environment','preview','--json') -Label 'Validar projeto Pages' -SuppressOutput).Text | ConvertFrom-Json))
    if ($previewList.Count -lt 1) {
        throw "Projeto Pages/Preview nao confirmado: $ProjetoPages"
    }
    Write-Log 'Projeto Pages e ambiente Preview confirmados.'

    $d1List = @(((Invoke-Wrangler -Arguments @('d1','list','--json') -Label 'Validar D1' -SuppressOutput).Text | ConvertFrom-Json))
    $db = $d1List | Where-Object { $_.name -eq $BancoD1 -and $_.uuid -eq $BancoD1Id } | Select-Object -First 1
    if (-not $db) {
        throw "D1 ESPERADO NAO ENCONTRADO COM NOME/ID EXATOS: $BancoD1 / $BancoD1Id"
    }
    Write-Log "D1 confirmado: $BancoD1 / $BancoD1Id"

    $schemaRaw = (Invoke-Wrangler -Arguments @(
        'd1','execute',$BancoD1,'--remote',
        "--command=SELECT name FROM sqlite_schema WHERE type='table' AND name='admin_login_rate';",
        '--json'
    ) -Label 'Validar tabela D1' -SuppressOutput).Text
    if ($schemaRaw -notmatch 'admin_login_rate') {
        throw 'Tabela admin_login_rate nao foi confirmada no D1.'
    }
    Write-Log 'Schema D1 confirmado.'

    Write-Host ''
    Write-Host 'USUARIO DO PAINEL: admin' -ForegroundColor Green
    Write-Host 'Defina agora somente a senha. Ela nao sera gravada em arquivo nem exibida.' -ForegroundColor Cyan
    $Pass1 = Read-Host 'Senha (minimo 12 caracteres)' -AsSecureString
    $Pass2 = Read-Host 'Repita a senha' -AsSecureString

    $PlainPassword = Convert-SecureToPlain $Pass1
    $PlainPassword2 = Convert-SecureToPlain $Pass2
    try {
        if ($PlainPassword -ne $PlainPassword2) {
            throw 'AS SENHAS NAO COINCIDEM.'
        }
        if ($PlainPassword.Length -lt 12 -or $PlainPassword.Length -gt 256) {
            throw 'A SENHA DEVE TER ENTRE 12 E 256 CARACTERES.'
        }
    }
    finally {
        $PlainPassword2 = $null
    }

    $credentialJs = @'
const crypto = require('node:crypto');
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => input += c);
process.stdin.on('end', () => {
  const password = input.replace(/[\r\n]+$/, '');
  if (password.length < 12 || password.length > 256) process.exit(2);
  const iterations = 310000;
  const salt = crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  const session = crypto.randomBytes(32);
  const b64u = b => Buffer.from(b).toString('base64url');
  process.stdout.write(JSON.stringify({
    hash: `pbkdf2-sha256$${iterations}$${b64u(salt)}$${b64u(derived)}`,
    session: b64u(session)
  }));
});
'@
    Set-Content -LiteralPath $TempCredentialJs -Value $credentialJs -Encoding UTF8
    $generated = ((Invoke-Native -Command 'node.exe' -Arguments @($TempCredentialJs) -Label 'Gerar credenciais locais' -InputText $PlainPassword -SuppressOutput).Text | ConvertFrom-Json)
    if ([string]::IsNullOrWhiteSpace([string]$generated.hash) -or [string]::IsNullOrWhiteSpace([string]$generated.session)) {
        throw 'GERACAO LOCAL DE CREDENCIAIS FALHOU.'
    }
    Write-Log 'Hash de senha e segredo de sessao gerados localmente.'

    Put-PreviewSecret 'PA_SAFRA_ADMIN_ENABLED' 'true'
    Put-PreviewSecret 'PA_SAFRA_ADMIN_USER' $AdminUser
    Put-PreviewSecret 'PA_SAFRA_ADMIN_PASSWORD_HASH' ([string]$generated.hash)
    Put-PreviewSecret 'PA_SAFRA_SESSION_SECRET' ([string]$generated.session)
    Put-PreviewSecret 'PA_SAFRA_CONTENT_BRANCH' $ContentBranch
    Write-Log 'GITHUB_CONTENT_TOKEN deliberadamente NAO configurado.'

    Invoke-Native -Command 'npm.cmd' -Arguments @('ci') -Label 'Instalar dependencias' | Out-Null
    Invoke-Native -Command 'npm.cmd' -Arguments @('run','build') -Label 'Gerar build Preview' | Out-Null

    if (Test-Path -LiteralPath $TempConfig) {
        throw "CONFIG TEMPORARIA JA EXISTE E NAO SERA SOBRESCRITA: $TempConfig"
    }

    $config = [ordered]@{
        '$schema' = './node_modules/wrangler/config-schema.json'
        name = $ProjetoPages
        pages_build_output_dir = './dist'
        compatibility_date = '2026-09-11'
        env = [ordered]@{
            preview = [ordered]@{
                d1_databases = @(
                    [ordered]@{
                        binding = $BindingD1
                        database_name = $BancoD1
                        database_id = $BancoD1Id
                    }
                )
            }
        }
    } | ConvertTo-Json -Depth 10

    Set-Content -LiteralPath $TempConfig -Value $config -Encoding UTF8
    Write-Log 'Configuracao temporaria criada somente para aplicar binding D1 no Preview.'

    $deploy = Invoke-Wrangler -Arguments @(
        'pages','deploy','dist',
        '--project-name',$ProjetoPages,
        '--branch',$BranchEsperada,
        '--env','preview',
        '--config',$TempConfig,
        '--experimental-provision=false',
        '--experimental-auto-create=false',
        '--install-skills=false'
    ) -Label 'Deploy Preview A19'

    $urlMatches = [regex]::Matches($deploy.Text, 'https://[A-Za-z0-9.-]+\.pages\.dev')
    if ($urlMatches.Count -lt 1) {
        throw 'DEPLOY CONCLUIU, MAS A URL PAGES.DEV NAO FOI IDENTIFICADA.'
    }
    $PreviewUrl = $urlMatches[$urlMatches.Count - 1].Value.TrimEnd('/')
    Write-Log "Preview A19: $PreviewUrl"

    Remove-Item -LiteralPath $TempConfig -Force -ErrorAction Stop
    Write-Log 'Configuracao temporaria local removida.'

    Start-Sleep -Seconds 2

    Write-Log 'Validando status remoto sem sessao.'
    $status0 = Invoke-RestMethod -Uri "$PreviewUrl/api/admin/status" -Method Get -Headers @{ 'Cache-Control' = 'no-cache' }
    if (-not $status0.enabled) { throw 'Preview nao confirmou PA_SAFRA_ADMIN_ENABLED.' }
    if (-not $status0.credentials_configured) { throw 'Preview nao confirmou credenciais.' }
    if (-not $status0.rate_limit_configured -or $status0.rate_limit_backend -ne 'd1') { throw 'Preview nao confirmou rate limiter D1.' }
    if ($status0.token_configured -or $status0.write_enabled) { throw 'ESCRITA GITHUB APARECEU HABILITADA INDEVIDAMENTE.' }
    if ([string]$status0.branch -ne $ContentBranch) { throw "Branch editorial inesperada: $($status0.branch)" }
    Write-Log 'Status remoto confirmou: admin + credenciais + D1; GitHub write bloqueado.'

    $loginBody = @{ username = $AdminUser; password = $PlainPassword } | ConvertTo-Json -Compress
    $started = Get-Date
    $login = Invoke-RestMethod `
        -Uri "$PreviewUrl/api/admin/login" `
        -Method Post `
        -ContentType 'application/json' `
        -Body $loginBody `
        -Headers @{ Origin = $PreviewUrl } `
        -SessionVariable AdminSession
    $elapsedMs = [int]((Get-Date) - $started).TotalMilliseconds

    if (-not $login.ok) {
        throw 'LOGIN REAL DO PREVIEW NAO RETORNOU ok=true.'
    }
    Write-Log "Login real: PASS (${elapsedMs} ms)."

    $status1 = Invoke-RestMethod -Uri "$PreviewUrl/api/admin/status" -Method Get -WebSession $AdminSession
    if (-not $status1.authenticated) { throw 'SESSAO NAO FOI RECONHECIDA APOS LOGIN.' }
    if ($status1.token_configured -or $status1.write_enabled) { throw 'GITHUB WRITE FOI HABILITADO INDEVIDAMENTE.' }

    $logout = Invoke-RestMethod `
        -Uri "$PreviewUrl/api/admin/logout" `
        -Method Post `
        -ContentType 'application/json' `
        -Body '{}' `
        -Headers @{ Origin = $PreviewUrl } `
        -WebSession $AdminSession
    if (-not $logout.ok) { throw 'LOGOUT NAO RETORNOU ok=true.' }
    Write-Log 'Sessao e logout: PASS.'

    Write-Host ''
    Write-Host 'PA SAFRA A19 PREVIEW AUTH: PASS' -ForegroundColor Green
    Write-Host "Preview: $PreviewUrl" -ForegroundColor Green
    Write-Host "Login PBKDF2 observado: ${elapsedMs} ms" -ForegroundColor Green
    Write-Host 'GITHUB_CONTENT_TOKEN: NAO CONFIGURADO' -ForegroundColor Yellow
    Write-Host 'ESCRITA DE CONTEUDO: BLOQUEADA' -ForegroundColor Yellow
    Write-Host 'PRODUCAO / MAIN / DEVELOP / DOMINIO / DNS: NAO ALTERADOS POR ESTE SCRIPT' -ForegroundColor Green
    Write-Host "Log: $LogPath" -ForegroundColor Cyan
}
catch {
    Write-Host ''
    Write-Host 'PA SAFRA A19 PREVIEW AUTH: FALHA' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "Log: $LogPath" -ForegroundColor Yellow
    exit 1
}
finally {
    if (Test-Path -LiteralPath $TempConfig) {
        Remove-Item -LiteralPath $TempConfig -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path -LiteralPath $TempCredentialJs) {
        Remove-Item -LiteralPath $TempCredentialJs -Force -ErrorAction SilentlyContinue
    }
    $PlainPassword = $null
    if ($null -ne $Pass1) { try { $Pass1.Dispose() } catch { } }
    if ($null -ne $Pass2) { try { $Pass2.Dispose() } catch { } }
}
