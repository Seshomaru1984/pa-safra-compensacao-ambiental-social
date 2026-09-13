$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Raiz = Join-Path $env:USERPROFILE 'PA SAFRA'
$RepositorioEsperado = 'https://github.com/Seshomaru1984/pa-safra-compensacao-ambiental-social.git'
$Branch = 'ops/pa-v001-a20-preview-rate-limit-e2e'
$CommitValidado = '76ff50a8fcee0e47cece7fd53f2b6014290aa86f'
$ScriptRel = 'tools/PA-SAFRA-A20-VALIDAR-RATE-LIMIT-PREVIEW.ps1'
$Temp = Join-Path $env:TEMP ("PA-SAFRA-A20-$([guid]::NewGuid().ToString('N')).ps1")

if (-not (Test-Path -LiteralPath (Join-Path $Raiz '.git') -PathType Container)) {
    throw "CLONE LOCAL DO PA SAFRA NAO ENCONTRADO: $Raiz"
}

Set-Location $Raiz

$remote = (& git.exe remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0 -or $remote -ne $RepositorioEsperado) {
    throw 'REMOTE INCORRETO. EXECUCAO BLOQUEADA.'
}

& git.exe fetch origin $Branch
if ($LASTEXITCODE -ne 0) {
    throw 'FETCH DA A20 FALHOU.'
}

$remoteHead = (& git.exe rev-parse "origin/$Branch").Trim().ToLowerInvariant()
$ancestral = $false
& git.exe merge-base --is-ancestor $CommitValidado $remoteHead
if ($LASTEXITCODE -eq 0) {
    $ancestral = $true
}
if (-not $ancestral) {
    throw "COMMIT A20 VALIDADO NAO E ANCESTRAL DO HEAD REMOTO. EXECUCAO BLOQUEADA."
}

$spec = "${CommitValidado}:$ScriptRel"
$conteudo = @(& git.exe show $spec)
if ($LASTEXITCODE -ne 0 -or $conteudo.Count -lt 1) {
    throw 'NAO FOI POSSIVEL OBTER O GATE A20 VALIDADO.'
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
    throw 'PARSER POWERSHELL REPROVOU O GATE A20 VALIDADO.'
}

try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Temp
    $codigo = $LASTEXITCODE
}
finally {
    Remove-Item -LiteralPath $Temp -Force -ErrorAction SilentlyContinue
}

if ($codigo -ne 0) {
    throw "A20 TERMINOU COM FALHA (exit $codigo). ENVIE O LOG PA-A20-RATE-LIMIT GERADO."
}
