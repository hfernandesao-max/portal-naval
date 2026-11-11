<#
  Executa o agente do Gestor de Acessos.
    .\executar.ps1 -Simular exemplo-primavera.json   usa um Primavera em memória e não grava no portal
    .\executar.ps1                                   executa os pedidos aprovados (é o que a tarefa agendada corre)
#>
param([string]$Simular)
$ErrorActionPreference = 'Stop'
$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
$cred = Join-Path $pasta 'credenciais.xml'
if (-not (Test-Path $cred)) { Write-Error 'Faltam as credenciais. Corra primeiro .\configurar.ps1'; exit 1 }

function Texto([Security.SecureString]$s) {
  $p = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($p) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p) }
}
$c = Import-Clixml $cred
foreach ($a in @(@('TESTES', $c.Testes), @('PRODUCAO', $c.Producao))) {
  Set-Item "env:PRI_$($a[0])_SERVIDOR" $a[1].Servidor
  Set-Item "env:PRI_$($a[0])_BD" $a[1].BaseDados
  Set-Item "env:PRI_$($a[0])_UTILIZADOR" $a[1].SqlUser
  Set-Item "env:PRI_$($a[0])_SENHA" (Texto $a[1].SqlPwd)
}
$env:MATRIZ_SENHA = Texto $c.Matriz
$env:GITHUB_TOKEN = Texto $c.Token

$args2 = @((Join-Path $pasta 'agente.js'))
if ($Simular) { $args2 += @('--simular', $Simular) }
Push-Location $pasta
try { & node @args2; $codigo = $LASTEXITCODE } finally {
  Pop-Location
  'PRI_TESTES_SENHA', 'PRI_PRODUCAO_SENHA', 'MATRIZ_SENHA', 'GITHUB_TOKEN' | ForEach-Object { Remove-Item "env:$_" -ErrorAction SilentlyContinue }
}
exit $codigo
