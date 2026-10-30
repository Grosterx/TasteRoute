[CmdletBinding()]
param(
    [ValidateSet('start', 'stop', 'status', 'run')]
    [string]$Action = 'start',
    [ValidateSet('', 'cloudflare', 'ngrok', 'serveo')]
    [string]$Provider = '',
    [int]$LocalPort = 5173
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'
$stateDir = Join-Path $env:TEMP 'tasteroute-public-demo'
$stateFile = Join-Path $stateDir 'state.json'
$tunnelOut = Join-Path $stateDir 'tunnel.out.log'
$tunnelErr = Join-Path $stateDir 'tunnel.err.log'
$supervisorOut = Join-Path $stateDir 'supervisor.out.log'
$supervisorErr = Join-Path $stateDir 'supervisor.err.log'
$supervisorLog = Join-Path $stateDir 'supervisor.log'
$script:lastRestart = @{}

function Read-State {
    if (-not (Test-Path -LiteralPath $stateFile)) {
        return $null
    }
    try {
        return Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Write-State {
    param([hashtable]$State)

    New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
    $temp = "$stateFile.tmp"
    $json = $State | ConvertTo-Json -Compress
    [IO.File]::WriteAllText($temp, $json, (New-Object System.Text.UTF8Encoding -ArgumentList $false))
    Move-Item -Force -LiteralPath $temp -Destination $stateFile
}

function Get-CloudflaredPath {
    $local = Join-Path $root 'cloudflared.exe'
    if (Test-Path -LiteralPath $local) {
        return $local
    }
    $command = Get-Command cloudflared.exe -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }
    throw "cloudflared.exe not found in $root or PATH"
}

function Set-EnvValue {
    param(
        [string]$Name,
        [string]$Value
    )

    if (-not (Test-Path -LiteralPath $envFile)) {
        throw "Environment file not found: $envFile"
    }

    $pattern = '(?m)^' + [regex]::Escape($Name) + '=.*$'
    $replacement = '{0}={1}' -f $Name, $Value
    $text = [IO.File]::ReadAllText($envFile)

    if ([regex]::IsMatch($text, $pattern)) {
        $text = [regex]::Replace($text, $pattern, [System.Text.RegularExpressions.MatchEvaluator] {
            param($match)
            $replacement
        })
    } else {
        $text = $text.TrimEnd() + "`r`n" + $replacement + "`r`n"
    }

    [IO.File]::WriteAllText($envFile, $text, (New-Object System.Text.UTF8Encoding -ArgumentList $false))
}

function Get-EnvValue {
    param([string]$Name)

    if (-not (Test-Path -LiteralPath $envFile)) {
        return ''
    }

    $pattern = '(?m)^' + [regex]::Escape($Name) + '=(.*)$'
    $text = [IO.File]::ReadAllText($envFile)
    $match = [regex]::Match($text, $pattern)
    if ($match.Success) {
        return $match.Groups[1].Value.Trim()
    }
    return ''
}

function Get-Provider {
    $value = $Provider
    if (-not $value) {
        $value = $env:TUNNEL_PROVIDER
    }
    if (-not $value) {
        $value = Get-EnvValue -Name 'TUNNEL_PROVIDER'
    }
    if (-not $value) {
        $value = 'serveo'
    }

    $value = $value.Trim().ToLowerInvariant()
    if ($value -notin @('cloudflare', 'ngrok', 'serveo')) {
        throw "Unsupported tunnel provider: $value"
    }
    return $value
}

function Get-NgrokPath {
    $local = Join-Path $env:LOCALAPPDATA 'ngrok\ngrok.exe'
    if (Test-Path -LiteralPath $local) {
        return $local
    }

    $command = Get-Command ngrok.exe -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    throw 'ngrok.exe not found in PATH'
}

function Get-NgrokDomain {
    $value = $env:NGROK_DOMAIN
    if (-not $value) {
        $value = Get-EnvValue -Name 'NGROK_DOMAIN'
    }
    if (-not $value) {
        throw 'NGROK_DOMAIN is not set in .env'
    }

    $value = $value.Trim().TrimEnd('/')
    $value = $value -replace '^https?://', ''
    if (-not $value) {
        throw 'NGROK_DOMAIN is empty'
    }
    return $value
}

function Get-ServeoSSHPath {
    $local = Join-Path $env:WINDIR 'System32\OpenSSH\ssh.exe'
    if (Test-Path -LiteralPath $local) {
        return $local
    }

    $command = Get-Command ssh.exe -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    throw 'ssh.exe not found in Windows OpenSSH or PATH'
}

function Get-ServeoSubdomain {
    $value = $env:SERVEO_SUBDOMAIN
    if (-not $value) {
        $value = Get-EnvValue -Name 'SERVEO_SUBDOMAIN'
    }
    if (-not $value) {
        return ''
    }

    $value = $value.Trim().ToLowerInvariant()
    $value = $value -replace '^https?://', ''
    $value = $value -replace '\.serveo\.net$', ''
    $value = $value.TrimEnd('/')
    if ($value -notmatch '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$') {
        throw "Invalid SERVEO_SUBDOMAIN: $value"
    }
    return $value
}

function Get-ServeoSSHPort {
    $value = $env:SERVEO_SSH_PORT
    if (-not $value) {
        $value = Get-EnvValue -Name 'SERVEO_SSH_PORT'
    }
    if (-not $value) {
        return 443
    }

    $port = 0
    if (-not [int]::TryParse($value, [ref]$port) -or $port -lt 1 -or $port -gt 65535) {
        throw "Invalid SERVEO_SSH_PORT: $value"
    }
    return $port
}

function Get-ServeoKeyPath {
    $value = $env:SERVEO_SSH_KEY
    if (-not $value) {
        $value = Get-EnvValue -Name 'SERVEO_SSH_KEY'
    }
    if (-not $value) {
        $value = Join-Path $env:USERPROFILE '.ssh\tasteroute_serveo'
    }

    if (Test-Path -LiteralPath $value) {
        return $value
    }
    return ''
}

function Wait-ServeoUrl {
    param([int]$TimeoutSeconds = 30)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $text = ''
        foreach ($log in @($tunnelOut, $tunnelErr)) {
            $text += Read-SharedText -Path $log
        }

        $patterns = @(
            'https://(?!(?:console|www|status|api)\.)[a-z0-9][a-z0-9.-]*\.serveo\.net',
            'https://[a-z0-9][a-z0-9.-]*\.serveousercontent\.com'
        )
        foreach ($pattern in $patterns) {
            $match = [regex]::Match($text, $pattern, [Text.RegularExpressions.RegexOptions]::IgnoreCase)
            if ($match.Success) {
                return $match.Value.TrimEnd('.')
            }
        }
        Start-Sleep -Seconds 1
    }
    return ''
}

function Wait-NgrokReady {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 45
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 2
            foreach ($tunnel in @($response.tunnels)) {
                if ($tunnel.public_url -and $tunnel.public_url.TrimEnd('/') -eq $Url.TrimEnd('/')) {
                    return $true
                }
            }
        } catch {
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Wait-ApiHealth {
    for ($i = 0; $i -lt 45; $i++) {
        try {
            $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8080/tasteroute/api/healthz' -TimeoutSec 3
            if ($health.ok) {
                return $true
            }
        } catch {
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Wait-WebHealth {
    for ($i = 0; $i -lt 45; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:$LocalPort/healthz" -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -eq 200) {
                return $true
            }
        } catch {
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Test-LocalHealth {
    $api = $false
    $web = $false

    try {
        $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8080/tasteroute/api/healthz' -TimeoutSec 3
        $api = [bool]$health.ok
    } catch {
    }

    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$LocalPort/healthz" -UseBasicParsing -TimeoutSec 3
        $web = ($response.StatusCode -eq 200)
    } catch {
    }

    return [pscustomobject]@{ Api = $api; Web = $web }
}

function Wait-DockerReady {
    param([int]$TimeoutSeconds = 180)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        & docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Start-DockerIfNeeded {
    & docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        return $true
    }

    $dockerDesktop = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    if (Test-Path -LiteralPath $dockerDesktop) {
        Write-Log 'Docker is not ready; starting Docker Desktop'
        Start-Process -FilePath $dockerDesktop | Out-Null
    } else {
        Write-Log 'Docker is not ready and Docker Desktop was not found'
    }

    return (Wait-DockerReady -TimeoutSeconds 180)
}

function Get-ServiceHealth {
    param([string]$Service)

    Push-Location $root
    $previousErrorAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $json = & docker compose ps --format json $Service 2>$null
        if ($LASTEXITCODE -ne 0 -or -not $json) {
            return 'missing'
        }
        $item = ($json | Out-String | ConvertFrom-Json)
        if ($item -is [array]) {
            $item = $item[0]
        }
        if ($item.Health) {
            return [string]$item.Health
        }
        if ($item.State) {
            return [string]$item.State
        }
        return 'unknown'
    } catch {
        return 'unknown'
    } finally {
        $ErrorActionPreference = $previousErrorAction
        Pop-Location
    }
}

function Wait-ComposeHealth {
    param(
        [string]$Service,
        [int]$TimeoutSeconds = 60
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $health = Get-ServiceHealth -Service $Service
        if ($health -eq 'healthy' -or $health -eq 'running') {
            return $true
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Restart-ComposeService {
    param([string]$Service)

    Push-Location $root
    $previousErrorAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = & docker compose up -d --force-recreate --no-deps $Service 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "docker compose up $Service failed: $($output -join [Environment]::NewLine)"
        }
        Write-Log "Restarted $Service"
    } finally {
        $ErrorActionPreference = $previousErrorAction
        Pop-Location
    }
}

function Restart-Web {
    Restart-ComposeService -Service 'web'
    if (-not (Wait-WebHealth)) {
        throw 'web is not healthy after restart'
    }
}

function Test-RestartAllowed {
    param(
        [string]$Name,
        [int]$CooldownSeconds = 30
    )

    $now = Get-Date
    if ($script:lastRestart.ContainsKey($Name)) {
        $last = $script:lastRestart[$Name]
        if (($now - $last).TotalSeconds -lt $CooldownSeconds) {
            return $false
        }
    }
    $script:lastRestart[$Name] = $now
    return $true
}

function Ensure-LocalStack {
    foreach ($service in @('postgres', 'redis')) {
        $health = Get-ServiceHealth -Service $service
        if ($health -eq 'unhealthy' -or $health -eq 'exited' -or $health -eq 'missing') {
            if (Test-RestartAllowed -Name $service) {
                try {
                    Restart-ComposeService -Service $service
                    if (-not (Wait-ComposeHealth -Service $service -TimeoutSeconds 60)) {
                        Write-Log "$service is still not healthy"
                    }
                } catch {
                    Write-Log "Failed to restart ${service}: $($_.Exception.Message)"
                }
            }
        }
    }

    $health = Test-LocalHealth
    if (-not $health.Api) {
        if (Test-RestartAllowed -Name 'api') {
            try {
                Restart-Api
            } catch {
                Write-Log "Failed to restart api: $($_.Exception.Message)"
            }
        }
    }

    $health = Test-LocalHealth
    if (-not $health.Web) {
        if (Test-RestartAllowed -Name 'web') {
            try {
                Restart-Web
            } catch {
                Write-Log "Failed to restart web: $($_.Exception.Message)"
            }
        }
    }
}

function Test-PublicHealth {
    param([string]$Url)

    if (-not $Url) {
        return $false
    }

    try {
        $headers = @{
            'ngrok-skip-browser-warning' = 'true'
            'serveo-skip-browser-warning' = 'true'
        }
        $health = Invoke-RestMethod -Uri "$Url/tasteroute/api/healthz" -Headers $headers -TimeoutSec 10
        if (-not $health.ok) {
            return $false
        }
        $rootResponse = Invoke-WebRequest -Uri "$Url/" -Headers $headers -UseBasicParsing -TimeoutSec 10
        return ($rootResponse.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Restart-Api {
    Push-Location $root
    $previousErrorAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = @()
        for ($attempt = 0; $attempt -lt 3; $attempt++) {
            $output = & docker compose up -d --force-recreate --no-deps api 2>&1
            if (Wait-ApiHealth) {
                return
            }
            if ($attempt -lt 2) {
                Start-Sleep -Seconds 2
            }
        }
        throw "docker compose failed or API is unhealthy ($LASTEXITCODE): $($output -join [Environment]::NewLine)"
    } finally {
        $ErrorActionPreference = $previousErrorAction
        Pop-Location
    }
}

function Wait-PublicConfig {
    param([string]$Url)

    for ($i = 0; $i -lt 120; $i++) {
        try {
            $headers = @{
                'ngrok-skip-browser-warning' = 'true'
                'serveo-skip-browser-warning' = 'true'
            }
            $config = Invoke-RestMethod -Uri "$Url/tasteroute/api/public/config" -Headers $headers -TimeoutSec 5
            if ($config.public_app_url -eq $Url) {
                return $true
            }
        } catch {
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Apply-PublicUrl {
    param([string]$Url)

    $cors = 'http://localhost:{0},http://127.0.0.1:{0},{1}' -f $LocalPort, $Url
    Set-EnvValue -Name 'CORS_ORIGINS' -Value $cors
    Set-EnvValue -Name 'PUBLIC_APP_URL' -Value $Url
    Restart-Api
}

function Write-Log {
    param([string]$Message)

    New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
    $line = '{0} {1}' -f (Get-Date).ToString('s'), $Message
    Add-Content -LiteralPath $supervisorLog -Value $line -Encoding UTF8
}

function Read-SharedText {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return ''
    }

    try {
        $stream = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
        try {
            $reader = New-Object System.IO.StreamReader -ArgumentList $stream, ([Text.Encoding]::UTF8)
            return $reader.ReadToEnd()
        } finally {
            if ($reader) { $reader.Dispose() }
            $stream.Dispose()
        }
    } catch {
        return ''
    }
}

function Invoke-Supervisor {
    New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
    Set-Content -LiteralPath $tunnelOut -Value '' -Encoding UTF8
    Set-Content -LiteralPath $tunnelErr -Value '' -Encoding UTF8

    if (-not (Start-DockerIfNeeded)) {
        throw 'Docker Desktop is not ready'
    }

    $provider = Get-Provider
    $ngrokDomain = ''
    $serveoSubdomain = ''
    $serveoSSHPort = 0
    $serveoKey = ''
    if ($provider -eq 'ngrok') {
        $ngrokDomain = Get-NgrokDomain
        $tunnelExe = Get-NgrokPath
        $ngrokConfig = Join-Path $env:LOCALAPPDATA 'ngrok\ngrok.yml'
        if (-not (Test-Path -LiteralPath $ngrokConfig)) {
            throw 'ngrok authtoken is not configured. Run: ngrok config add-authtoken <TOKEN>'
        }
    } elseif ($provider -eq 'serveo') {
        $serveoSubdomain = Get-ServeoSubdomain
        $serveoSSHPort = Get-ServeoSSHPort
        $tunnelExe = Get-ServeoSSHPath
        $serveoKey = Get-ServeoKeyPath
        if ($serveoSubdomain -and -not $serveoKey) {
            throw 'SERVEO_SUBDOMAIN is set but the Serveo SSH key was not found. Add the key to Serveo or clear SERVEO_SUBDOMAIN.'
        }
    } else {
        $tunnelExe = Get-CloudflaredPath
    }

    $initialDomain = ''
    if ($provider -eq 'ngrok') {
        $initialDomain = $ngrokDomain
    } elseif ($provider -eq 'serveo') {
        $initialDomain = $serveoSubdomain
    }

    $state = @{
        supervisor_pid = $PID
        tunnel_pid     = 0
        url            = ''
        provider       = $provider
        domain         = $initialDomain
        updated_at     = ''
    }
    Write-State -State $state
    Write-Log "Supervisor started for http://127.0.0.1:$LocalPort ($provider)"

    $tunnel = $null
    $restartDelay = 2
    try {
        while ($true) {
            Ensure-LocalStack

            Set-Content -LiteralPath $tunnelOut -Value '' -Encoding UTF8
            Set-Content -LiteralPath $tunnelErr -Value '' -Encoding UTF8

            if ($provider -eq 'ngrok') {
                $arguments = @(
                    'http', "$LocalPort",
                    '--url', "https://$ngrokDomain",
                    '--log=stdout',
                    '--log-format=json'
                )
            } elseif ($provider -eq 'serveo') {
                $arguments = @(
                    '-p', "$serveoSSHPort",
                    '-o', 'StrictHostKeyChecking=accept-new',
                    '-o', 'ServerAliveInterval=30',
                    '-o', 'ServerAliveCountMax=3',
                    '-o', 'ExitOnForwardFailure=yes',
                    '-T'
                )
                if ($serveoKey) {
                    $arguments += @('-i', $serveoKey, '-o', 'IdentitiesOnly=yes')
                }
                if ($serveoSubdomain) {
                    $remoteForward = '{0}:80:localhost:{1}' -f $serveoSubdomain, $LocalPort
                } else {
                    $remoteForward = '80:localhost:{0}' -f $LocalPort
                }
                $arguments += @('-R', $remoteForward, 'serveo.net')
            } else {
                $arguments = @(
                    'tunnel',
                    '--url', "http://127.0.0.1:$LocalPort",
                    '--no-autoupdate',
                    '--protocol', 'http2',
                    '--edge-ip-version', '4'
                )
            }

            $tunnel = Start-Process -FilePath $tunnelExe -ArgumentList $arguments `
                -RedirectStandardOutput $tunnelOut -RedirectStandardError $tunnelErr `
                -NoNewWindow -PassThru

            $state.tunnel_pid = $tunnel.Id
            Write-State -State $state
            Write-Log "$provider tunnel started with pid $($tunnel.Id)"

            $ngrokReady = $false
            $serveoUrl = ''
            if ($provider -eq 'ngrok') {
                $ngrokReady = Wait-NgrokReady -Url "https://$ngrokDomain" -TimeoutSeconds 45
                if (-not $ngrokReady) {
                    Write-Log "ngrok tunnel did not become ready: https://$ngrokDomain"
                    Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
                }
            } elseif ($provider -eq 'serveo') {
                $serveoUrl = Wait-ServeoUrl -TimeoutSeconds 45
                if (-not $serveoUrl) {
                    Write-Log 'Serveo tunnel did not return a public URL'
                    Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
                }
            }

            $seen = ''
            $lastWatchdog = Get-Date
            $publicFailures = 0

            while (-not $tunnel.HasExited) {
                Start-Sleep -Seconds 1

                $url = ''
                if ($provider -eq 'ngrok') {
                    if ($ngrokReady) {
                        $url = "https://$ngrokDomain"
                    }
                } elseif ($provider -eq 'serveo') {
                    $url = $serveoUrl
                } else {
                    $text = ''
                    foreach ($log in @($tunnelOut, $tunnelErr)) {
                        $text += Read-SharedText -Path $log
                    }

                    $matches = [regex]::Matches($text, 'https://(?!api\.)[a-z0-9-]+\.trycloudflare\.com')
                    if ($matches.Count -gt 0) {
                        $url = $matches[$matches.Count - 1].Value
                    }
                }

                if ($url -and $url -ne $seen) {
                    try {
                        Apply-PublicUrl -Url $url
                        $seen = $url
                        $state.url = $url
                        try {
                            $state.domain = ([Uri]$url).Host
                        } catch {
                        }
                        $state.updated_at = (Get-Date).ToString('o')
                        Write-State -State $state
                        $restartDelay = 2

                        if (Wait-PublicConfig -Url $url) {
                            Write-Log "Public URL active: $url"
                        } else {
                            Write-Log "Public URL assigned but config check timed out: $url"
                        }
                    } catch {
                        Write-Log "Failed to apply ${url}: $($_.Exception.Message)"
                        Start-Sleep -Seconds 5
                    }
                }

                if (((Get-Date) - $lastWatchdog).TotalSeconds -ge 15) {
                    $lastWatchdog = Get-Date
                    Ensure-LocalStack

                    $local = Test-LocalHealth
                    if ($local.Api -and $local.Web -and $state.url) {
                        if (Test-PublicHealth -Url $state.url) {
                            if ($publicFailures -gt 0) {
                                Write-Log 'Public health recovered'
                            }
                            $publicFailures = 0
                        } else {
                            $publicFailures++
                            Write-Log "Public health check failed ($publicFailures/3)"
                            if ($publicFailures -ge 3) {
                                Write-Log "Public health failed repeatedly; restarting $provider tunnel"
                                Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
                                $publicFailures = 0
                                break
                            }
                        }
                    } else {
                        $publicFailures = 0
                    }
                }
            }

            $state.tunnel_pid = 0
            $state.url = ''
            Write-State -State $state
            Write-Log "$provider tunnel exited; restarting in $restartDelay seconds"
            Start-Sleep -Seconds $restartDelay
            $restartDelay = [Math]::Min($restartDelay * 2, 30)
        }
    } finally {
        if ($tunnel -and -not $tunnel.HasExited) {
            Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
        }
        Write-Log 'Supervisor stopped'
    }
}

function Start-Demo {
    $current = Read-State
    if ($current -and $current.supervisor_pid) {
        $process = Get-Process -Id $current.supervisor_pid -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Already running."
            Write-Host "Provider: $($current.provider)"
            Write-Host "Local:  http://localhost:$LocalPort"
            Write-Host "Public: $($current.url)"
            return
        }
    }

    if (-not (Test-Path -LiteralPath $envFile)) {
        throw "Environment file not found: $envFile"
    }

    Write-Host 'Checking Docker...'
    if (-not (Start-DockerIfNeeded)) {
        throw 'Docker Desktop is not ready. Start Docker Desktop and try again.'
    }

    Remove-Item -Force -LiteralPath $stateFile -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $stateDir | Out-Null

    $providerArgument = ''
    if ($Provider) {
        $providerArgument = ' -Provider {0}' -f $Provider
    }
    $arguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -Action run -LocalPort {1}{2}' -f $PSCommandPath, $LocalPort, $providerArgument
    $process = Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments `
        -WindowStyle Hidden -RedirectStandardOutput $supervisorOut -RedirectStandardError $supervisorErr `
        -PassThru

    for ($i = 0; $i -lt 600; $i++) {
        Start-Sleep -Seconds 1
        $state = Read-State
        if ($state -and $state.url) {
            Write-Host "Public URL: $($state.url)"
            Write-Host "Local URL:  http://localhost:$LocalPort"
            Write-Host "Supervisor pid: $($state.supervisor_pid)"
            Write-Host "Tunnel pid: $($state.tunnel_pid)"
            return
        }
        if ($process.HasExited) {
            $errorText = ''
            if (Test-Path -LiteralPath $supervisorErr) {
                $errorText = Get-Content -LiteralPath $supervisorErr -Raw
            }
            throw "Supervisor exited before a URL was assigned. $errorText"
        }
    }

    if ($process.HasExited) {
        $errorText = ''
        if (Test-Path -LiteralPath $supervisorErr) {
            $errorText = Get-Content -LiteralPath $supervisorErr -Raw
        }
        throw "Supervisor exited before a URL was assigned. $errorText"
    }

    Write-Host "Public URL is not assigned yet, but the supervisor is still running."
    Write-Host "Check again: .\scripts\public-demo.ps1 -Action status"
}

function Stop-Demo {
    $state = Read-State
    if (-not $state) {
        Write-Host "Not running."
        return
    }

    if ($state.tunnel_pid) {
        Stop-Process -Id $state.tunnel_pid -Force -ErrorAction SilentlyContinue
    }
    if ($state.supervisor_pid -and $state.supervisor_pid -ne $PID) {
        Stop-Process -Id $state.supervisor_pid -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -Force -LiteralPath $stateFile -ErrorAction SilentlyContinue
    Write-Host "Stopped."
}

function Show-Status {
    $state = Read-State
    if (-not $state) {
        Write-Host "Not running."
        return
    }

    $process = Get-Process -Id $state.supervisor_pid -ErrorAction SilentlyContinue
    if (-not $process) {
        Write-Host "Supervisor is not running."
        return
    }

    $local = Test-LocalHealth
    $publicOk = $false
    if ($state.url) {
        $publicOk = Test-PublicHealth -Url $state.url
    }

    Write-Host "Running."
    Write-Host "Provider: $($state.provider)"
    Write-Host "Domain: $($state.domain)"
    Write-Host "Local:  http://localhost:$LocalPort"
    Write-Host "Public: $($state.url)"
    Write-Host "Local API:  $($local.Api)"
    Write-Host "Local web:  $($local.Web)"
    Write-Host "Public API: $publicOk"
    Write-Host "Tunnel pid: $($state.tunnel_pid)"
    foreach ($service in @('postgres', 'redis', 'api', 'web')) {
        Write-Host ("{0}: {1}" -f $service, (Get-ServiceHealth -Service $service))
    }
}

switch ($Action) {
    'start' { Start-Demo }
    'stop' { Stop-Demo }
    'status' { Show-Status }
    'run' { Invoke-Supervisor }
}
