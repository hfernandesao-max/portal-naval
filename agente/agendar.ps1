<#
  Cria a tarefa agendada «Portal Naval - Gestor de Acessos».
  Por omissão corre de 5 em 5 minutos, todo o dia (os acessos temporários têm de fechar a horas).
  Corra numa consola PowerShell aberta como administrador, com a conta que correu o configurar.ps1.
#>
param([int]$IntervaloMinutos = 5, [string]$Inicio = '00:00', [int]$Horas = 24)
$ErrorActionPreference = 'Stop'
$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
$nome = 'Portal Naval - Gestor de Acessos'
$conta = "$env:USERDOMAIN\$env:USERNAME"

$accao = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$pasta\executar.ps1`"" -WorkingDirectory $pasta
$gatilho = New-ScheduledTaskTrigger -Daily -At $Inicio
$rep = New-ScheduledTaskTrigger -Once -At $Inicio -RepetitionInterval (New-TimeSpan -Minutes $IntervaloMinutos) -RepetitionDuration (New-TimeSpan -Hours $Horas)
$gatilho.Repetition = $rep.Repetition
$defs = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -MultipleInstances IgnoreNew

$senhaWin = Read-Host "Palavra-passe do Windows de $conta (para a tarefa correr sem sessão iniciada)" -AsSecureString
$p = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($senhaWin)
try { $txt = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($p) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p) }

Register-ScheduledTask -TaskName $nome -Action $accao -Trigger $gatilho -Settings $defs -User $conta -Password $txt -RunLevel Limited -Description 'Executa no Primavera os pedidos do Gestor de Acessos aprovados no portal e fecha os acessos temporários no prazo.' -Force | Out-Null
$txt = $null
Write-Host "Tarefa «$nome» criada: de $IntervaloMinutos em $IntervaloMinutos minutos, a partir das $Inicio, durante $Horas horas por dia." -ForegroundColor Green
Write-Host "Registos em $pasta\registos"
