$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositorioEsperado = 'https://github.com/Seshomaru1984/pa-safra-compensacao-ambiental-social.git'
$RepositorioApi = 'https://api.github.com/repos/Seshomaru1984/pa-safra-compensacao-ambiental-social'
$BranchEsperada = 'ops/pa-v001-a21-preview-content-write-e2e'
$ContentBranch = 'content/pa-v001-admin-preview'
$ProjetoPages = 'pa-safra-compensacao-ambiental-social'
$BancoD1 = 'pa-safra-auth-preview'
$BancoD1Id = 'e99dd1d3-977e-40fd-a814-a00e269fc423'
$AdminUser = 'admin'
$Raiz = Join-Path $env:USERPROFILE 'PA SAFRA'
$BuildScript = Join-Path $Raiz 'tools\PA-SAFRA-BUILD-E-ARQUIVAR.ps1'
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogDir = Join-Path $env:USERPROFILE 'Downloads\PA-SAFRA-LOGS'
$LogPath = Join-Path $LogDir "PA-A21-CONTENT-WRITE-$Timestamp.log"
$RootConfigNames = @('wrangler.toml', 'wrangler.json', 'wrangler.jsonc')

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

    $params = @{
        Command = 'npx.cmd'
        Arguments = (@('--yes', 'wrangler@latest') + $Arguments)
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

function Get-GitHubJsonFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Token
    )

    $headers = @{
        Authorization = "Bearer $Token"
        Accept = 'application/vnd.github+json'
        'X-GitHub-Api-Version' = '2022-11-28'
        'User-Agent' = 'pa-safra-a21-gate'
    }
    $encodedRef = [uri]::EscapeDataString($ContentBranch)
    try {
        $file = Invoke-RestMethod -Uri "$RepositorioApi/contents/$Path?ref=$encodedRef" -Method Get -Headers $headers
    }
    catch {
        throw 'TOKEN GITHUB NAO CONSEGUIU LER A BRANCH EDITORIAL AUTORIZADA.'
    }

    if ([string]::IsNullOrWhiteSpace([string]$file.sha) -or [string]::IsNullOrWhiteSpace([string]$file.content)) {
        throw 'GITHUB NAO RETORNOU SHA/CONTEUDO ESPERADOS.'
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
        [Parameter(Mandatory = $true)][string]$PreviewUrl,
        [Parameter(Mandatory = $true)]$Session,
        [Parameter(Mandatory = $true)][string]$Resource,
        [Parameter(Mandatory = $true)]$Data
    )

    $payload = @{ resource = $Resource; data = $Data } | ConvertTo-Json -Depth 100 -Compress
    return Invoke-RestMethod `
        -Uri "$PreviewUrl/api/admin/content" `
        -Method Put `
        -ContentType 'application/json' `
        -Body $payload `
        -Headers @{ Origin = $PreviewUrl; 'Sec-Fetch-Site' = 'same-origin' } `
        -WebSession $Session
}

$PatSecure = $null
$AdminPass1 = $null
$AdminPass2 = $null
$Pat = $null
$AdminPassword = $null
$AdminPassword2 = $null
$PreviewUrl = $null
$OriginalVideos = $null
$MutationApplied = $false
$RestoreConfirmed = $false

try {
    Write-Host ''
    Write-Host 'PA SAFRA - A21 - ESCRITA EDITORIAL CONTROLADA NO PREVIEW' -ForegroundColor Cyan
    Write-Host 'Escopo: somente content/pa-v001-admin-preview + Cloudflare Preview.' -ForegroundColor Cyan
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
        $relevantes = @($status -split "`r?`n" | Where-Object { $_ -and $_ -notmatch '^\?\? \.wrangler[/\\]' })
    }
    if ($relevantes.Count -gt 0) {
        throw "WORKTREE POSSUI ALTERACOES FORA DE .wrangler: $($relevantes -join ' | ')"
    }

    foreach ($name in $RootConfigNames) {
        if (Test-Path -LiteralPath (Join-Path $Raiz $name) -PathType Leaf) {
            throw "CONFIG WRANGLER NO ROOT DETECTADA ($name). A21 NAO PROSSEGUE COM CONFIG LOCAL AMBIGUA."
        }
    }

    Invoke-Native -Command 'git.exe' -Arguments @('fetch','origin','--prune') -Label 'Atualizar referencias' | Out-Null
    $remoteHead = (Invoke-Native -Command 'git.exe' -Arguments @('rev-parse',"origin/$BranchEsperada") -Label 'Ler HEAD remoto A21').Text.Trim().ToLowerInvariant()
    $contentHead = (Invoke-Native -Command 'git.exe' -Arguments @('rev-parse',"origin/$ContentBranch") -Label 'Ler HEAD da branch editorial').Text.Trim().ToLowerInvariant()
    if ($remoteHead -notmatch '^[0-9a-f]{40}$' -or $contentHead -notmatch '^[0-9a-f]{40}$') {
        throw 'HEAD REMOTO INVALIDO.'
    }
    if ($contentHead -ne $remoteHead) {
        throw "BRANCH EDITORIAL NAO ESTA SINCRONIZADA COM A21. A21=$remoteHead CONTENT=$contentHead"
    }

    $localRef = Invoke-Native -Command 'git.exe' -Arguments @('show-ref','--verify','--quiet',"refs/heads/$BranchEsperada") -Label 'Verificar branch local A21' -AllowFailure
    if ($localRef.Success) {
        Invoke-Native -Command 'git.exe' -Arguments @('switch',$BranchEsperada) -Label 'Entrar na A21' | Out-Null
        Invoke-Native -Command 'git.exe' -Arguments @('merge','--ff-only',"origin/$BranchEsperada") -Label 'Sincronizar A21' | Out-Null
    }
    else {
        Invoke-Native -Command 'git.exe' -Arguments @('switch','--track','-c',$BranchEsperada,"origin/$BranchEsperada") -Label 'Criar branch local A21' | Out-Null
    }
    $head = (Invoke-Native -Command 'git.exe' -Arguments @('rev-parse','HEAD') -Label 'Confirmar HEAD A21').Text.Trim().ToLowerInvariant()
    if ($head -ne $remoteHead) {
        throw "HEAD LOCAL DIVERGE DO REMOTO A21. LOCAL=$head REMOTO=$remoteHead"
    }
    Write-Log "A21 sincronizada no HEAD $head; branch editorial aponta para o mesmo checkpoint."

    $who = ((Invoke-Wrangler -Arguments @('whoami','--json') -Label 'Validar login Cloudflare' -SuppressOutput).Text | ConvertFrom-Json)
    if (-not $who.loggedIn) {
        throw 'WRANGLER NAO ESTA AUTENTICADO.'
    }
    Write-Log 'Wrangler autenticado.'

    $d1List = @(((Invoke-Wrangler -Arguments @('d1','list','--json') -Label 'Validar D1' -SuppressOutput).Text | ConvertFrom-Json))
    $db = $d1List | Where-Object { $_.name -eq $BancoD1 -and $_.uuid -eq $BancoD1Id } | Select-Object -First 1
    if (-not $db) {
        throw "D1 ESPERADO NAO ENCONTRADO: $BancoD1 / $BancoD1Id"
    }
    Write-Log 'D1 de Preview confirmado.'

    if (-not (Test-Path -LiteralPath $BuildScript -PathType Leaf)) {
        throw "SCRIPT DE BUILD PADRAO AUSENTE: $BuildScript"
    }
    Invoke-Native -Command 'powershell.exe' -Arguments @('-NoProfile','-ExecutionPolicy','Bypass','-File',$BuildScript,'-NaoAbrirPasta') -Label 'Build local auditado e arquivado' | Out-Null
    if (-not (Test-Path -LiteralPath (Join-Path $Raiz 'dist') -PathType Container)) {
        throw 'DIST NAO FOI GERADO PELO BUILD NORMATIVO.'
    }
    Write-Log 'Build normativo, smoke, ZIP e SHA-256 concluidos.'

    Write-Host ''
    Write-Host 'Cole o Fine-grained Personal Access Token do GitHub.' -ForegroundColor Cyan
    Write-Host 'O token deve estar restrito somente a este repositorio e Contents: Read and write.' -ForegroundColor Cyan
    $PatSecure = Read-Host 'Token GitHub' -AsSecureString
    $Pat = Convert-SecureToPlain $PatSecure
    if ([string]::IsNullOrWhiteSpace($Pat) -or $Pat.Length -lt 20) {
        throw 'TOKEN GITHUB AUSENTE OU INVALIDO.'
    }

    $probe = Get-GitHubJsonFile -Path 'public/content/videos.json' -Token $Pat
    Write-Log "Token GitHub confirmou leitura da branch editorial; SHA videos=$($probe.Sha.Substring(0,12))."

    Write-Log 'Configurando GITHUB_CONTENT_TOKEN somente no ambiente Preview.'
    Invoke-Wrangler `
        -Arguments @('pages','secret','put','GITHUB_CONTENT_TOKEN','--project-name',$ProjetoPages,'--env','preview') `
        -Label 'Configurar GITHUB_CONTENT_TOKEN de Preview' `
        -InputText $Pat `
        -SuppressOutput | Out-Null

    $secretList = (Invoke-Wrangler -Arguments @('pages','secret','list','--project-name',$ProjetoPages,'--env','preview') -Label 'Confirmar secret de Preview' -SuppressOutput).Text
    if ($secretList -notmatch 'GITHUB_CONTENT_TOKEN') {
        throw 'GITHUB_CONTENT_TOKEN NAO FOI CONFIRMADO NO PREVIEW.'
    }
    Write-Log 'GITHUB_CONTENT_TOKEN confirmado no Preview; nenhum secret de Production foi alterado pelo script.'

    $deploy = Invoke-Wrangler -Arguments @(
        'pages','deploy','dist',
        '--project-name',$ProjetoPages,
        '--branch',$ContentBranch,
        '--commit-hash',$head,
        '--commit-message','PA-V001-A21 preview content write e2e',
        '--experimental-provision=false',
        '--experimental-auto-create=false',
        '--install-skills=false'
    ) -Label 'Deploy Preview A21'

    $urlMatches = [regex]::Matches($deploy.Text, 'https://[A-Za-z0-9.-]+\.pages\.dev')
    if ($urlMatches.Count -lt 1) {
        throw 'DEPLOY A21 CONCLUIU, MAS A URL PAGES.DEV NAO FOI IDENTIFICADA.'
    }
    $PreviewUrl = $urlMatches[$urlMatches.Count - 1].Value.TrimEnd('/')
    Write-Log "Preview A21: $PreviewUrl"
    Start-Sleep -Seconds 3

    $status0 = Invoke-RestMethod -Uri "$PreviewUrl/api/admin/status" -Method Get -Headers @{ 'Cache-Control' = 'no-cache' }
    if (-not $status0.enabled -or -not $status0.credentials_configured -or -not $status0.rate_limit_configured -or $status0.rate_limit_backend -ne 'd1') {
        throw 'PREVIEW A21 NAO CONFIRMOU AUTH + D1.'
    }
    if (-not $status0.token_configured) {
        throw 'PREVIEW A21 NAO CONFIRMOU GITHUB_CONTENT_TOKEN.'
    }
    if ($status0.write_enabled) {
        throw 'WRITE_ENABLED NAO PODE SER TRUE SEM SESSAO AUTENTICADA.'
    }
    if ([string]$status0.branch -ne $ContentBranch) {
        throw "BRANCH EDITORIAL INESPERADA NO RUNTIME: $($status0.branch)"
    }
    Write-Log 'Status sem sessao: token presente, D1 presente, write_enabled=false e branch editorial correta.'

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
        throw 'LOGIN A21 NAO RETORNOU ok=true.'
    }

    $status1 = Invoke-RestMethod -Uri "$PreviewUrl/api/admin/status" -Method Get -WebSession $AdminSession -Headers @{ 'Cache-Control' = 'no-cache' }
    if (-not $status1.authenticated -or -not $status1.token_configured -or -not $status1.write_enabled) {
        throw 'SESSAO A21 NAO HABILITOU ESCRITA CONTROLADA.'
    }
    if ([string]$status1.branch -ne $ContentBranch) {
        throw 'SESSAO A21 APONTOU PARA BRANCH EDITORIAL INESPERADA.'
    }
    Write-Log 'Login e sessao: PASS; write_enabled=true somente apos autenticacao.'

    $originalFile = Get-GitHubJsonFile -Path 'public/content/videos.json' -Token $Pat
    $OriginalVideos = @($originalFile.Json)
    $testMarker = "PA-SAFRA-A21-$([guid]::NewGuid().ToString('N'))"
    $nextVideos = @($OriginalVideos) + @([pscustomobject]@{
        title = "Teste tecnico A21 - $testMarker"
        description = 'Registro temporario e nao publicado para validar escrita editorial controlada.'
        youtube_url = 'https://youtu.be/dQw4w9WgXcQ'
        published = $false
    })

    $write1 = Invoke-AdminPut -PreviewUrl $PreviewUrl -Session $AdminSession -Resource 'videos' -Data $nextVideos
    if (-not $write1.ok -or [string]$write1.branch -ne $ContentBranch -or [string]::IsNullOrWhiteSpace([string]$write1.commit)) {
        throw 'PRIMEIRA ESCRITA EDITORIAL NAO FOI CONFIRMADA.'
    }
    $MutationApplied = $true
    Write-Log "Escrita controlada: PASS; commit temporario=$([string]$write1.commit)."

    $afterWrite = Get-GitHubJsonFile -Path 'public/content/videos.json' -Token $Pat
    $foundMarker = @($afterWrite.Json | Where-Object { $_.title -like "*$testMarker*" -and $_.published -eq $false })
    if ($foundMarker.Count -ne 1) {
        throw 'GITHUB NAO CONFIRMOU O REGISTRO TEMPORARIO NA BRANCH EDITORIAL.'
    }
    Write-Log 'GitHub confirmou o registro temporario somente na branch editorial autorizada.'

    $write2 = Invoke-AdminPut -PreviewUrl $PreviewUrl -Session $AdminSession -Resource 'videos' -Data $OriginalVideos
    if (-not $write2.ok -or [string]$write2.branch -ne $ContentBranch -or [string]::IsNullOrWhiteSpace([string]$write2.commit)) {
        throw 'RESTAURACAO EDITORIAL NAO FOI CONFIRMADA.'
    }

    $afterRestore = Get-GitHubJsonFile -Path 'public/content/videos.json' -Token $Pat
    $originalCanonical = ($OriginalVideos | ConvertTo-Json -Depth 100 -Compress)
    $restoredCanonical = (@($afterRestore.Json) | ConvertTo-Json -Depth 100 -Compress)
    if ($originalCanonical -cne $restoredCanonical) {
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
        throw 'LOGOUT A21 NAO RETORNOU ok=true.'
    }

    $status2 = Invoke-RestMethod -Uri "$PreviewUrl/api/admin/status" -Method Get -Headers @{ 'Cache-Control' = 'no-cache' }
    if ($status2.authenticated -or -not $status2.token_configured -or $status2.write_enabled) {
        throw 'ESTADO FINAL A21 INESPERADO APOS LOGOUT.'
    }
    Write-Log 'Logout: PASS; token permanece configurado no Preview, mas escrita exige sessao valida.'

    Write-Log 'A21 F1: PASS. Escrita e restauracao comprovadas exclusivamente em content/pa-v001-admin-preview.'
    Write-Host ''
    Write-Host 'PA SAFRA A21 CONTENT WRITE LIVE: PASS' -ForegroundColor Green
    Write-Host 'BRANCH EDITORIAL: content/pa-v001-admin-preview' -ForegroundColor Green
    Write-Host 'PRODUCAO / MAIN / DEVELOP / DOMINIO / DNS: NAO ALTERADOS POR ESTE SCRIPT' -ForegroundColor Green
    Write-Host 'admin_nativo_validado: AINDA FALSE; UX completa permanece gate posterior.' -ForegroundColor Yellow
    Write-Host "LOG: $LogPath" -ForegroundColor Cyan
}
catch {
    Write-Host ''
    Write-Host 'PA SAFRA A21 CONTENT WRITE LIVE: FALHA' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Add-Content -LiteralPath $LogPath -Value ("FALHA: {0}" -f $_.Exception.Message) -Encoding UTF8
    if ($MutationApplied -and -not $RestoreConfirmed) {
        Add-Content -LiteralPath $LogPath -Value '[ALERTA] O teste temporario pode permanecer na branch editorial; nao avancar para o proximo gate antes de auditar/restaurar.' -Encoding UTF8
    }
    exit 1
}
finally {
    $Pat = $null
    $AdminPassword = $null
    $AdminPassword2 = $null
    $PatSecure = $null
    $AdminPass1 = $null
    $AdminPass2 = $null
}
