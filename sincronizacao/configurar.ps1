<#
  Guarda as credenciais da sincronização num ficheiro cifrado pelo Windows (DPAPI).
  Só o utilizador do Windows que corre este script, neste servidor, consegue ler o ficheiro.
  Corra-o com a MESMA conta que vai executar a tarefa agendada.
#>
$ErrorActionPreference = 'Stop'
$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
$destino = Join-Path $pasta 'credenciais.xml'

Write-Host ''
Write-Host 'Configuração da sincronização com o ERP Primavera' -ForegroundColor Cyan
Write-Host '-------------------------------------------------'
$servidor = Read-Host 'Servidor SQL do Primavera (ex.: SRV-PRIMAVERA\PRIMAVERA ou 10.0.0.10,1433)'
$bd = Read-Host 'Base de dados do sistema [PRIEMPRE]'
if ([string]::IsNullOrWhiteSpace($bd)) { $bd = 'PRIEMPRE' }
$sqlUser = Read-Host 'Utilizador SQL só de leitura [portal_leitura]'
if ([string]::IsNullOrWhiteSpace($sqlUser)) { $sqlUser = 'portal_leitura' }
$sqlPwd = Read-Host 'Palavra-passe do utilizador SQL' -AsSecureString
$matriz = Read-Host 'Palavra-passe da matriz de acessos' -AsSecureString
$token = Read-Host 'Token do GitHub (fine-grained, só portal-naval)' -AsSecureString

[pscustomobject]@{
  Servidor   = $servidor
  BaseDados  = $bd
  SqlUser    = $sqlUser
  SqlPwd     = $sqlPwd
  Matriz     = $matriz
  Token      = $token
  Utilizador = "$env:USERDOMAIN\$env:USERNAME"
  Data       = (Get-Date).ToString('yyyy-MM-dd HH:mm')
} | Export-Clixml -Path $destino

# Só o utilizador actual e os administradores podem ler o ficheiro
$acl = Get-Acl $destino
$acl.SetAccessRuleProtection($true, $false)
$acl.Access | ForEach-Object { [void]$acl.RemoveAccessRule($_) }
$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule("$env:USERDOMAIN\$env:USERNAME", 'FullControl', 'Allow')))
$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule('BUILTIN\Administrators', 'FullControl', 'Allow')))
Set-Acl -Path $destino -AclObject $acl

Write-Host ''
Write-Host "Credenciais guardadas em $destino (cifradas para $env:USERDOMAIN\$env:USERNAME)." -ForegroundColor Green
Write-Host 'Próximo passo: .\executar.ps1 -Teste'
