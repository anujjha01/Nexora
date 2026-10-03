$ErrorActionPreference = "Stop"
$version = "2026.9.3"
$expectedHash = "f096265ec2fcbe9bb6e2d64268db167ced3fcbb83d894bdb9e2fcdb26f2ea7e2"
$repoRoot = Split-Path -Parent $PSScriptRoot
$toolsDirectory = Join-Path $repoRoot "tools"
$destination = Join-Path $toolsDirectory "cloudflared.exe"
$downloadUrl = "https://github.com/cloudflare/cloudflared/releases/download/$version/cloudflared-windows-amd64.exe"

New-Item -ItemType Directory -Force -Path $toolsDirectory | Out-Null
Invoke-WebRequest -Uri $downloadUrl -OutFile $destination
$actualHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $expectedHash) {
    Remove-Item -LiteralPath $destination -Force
    throw "The downloaded Cloudflare Tunnel binary did not match Cloudflare's published checksum."
}
Write-Output "Cloudflare Tunnel $version is installed and checksum-verified."
