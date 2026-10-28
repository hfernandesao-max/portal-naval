<#
  Executa a sincronização com o ERP Primavera.
    .\executar.ps1 -Teste    não grava no portal; deixa o resultado na pasta «saida»
    .\executar.ps1           sincroniza e grava no portal (é o que a tarefa agendada corre)
#>
param([switch]$Teste, [switch]$Forcar)
$ErrorActionPreference = 'Stop'
$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
$cred = Join-Path $pasta 'credenciais.xml'
if (-not (Test-Path $cred)) { Write-Error 'Faltam as credenciais. Corra primeiro .\configurar.ps1'; exit 1 }

function Texto([Security.SecureString]$s) {
  $p = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($p) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p) }
}
$c = Import-Clixml $cred
$env:PRIMAVERA_SQL_SERVIDOR = $c.Servidor
$env:PRIMAVERA_SQL_BD = $c.BaseDados
$env:PRIMAVERA_SQL_UTILIZADOR = $c.SqlUser
$env:PRIMAVERA_SQL_SENHA = Texto $c.SqlPwd
$env:MATRIZ_SENHA = Texto $c.Matriz
$env:GITHUB_TOKEN = Texto $c.Token

$a = @((Join-Path $pasta 'sincronizar-primavera.js'))
if ($Teste) { $a += '--teste' }
if ($Forcar) { $a += '--forcar' }
Push-Location $pasta
try { & node @a; $codigo = $LASTEXITCODE } finally {
  Pop-Location
  'PRIMAVERA_SQL_SENHA', 'MATRIZ_SENHA', 'GITHUB_TOKEN' | ForEach-Object { Remove-Item "env:$_" -ErrorAction SilentlyContinue }
}
exit $codigo
