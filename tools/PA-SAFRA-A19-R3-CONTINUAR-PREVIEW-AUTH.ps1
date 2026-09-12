$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositorioEsperado = 'https://github.com/Seshomaru1984/pa-safra-compensacao-ambiental-social.git'
$Branch = 'ops/pa-v001-a19-preview-auth-e2e'
$Raiz = Join-Path $env:USERPROFILE 'PA SAFRA'
$SourceCommit = 'dfa6efa5609cb9cc4fa7386fa03608d5edb05fc7'
$SourcePath = 'tools/PA-SAFRA-A19-CONFIGURAR-PREVIEW-AUTH.ps1'
$TempScript = Join-Path $env:TEMP ("PA-SAFRA-A19-R3-$([guid]::NewGuid().ToString('N')).ps1")
$CanonicalWrangler = @('wrangler.toml', 'wrangler.json', 'wrangler.jsonc')

function Fail {
    param([Parameter(Mandatory = $true)][string]$Message)
    throw $Message
}

if (-not (Test-Path -LiteralPath (Join-Path $Raiz '.git') -PathType Container)) {
    Fail "CLONE LOCAL DO PA SAFRA NAO ENCONTRADO: $Raiz"
}

Set-Location $Raiz

$remote = (& git.exe remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0 -or $remote -ne $RepositorioEsperado) {
    Fail "REMOTE NAO AUTORIZADO. EXECUCAO BLOQUEADA."
}

Write-Host 'PA SAFRA - A19 R3 - CORRECAO PROCEDURAL DO DEPLOY PREVIEW' -ForegroundColor Cyan
Write-Host 'Repositorio autorizado: OK' -ForegroundColor Green

foreach ($name in $CanonicalWrangler) {
    $statusArquivo = (& git.exe status --porcelain=v1 --untracked-files=all -- $name).Trim()
    if ($LASTEXITCODE -ne 0) {
        Fail "NAO FOI POSSIVEL AUDITAR $name."
    }

    if ($statusArquivo -eq "?? $name") {
        Remove-Item -LiteralPath (Join-Path $Raiz $name) -Force
        Write-Host "Residuo temporario removido: $name" -ForegroundColor Yellow
    }
    elseif (-not [string]::IsNullOrWhiteSpace($statusArquivo)) {
        Fail "$name NAO E APENAS UM RESIDUO NAO VERSIONADO. EXECUCAO BLOQUEADA: $statusArquivo"
    }
}

$status = @(& git.exe status --porcelain=v1 --untracked-files=all)
if ($LASTEXITCODE -ne 0) {
    Fail 'NAO FOI POSSIVEL VALIDAR O WORKTREE.'
}
$relevantes = @($status | Where-Object { $_ -and $_ -notmatch '^\?\? \.wrangler[/\\]' })
if ($relevantes.Count -gt 0) {
    $relevantes | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
    Fail 'WORKTREE POSSUI ALTERACOES RELEVANTES. EXECUCAO BLOQUEADA.'
}

& git.exe fetch origin $Branch
if ($LASTEXITCODE -ne 0) {
    Fail 'FETCH DA A19 FALHOU.'
}

$local = & git.exe show-ref --verify --quiet "refs/heads/$Branch"
$localCode = $LASTEXITCODE
if ($localCode -eq 0) {
    & git.exe switch $Branch
    if ($LASTEXITCODE -ne 0) { Fail 'NAO FOI POSSIVEL ENTRAR NA A19.' }
    & git.exe merge --ff-only "origin/$Branch"
    if ($LASTEXITCODE -ne 0) { Fail 'FAST-FORWARD DA A19 FALHOU.' }
}
else {
    & git.exe switch --track -c $Branch "origin/$Branch"
    if ($LASTEXITCODE -ne 0) { Fail 'NAO FOI POSSIVEL CRIAR A A19 LOCAL.' }
}

$sourceSpec = "$SourceCommit`:$SourcePath"
$sourceLines = @(& git.exe show $sourceSpec)
if ($LASTEXITCODE -ne 0 -or $sourceLines.Count -lt 1) {
    Fail 'NAO FOI POSSIVEL LER O CONFIGURADOR A19 R2 VALIDADO.'
}
$source = $sourceLines -join [Environment]::NewLine

$pattern = "(?m)^\s*'--env','preview',\s*\r?\n"
$matches = [regex]::Matches($source, $pattern)
if ($matches.Count -ne 1) {
    Fail "CORRECAO R3 ESPERAVA EXATAMENTE 1 FLAG --env preview NO DEPLOY, MAS ENCONTROU $($matches.Count)."
}

$patched = [regex]::Replace($source, $pattern, '', 1)
if ($patched -match "(?m)^\s*'--env','preview',\s*$") {
    Fail 'FLAG --env preview PERMANECEU NO BLOCO DE DEPLOY. EXECUCAO BLOQUEADA.'
}

Set-Content -LiteralPath $TempScript -Value $patched -Encoding UTF8

$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile(
    $TempScript,
    [ref]$tokens,
    [ref]$errors
) | Out-Null
if (@($errors).Count -gt 0) {
    $errors | ForEach-Object { Write-Host $_.Message -ForegroundColor Red }
    Fail 'PARSER POWERSHELL REPROVOU O CONFIGURADOR A19 R3.'
}

Write-Host 'Correcao R3 aplicada em copia temporaria: Pages sera direcionado por --branch, sem --env.' -ForegroundColor Green
Write-Host 'Producao, main, develop, dominio, DNS e GitHub write permanecem fora de escopo.' -ForegroundColor Green
Write-Host ''

try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $TempScript
    $exitCode = $LASTEXITCODE
}
finally {
    Remove-Item -LiteralPath $TempScript -Force -ErrorAction SilentlyContinue
}

if ($exitCode -ne 0) {
    Fail "A19 R3 TERMINOU COM FALHA (exit $exitCode). ENVIE O NOVO LOG PA-A19-PREVIEW-AUTH."
}

Write-Host ''
Write-Host 'A19 R3 CONCLUIDA. ENVIE O LOG GERADO PARA O PROXIMO GATE.' -ForegroundColor Green
