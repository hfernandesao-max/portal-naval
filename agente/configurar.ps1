<#
  Guarda as credenciais do agente num ficheiro cifrado pelo Windows (DPAPI).
  Só o utilizador do Windows que corre este script, neste servidor, consegue ler o ficheiro.
  Corra-o com a MESMA conta que vai executar a tarefa agendada.
#>
$ErrorActionPreference = 'Stop'
$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
$destino = Join-Path $pasta 'credenciais.xml'

function Ambiente($nome) {
  Write-Host ''
  Write-Host "Primavera - $nome" -ForegroundColor Cyan
  $s = Read-Host 'Servidor SQL (ex.: SRV-PRIMAVERA\PRIMAVERA ou 10.0.0.10,1433)'
  $b = Read-Host 'Base de dados do sistema [PRIEMPRE]'; if ([string]::IsNullOrWhiteSpace($b)) { $b = 'PRIEMPRE' }
  $u = Read-Host 'Utilizador SQL do agente [gestor_acessos]'; if ([string]::IsNullOrWhiteSpace($u)) { $u = 'gestor_acessos' }
  $p = Read-Host 'Palavra-passe do utilizador SQL' -AsSecureString
  [pscustomobject]@{ Servidor = $s; BaseDados = $b; SqlUser = $u; SqlPwd = $p }
}

Write-Host ''
Write-Host 'Configuração do agente do Gestor de Acessos' -ForegroundColor Cyan
Write-Host '--------------------------------------------'
$testes = Ambiente 'cópia de testes'
$producao = Ambiente 'produção'
$matriz = Read-Host 'Palavra-passe da matriz de acessos' -AsSecureString
$token = Read-Host 'Token do GitHub da conta do agente (fine-grained, só portal-naval, Contents: Read and write)' -AsSecureString

[pscustomobject]@{
  Testes = $testes; Producao = $producao; Matriz = $matriz; Token = $token
  Utilizador = "$env:USERDOMAIN\$env:USERNAME"; Data = (Get-Date).ToString('yyyy-MM-dd HH:mm')
} | Export-Clixml -Path $destino

$acl = Get-Acl $destino
$acl.SetAccessRuleProtection($true, $false)
$acl.Access | ForEach-Object { [void]$acl.RemoveAccessRule($_) }
$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule("$env:USERDOMAIN\$env:USERNAME", 'FullControl', 'Allow')))
$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule('BUILTIN\Administrators', 'FullControl', 'Allow')))
Set-Acl -Path $destino -AclObject $acl

Write-Host ''
Write-Host "Credenciais guardadas em $destino (cifradas para $env:USERDOMAIN\$env:USERNAME)." -ForegroundColor Green
Write-Host 'Próximo passo: preencher config.local.json e correr .\executar.ps1 -Simular exemplo-primavera.json'
