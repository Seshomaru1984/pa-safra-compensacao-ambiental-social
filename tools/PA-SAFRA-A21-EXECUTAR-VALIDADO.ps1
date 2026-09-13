$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Raiz = Join-Path $env:USERPROFILE 'PA SAFRA'
$RepositorioEsperado = 'https://github.com/Seshomaru1984/pa-safra-compensacao-ambiental-social.git'
$Branch = 'ops/pa-v001-a21-preview-content-write-e2e'
$CommitValidado = '7cb7d43973fca79f139d3e2e1943dbba6e47819f'
$ScriptRel = 'tools/PA-SAFRA-A21-VALIDAR-ESCRITA-PREVIEW.ps1'
$Temp = Join-Path $env:TEMP ("PA-SAFRA-A21-$([guid]::NewGuid().ToString('N')).ps1")

if (-not (Test-Path -LiteralPath (Join-Path $Raiz '.git') -PathType Container)) {
    throw "CLONE LOCAL DO PA SAFRA NAO ENCONTRADO: $Raiz"
}

Set-Location $Raiz

$remoteRaw = @(& git.exe remote get-url origin 2>&1)
$remoteExit = $LASTEXITCODE
$remote = (($remoteRaw | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim()
if ($remoteExit -ne 0 -or $remote -ne $RepositorioEsperado) {
    throw 'REMOTE INCORRETO. EXECUCAO BLOQUEADA.'
}

& git.exe fetch origin $Branch
if ($LASTEXITCODE -ne 0) {
    throw 'FETCH DA A21 FALHOU.'
}

$remoteHeadRaw = @(& git.exe rev-parse "origin/$Branch" 2>&1)
$remoteHeadExit = $LASTEXITCODE
$remoteHead = (($remoteHeadRaw | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim().ToLowerInvariant()
if ($remoteHeadExit -ne 0 -or $remoteHead -notmatch '^[0-9a-f]{40}$') {
    throw 'HEAD REMOTO A21 INVALIDO.'
}

& git.exe merge-base --is-ancestor $CommitValidado $remoteHead
if ($LASTEXITCODE -ne 0) {
    throw 'COMMIT A21 VALIDADO NAO E ANCESTRAL DO HEAD REMOTO. EXECUCAO BLOQUEADA.'
}

$spec = "${CommitValidado}:$ScriptRel"
$conteudo = @(& git.exe show $spec 2>&1)
if ($LASTEXITCODE -ne 0 -or $conteudo.Count -lt 1) {
    throw 'NAO FOI POSSIVEL OBTER O GATE A21 VALIDADO.'
}

Set-Content -LiteralPath $Temp -Value ($conteudo -join [Environment]::NewLine) -Encoding UTF8

$tokens = $null
$erros = $null
[System.Management.Automation.Language.Parser]::ParseFile(
    $Temp,
    [ref]$tokens,
    [ref]$erros
) | Out-Null

if (@($erros).Count -gt 0) {
    throw 'PARSER POWERSHELL REPROVOU O GATE A21 VALIDADO.'
}

try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Temp
    $codigo = $LASTEXITCODE
}
finally {
    Remove-Item -LiteralPath $Temp -Force -ErrorAction SilentlyContinue
}

if ($codigo -ne 0) {
    throw "A21 TERMINOU COM FALHA (exit $codigo). ENVIE O LOG PA-A21-CONTENT-WRITE GERADO."
}
