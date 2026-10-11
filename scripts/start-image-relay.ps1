$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDirectory = Join-Path $repoRoot "backend"
$cloudflared = Join-Path $repoRoot "tools\cloudflared.exe"
$node = (Get-Command node -ErrorAction Stop).Source
$apiBase = "https://nexora-ai-api-mqqk.onrender.com"
$relayPort = 8190
$comfyPort = 8188
# Codex and other sandboxes can override LOCALAPPDATA. Pin this worker to the
# real Windows profile so both ComfyUI and its logs resolve consistently.
$env:LOCALAPPDATA = Join-Path $env:USERPROFILE "AppData\Local"
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
if (-not $env:COMFYUI_DIRECTORY) {
    $env:COMFYUI_DIRECTORY = Join-Path $env:USERPROFILE "AppData\Local\NexoraImageGen\ComfyUI_windows_portable"
}
$comfyPython = Join-Path $env:COMFYUI_DIRECTORY "python_embeded\python.exe"
$comfyMain = Join-Path $env:COMFYUI_DIRECTORY "ComfyUI\main.py"
if (-not (Test-Path -LiteralPath $comfyPython) -or -not (Test-Path -LiteralPath $comfyMain)) {
    throw "ComfyUI was not found at '$env:COMFYUI_DIRECTORY'. Check the local ComfyUI installation path."
}
$checkpoint = if ($env:COMFYUI_CHECKPOINT) { $env:COMFYUI_CHECKPOINT } else { "Realistic_Vision_V5.1_fp16-no-ema.safetensors" }
$vaeName = if ($env:COMFYUI_VAE) { $env:COMFYUI_VAE } else { "vae-ft-mse-840000-ema-pruned.safetensors" }
$checkpointPath = Join-Path $env:COMFYUI_DIRECTORY "ComfyUI\models\checkpoints\$checkpoint"
$vaePath = Join-Path $env:COMFYUI_DIRECTORY "ComfyUI\models\vae\$vaeName"
if (-not (Test-Path -LiteralPath $checkpointPath) -or -not (Test-Path -LiteralPath $vaePath)) {
    throw "The configured ComfyUI checkpoint or VAE is missing. Check the ComfyUI models folders."
}

$comfyUrl = "http://127.0.0.1:$comfyPort"
$comfyReady = $false
try {
    $null = Invoke-WebRequest -Uri "$comfyUrl/system_stats" -TimeoutSec 3 -UseBasicParsing
    $comfyReady = $true
} catch { }
if (-not $comfyReady) {
    $comfyStdout = Join-Path $env:COMFYUI_DIRECTORY "comfyui-startup.log"
    $comfyStderr = Join-Path $env:COMFYUI_DIRECTORY "comfyui-stderr.log"
    Start-Process -FilePath $comfyPython -ArgumentList @("-s", "ComfyUI/main.py", "--windows-standalone-build", "--listen", "127.0.0.1", "--port", [string]$comfyPort, "--lowvram") -WorkingDirectory $env:COMFYUI_DIRECTORY -WindowStyle Hidden -RedirectStandardOutput $comfyStdout -RedirectStandardError $comfyStderr | Out-Null
    $comfyDeadline = (Get-Date).AddMinutes(2)
    while ((Get-Date) -lt $comfyDeadline) {
        try {
            $null = Invoke-WebRequest -Uri "$comfyUrl/system_stats" -TimeoutSec 3 -UseBasicParsing
            $comfyReady = $true
            break
        } catch { Start-Sleep -Seconds 2 }
    }
    if (-not $comfyReady) { throw "ComfyUI did not start. See '$comfyStderr' for its startup error." }
}
Start-Process $comfyUrl

$relayMutex = [System.Threading.Mutex]::new($false, "Local\NexoraLaptopImageRelay")
$ownsRelayMutex = $false
try { $ownsRelayMutex = $relayMutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $ownsRelayMutex = $true }
if (-not $ownsRelayMutex) { exit 0 }
$relayProcess = $null
$tunnelProcess = $null
$tunnelRetrySeconds = 300

function Start-Relay {
    $stdout = Join-Path $logs "image-relay.stdout.log"
    $stderr = Join-Path $logs "image-relay.stderr.log"
    Start-Process -FilePath $node -ArgumentList @("services/agent/local-image-relay.js") -WorkingDirectory $backendDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
}

function Register-Tunnel([string]$url) {
    # Render's free instance may need around a minute to wake before it can store
    # the tunnel URL. Keep this registration alive long enough for that cold start.
    try {
        $registration = Invoke-RestMethod -Method Post -Uri "$apiBase/api/agent/local-image-relay/register" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (@{ url = $url } | ConvertTo-Json -Compress) -TimeoutSec 120
        Add-Content -LiteralPath (Join-Path $logs "registration.log") -Value "Tunnel registered with the hosted service; expires in $($registration.expiresInSeconds) seconds."
    } catch {
        $detail = $_.Exception.Message
        if ($_.Exception.Response) {
            try {
                $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
                $detail = $reader.ReadToEnd()
                $reader.Dispose()
            } catch { }
        }
        throw "Tunnel registration failed: $detail"
    }
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
            $tunnelRetrySeconds = 300
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
            Start-Sleep -Seconds $tunnelRetrySeconds
            $tunnelRetrySeconds = [Math]::Min(300, $tunnelRetrySeconds * 2)
        }
        if ($tunnelProcess -and -not $tunnelProcess.HasExited) { Stop-Process -Id $tunnelProcess.Id -Force }
    }
} catch {
    Add-Content -LiteralPath (Join-Path $logs "launcher.stderr.log") -Value "Image relay launcher failed: $($_.Exception.Message)"
    throw
} finally {
    if ($tunnelProcess -and -not $tunnelProcess.HasExited) { Stop-Process -Id $tunnelProcess.Id -Force }
    if ($relayProcess -and -not $relayProcess.HasExited) { Stop-Process -Id $relayProcess.Id -Force }
    if ($ownsRelayMutex) { $relayMutex.ReleaseMutex() }
    $relayMutex.Dispose()
}
