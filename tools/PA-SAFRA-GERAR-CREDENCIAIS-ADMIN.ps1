$ErrorActionPreference = 'Stop'

function ConvertTo-Base64Url {
    param([byte[]]$Bytes)
    return [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}

function ConvertFrom-SecureStringPlain {
    param([Security.SecureString]$Secure)
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

Write-Host ''
Write-Host 'PA Safra - Gerador local de credenciais administrativas'
Write-Host 'A senha nao sera exibida nem enviada pela rede.'
Write-Host 'PBKDF2-SHA256: 100000 iteracoes, compativel com Cloudflare Workers.'
Write-Host ''

$senha1 = Read-Host 'Digite a senha administrativa' -AsSecureString
$senha2 = Read-Host 'Confirme a senha administrativa' -AsSecureString

$plain1 = ConvertFrom-SecureStringPlain $senha1
$plain2 = ConvertFrom-SecureStringPlain $senha2

try {
    if ($plain1 -cne $plain2) {
        throw 'As senhas informadas nao coincidem.'
    }
    if ($plain1.Length -lt 12) {
        throw 'Use uma senha com pelo menos 12 caracteres.'
    }
    if ($plain1.Length -gt 256) {
        throw 'Senha longa demais.'
    }

    $iterations = 100000
    $salt = New-Object byte[] 16
    $sessionBytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($salt)
        $rng.GetBytes($sessionBytes)
    }
    finally {
        $rng.Dispose()
    }

    $pbkdf2 = [Security.Cryptography.Rfc2898DeriveBytes]::new(
        $plain1,
        $salt,
        $iterations,
        [Security.Cryptography.HashAlgorithmName]::SHA256
    )
    try {
        $derived = $pbkdf2.GetBytes(32)
    }
    finally {
        $pbkdf2.Dispose()
    }

    $passwordHash = 'pbkdf2-sha256${0}${1}${2}' -f $iterations, (ConvertTo-Base64Url $salt), (ConvertTo-Base64Url $derived)
    $sessionSecret = ConvertTo-Base64Url $sessionBytes

    Write-Host ''
    Write-Host 'COPIE SOMENTE OS DOIS VALORES ABAIXO PARA OS SECRETS DO CLOUDFLARE:'
    Write-Host ''
    Write-Output "PA_SAFRA_ADMIN_PASSWORD_HASH=$passwordHash"
    Write-Output "PA_SAFRA_SESSION_SECRET=$sessionSecret"
    Write-Host ''
    Write-Host 'Nao salve a senha em arquivo de texto e nao envie a senha pelo chat.'
}
finally {
    $plain1 = $null
    $plain2 = $null
}
