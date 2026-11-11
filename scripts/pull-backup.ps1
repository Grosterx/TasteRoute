#Requires -Version 5.1
<#
.SYNOPSIS
    Copies the newest Postgres dump from the TasteRoute VPS to this PC.

.DESCRIPTION
    The server keeps daily dumps in /var/backups/tasteroute for 7 days.
    This script pulls the latest one into .\backups so the data survives
    VPS deletion (Freetato removes the VM and its backups 14 days after
    the paid period ends).

.PARAMETER Server
    Server address. Defaults to $env:TASTEROUTE_SERVER or 194.226.54.219.

.PARAMETER User
    SSH user. Defaults to root.

.PARAMETER KeyPath
    Private SSH key. Defaults to %USERPROFILE%\.ssh\tasteroute_vps.

.PARAMETER Destination
    Local folder for dumps. Defaults to .\backups in the repo root.

.EXAMPLE
    .\scripts\pull-backup.ps1

.EXAMPLE
    .\scripts\pull-backup.ps1 -Server 203.0.113.10 -Destination D:\tasteroute-dumps
#>
[CmdletBinding()]
param(
    [string]$Server = $(if ($env:TASTEROUTE_SERVER) { $env:TASTEROUTE_SERVER } else { '194.226.54.219' }),
    [string]$User = 'root',
    [string]$KeyPath = (Join-Path $env:USERPROFILE '.ssh\tasteroute_vps'),
    [string]$Destination
)

$ErrorActionPreference = 'Stop'

if (-not $Destination) {
    $Destination = Join-Path (Split-Path -Parent $PSScriptRoot) 'backups'
}

if (-not (Test-Path $KeyPath)) {
    throw "SSH key not found: $KeyPath"
}

New-Item -ItemType Directory -Force -Path $Destination | Out-Null

Write-Host "Looking up the newest dump on $User@$Server ..." -ForegroundColor Cyan
$remote = ssh -i $KeyPath -o BatchMode=yes -o ConnectTimeout=20 "$User@$Server" "ls -1t /var/backups/tasteroute/db-*.sql.gz | head -n 1"
if (-not $remote) {
    throw "No dump found in /var/backups/tasteroute on the server."
}
$remoteName = ($remote | Select-Object -First 1).Trim()
if (-not $remoteName) {
    throw "Server returned an empty dump name."
}

$target = Join-Path $Destination (Split-Path -Leaf $remoteName)
Write-Host "Downloading $remoteName ..." -ForegroundColor Cyan
scp -i $KeyPath -o BatchMode=yes "$User@${Server}:$remoteName" $target
if ($LASTEXITCODE -ne 0) {
    throw "scp failed with exit code $LASTEXITCODE"
}

$size = [math]::Round((Get-Item $target).Length / 1KB, 1)
Write-Host "Saved $target ($size KB)" -ForegroundColor Green
