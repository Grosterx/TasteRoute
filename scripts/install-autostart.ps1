[CmdletBinding()]
param(
    [switch]$Remove,
    [string]$TaskName = 'TasteRoute Demo'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$demo = Join-Path $PSScriptRoot 'public-demo.ps1'

function Set-PowerSetting {
    param([string]$Name)

    & powercfg /change $Name 0 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "powercfg failed: $Name"
    }
}

if ($Remove) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Removed task: $TaskName"
    Write-Host 'Power settings were not changed.'
    return
}

if (-not (Test-Path -LiteralPath $demo)) {
    throw "Not found: $demo"
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument ('-NoProfile -ExecutionPolicy Bypass -File "{0}" -Action start' -f $demo) `
    -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description 'Starts TasteRoute Docker stack and Cloudflare quick tunnel at user logon.' `
    -Force | Out-Null
Write-Host "Registered task: $TaskName"

try {
    Set-PowerSetting -Name 'standby-timeout-ac'
    Set-PowerSetting -Name 'hibernate-timeout-ac'
    Set-PowerSetting -Name 'disk-timeout-ac'
    Write-Host 'Disabled sleep, hibernate and disk timeout on AC power.'
} catch {
    Write-Warning 'Could not change power settings. Run PowerShell as Administrator.'
}
