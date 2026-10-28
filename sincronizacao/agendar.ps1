<#
  Cria a tarefa agendada «Portal Naval - Sincronização Primavera».
  Por omissão corre de hora a hora, das 07:00 às 20:00, todos os dias.
  Corra numa consola PowerShell aberta como administrador, com a conta que correu o configurar.ps1.
#>
param([int]$IntervaloMinutos = 60, [string]$Inicio = '07:00', [int]$Horas = 13)
$ErrorActionPreference = 'Stop'
$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
$nome = 'Portal Naval - Sincronização Primavera'
$conta = "$env:USERDOMAIN\$env:USERNAME"

$accao = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$pasta\executar.ps1`"" -WorkingDirectory $pasta
$gatilho = New-ScheduledTaskTrigger -Daily -At $Inicio
$rep = New-ScheduledTaskTrigger -Once -At $Inicio -RepetitionInterval (New-TimeSpan -Minutes $IntervaloMinutos) -RepetitionDuration (New-TimeSpan -Hours $Horas)
$gatilho.Repetition = $rep.Repetition
$defs = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -MultipleInstances IgnoreNew

$senhaWin = Read-Host "Palavra-passe do Windows de $conta (para a tarefa correr sem sessão iniciada)" -AsSecureString
$p = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($senhaWin)
try { $txt = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($p) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p) }

Register-ScheduledTask -TaskName $nome -Action $accao -Trigger $gatilho -Settings $defs -User $conta -Password $txt -RunLevel Limited -Description 'Lê o ERP Primavera (só leitura) e actualiza a matriz de acessos no portal portal-naval.' -Force | Out-Null
$txt = $null
Write-Host "Tarefa «$nome» criada: de $IntervaloMinutos em $IntervaloMinutos minutos, a partir das $Inicio, durante $Horas horas por dia." -ForegroundColor Green
Write-Host "Registos em $pasta\registos"
