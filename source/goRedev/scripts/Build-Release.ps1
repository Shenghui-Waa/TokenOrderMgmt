param([string]$Version = '0.1.0')

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'Sync-Frontend.ps1') -Install

Push-Location $projectRoot
try {
    Push-Location (Join-Path $projectRoot 'frontend')
    try { npm run build } finally { Pop-Location }
    $embeddedDist = Join-Path $projectRoot 'build\windows\frontend\dist'
    if (Test-Path $embeddedDist) {
        Remove-Item -LiteralPath $embeddedDist -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $embeddedDist | Out-Null
    Copy-Item -Path (Join-Path $projectRoot 'frontend\dist\*') -Destination $embeddedDist -Recurse -Force
    wails build -platform windows/amd64 -clean -s -ldflags "-s -w"
    $releaseDir = Join-Path $projectRoot "build\release\TokenOrderMgmt-$Version-windows-x64"
    if (Test-Path $releaseDir) { Remove-Item -LiteralPath $releaseDir -Recurse -Force }
    New-Item -ItemType Directory -Path (Join-Path $releaseDir 'data') -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $projectRoot 'build\bin\TokenOrderMgmt.exe') -Destination $releaseDir
    Copy-Item -LiteralPath (Join-Path $projectRoot 'README.md') -Destination $releaseDir
    $zip = "$releaseDir.zip"
    if (Test-Path $zip) { Remove-Item -LiteralPath $zip -Force }
    Compress-Archive -LiteralPath $releaseDir -DestinationPath $zip -CompressionLevel Optimal
    Write-Host "Release package: $zip"
} finally {
    Pop-Location
}
