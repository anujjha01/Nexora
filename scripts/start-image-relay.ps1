$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDirectory = Join-Path $repoRoot "backend"
$cloudflared = Join-Path $repoRoot "tools\cloudflared.exe"
$node = (Get-Command node -ErrorAction Stop).Source
$apiBase = "https://nexora-ai-api-mqqk.onrender.com"
$relayPort = 8190
$logs = Join-Path $env:LOCALAPPDATA "NexoraImageGen\logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null

$envFile = Join-Path $backendDirectory ".env"
$tokenLine = Get-Content -LiteralPath $envFile -ErrorAction Stop | Where-Object { $_ -match '^NEXORA_LOCAL_IMAGE_TOKEN=' } | Select-Object -First 1
$token = $tokenLine -replace '^NEXORA_LOCAL_IMAGE_TOKEN=', ''
$token = $token.Trim().Trim('"').Trim("'")
if ($token.Length -lt 32) { throw "Add a random secret of at least 32 characters to backend/.env as NEXORA_LOCAL_IMAGE_TOKEN." }
if (-not (Test-Path -LiteralPath $cloudflared)) { throw "Install the Cloudflare Tunnel tool first by running scripts/install-cloudflared.ps1." }

$env:NEXORA_LOCAL_IMAGE_TOKEN = $token
$env:LOCAL_IMAGE_RELAY_PORT = [string]$relayPort
$relayProcess = $null
$tunnelProcess = $null

function Start-Relay {
    $stdout = Join-Path $logs "image-relay.stdout.log"
    $stderr = Join-Path $logs "image-relay.stderr.log"
    Start-Process -FilePath $node -ArgumentList @("services/agent/local-image-relay.js") -WorkingDirectory $backendDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
}

function Register-Tunnel([string]$url) {
    Invoke-RestMethod -Method Post -Uri "$apiBase/api/agent/local-image-relay/register" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (@{ url = $url } | ConvertTo-Json -Compress) -TimeoutSec 20 | Out-Null
}

try {
    $relayProcess = Start-Relay
    while ($true) {
        if (-not $relayProcess -or $relayProcess.HasExited) { $relayProcess = Start-Relay }

        $tunnelOut = Join-Path $logs "cloudflared.stdout.log"
        $tunnelErr = Join-Path $logs "cloudflared.stderr.log"
        Remove-Item -LiteralPath $tunnelOut, $tunnelErr -Force -ErrorAction SilentlyContinue
        $tunnelProcess = Start-Process -FilePath $cloudflared -ArgumentList @("tunnel", "--no-autoupdate", "--url", "http://127.0.0.1:$relayPort") -WindowStyle Hidden -PassThru -RedirectStandardOutput $tunnelOut -RedirectStandardError $tunnelErr

        $tunnelUrl = $null
        $discoverUntil = (Get-Date).AddMinutes(3)
        while ((Get-Date) -lt $discoverUntil -and -not $tunnelProcess.HasExited -and -not $tunnelUrl) {
            foreach ($file in @($tunnelOut, $tunnelErr)) {
                if (Test-Path -LiteralPath $file) {
                    $text = Get-Content -LiteralPath $file -Raw -ErrorAction SilentlyContinue
                    if ($text -match 'https://[a-zA-Z0-9-]+\.trycloudflare\.com') { $tunnelUrl = $Matches[0]; break }
                }
            }
            if (-not $tunnelUrl) { Start-Sleep -Seconds 2 }
        }

        if ($tunnelUrl) {
            $nextRegistration = Get-Date
            $consecutiveHealthFailures = 0
            while (-not $tunnelProcess.HasExited -and -not $relayProcess.HasExited) {
                if ((Get-Date) -ge $nextRegistration) {
                    try {
                        Register-Tunnel $tunnelUrl
                        $nextRegistration = (Get-Date).AddSeconds(240)
                    } catch {
                        Add-Content -LiteralPath (Join-Path $logs "registration.log") -Value "Tunnel registration retry: $($_.Exception.Message)"
                        $nextRegistration = (Get-Date).AddSeconds(15)
                    }
                }

                try {
                    $health = Invoke-RestMethod -Uri "$tunnelUrl/health" -TimeoutSec 8
                    if ($health.status -eq "ok") { $consecutiveHealthFailures = 0 } else { $consecutiveHealthFailures++ }
                } catch {
                    $consecutiveHealthFailures++
                }

                if ($consecutiveHealthFailures -ge 3) {
                    Add-Content -LiteralPath (Join-Path $logs "registration.log") -Value "Tunnel health failed three times; rotating the temporary tunnel."
                    break
                }
                Start-Sleep -Seconds 20
            }
        } else {
            Start-Sleep -Seconds 10
        }
        if ($tunnelProcess -and -not $tunnelProcess.HasExited) { Stop-Process -Id $tunnelProcess.Id -Force }
    }
} finally {
    if ($tunnelProcess -and -not $tunnelProcess.HasExited) { Stop-Process -Id $tunnelProcess.Id -Force }
    if ($relayProcess -and -not $relayProcess.HasExited) { Stop-Process -Id $relayProcess.Id -Force }
}
