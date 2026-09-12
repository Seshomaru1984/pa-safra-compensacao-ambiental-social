$ErrorActionPreference = 'Stop'

$RepositorioEsperado = 'https://github.com/Seshomaru1984/pa-safra-compensacao-ambiental-social.git'
$BranchEsperada = 'ops/pa-v001-a18-cloudflare-preview-admin'
$ProvisionadorRelativo = 'tools/PA-SAFRA-PROVISIONAR-D1-PREVIEW.ps1'
$Raiz = Join-Path $env:USERPROFILE 'PA SAFRA'
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogDir = Join-Path $env:USERPROFILE 'Downloads\PA-SAFRA-LOGS'
$LogPath = Join-Path $LogDir "PA-A18-D1-$Timestamp.log"

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
    if (-not [string]::IsNullOrWhiteSpace($text)) {
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

function Assert-PowerShellFile {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "SCRIPT AUSENTE: $Path"
    }

    $tokens = $null
    $errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile(
        $Path,
        [ref]$tokens,
        [ref]$errors
    ) | Out-Null

    if (@($errors).Count -gt 0) {
        $messages = @($errors | ForEach-Object { $_.Message }) -join ' | '
        throw "PARSER POWERSHELL REPROVOU $Path :: $messages"
    }
}

try {
    Write-Host ''
    Write-Host 'PA SAFRA - A18 - CONTINUAR D1 DE PREVIEW' -ForegroundColor Cyan
    Write-Host 'Escopo: somente repositorio PA Safra + D1 pa-safra-auth-preview' -ForegroundColor Cyan
    Write-Host ''

    if (-not (Test-Path -LiteralPath (Join-Path $Raiz '.git') -PathType Container)) {
        throw "CLONE LOCAL DO PA SAFRA NAO ENCONTRADO: $Raiz"
    }

    Set-Location $Raiz

    $remote = (Invoke-Native -Command 'git.exe' -Arguments @('remote','get-url','origin') -Label 'Validar remote').Text.Trim()
    if ($remote -ne $RepositorioEsperado) {
        throw "REMOTE NAO AUTORIZADO: $remote"
    }
    Write-Log 'Repositorio autorizado confirmado.'

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
    Write-Log 'Worktree confirmado sem alteracoes relevantes.'

    Invoke-Native -Command 'git.exe' -Arguments @('fetch','origin','--prune') -Label 'Atualizar referencias' | Out-Null

    $remoteHead = (Invoke-Native -Command 'git.exe' -Arguments @('rev-parse',"origin/$BranchEsperada") -Label 'Ler HEAD remoto A18').Text.Trim().ToLower()
    if ($remoteHead -notmatch '^[0-9a-f]{40}$') {
        throw "HEAD REMOTO A18 INVALIDO: $remoteHead"
    }

    $localRef = Invoke-Native -Command 'git.exe' -Arguments @('show-ref','--verify','--quiet',"refs/heads/$BranchEsperada") -Label 'Verificar branch local A18' -AllowFailure

    if ($localRef.Success) {
        Invoke-Native -Command 'git.exe' -Arguments @('switch',$BranchEsperada) -Label 'Entrar na branch A18' | Out-Null
        Invoke-Native -Command 'git.exe' -Arguments @('merge','--ff-only',"origin/$BranchEsperada") -Label 'Sincronizar A18 por fast-forward' | Out-Null
    }
    else {
        Invoke-Native -Command 'git.exe' -Arguments @('switch','--track','-c',$BranchEsperada,"origin/$BranchEsperada") -Label 'Criar branch local A18 a partir do origin' | Out-Null
    }

    $head = (Invoke-Native -Command 'git.exe' -Arguments @('rev-parse','HEAD') -Label 'Confirmar HEAD local A18').Text.Trim().ToLower()
    if ($head -ne $remoteHead) {
        throw "HEAD LOCAL DIVERGE DO HEAD REMOTO A18. LOCAL=$head REMOTO=$remoteHead"
    }
    Write-Log "A18 sincronizada no HEAD $head"

    $statusDepois = (Invoke-Native -Command 'git.exe' -Arguments @('status','--porcelain=v1','--untracked-files=all') -Label 'Revalidar worktree').Text
    $relevantesDepois = @()
    if (-not [string]::IsNullOrWhiteSpace($statusDepois)) {
        $relevantesDepois = @(
            $statusDepois -split "`r?`n" |
            Where-Object { $_ -and $_ -notmatch '^\?\? \.wrangler[/\\]' }
        )
    }
    if ($relevantesDepois.Count -gt 0) {
        throw "WORKTREE DEIXOU DE ESTAR LIMPO: $($relevantesDepois -join ' | ')"
    }

    $provisionador = Join-Path $Raiz $ProvisionadorRelativo
    Assert-PowerShellFile -Path $provisionador
    Write-Log 'Provisionador D1 presente e aprovado pelo parser local.'

    Write-Host ''
    Write-Host 'INICIANDO PROVISIONAMENTO CONTROLADO DO D1 DE PREVIEW...' -ForegroundColor Cyan

    Invoke-Native -Command 'powershell.exe' -Arguments @('-NoProfile','-ExecutionPolicy','Bypass','-File',$provisionador) -Label 'Provisionar D1 de preview' | Out-Null

    Write-Host ''
    Write-Host 'PA SAFRA A18 D1: PASS' -ForegroundColor Green
    Write-Host "Log: $LogPath" -ForegroundColor Cyan
    Write-Host 'Nenhuma etapa deste script altera main, develop, dominio, DNS, secrets ou bindings do Pages.' -ForegroundColor Green
}
catch {
    Write-Host ''
    Write-Host 'PA SAFRA A18 D1: FALHA' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "Log: $LogPath" -ForegroundColor Yellow
    exit 1
}
