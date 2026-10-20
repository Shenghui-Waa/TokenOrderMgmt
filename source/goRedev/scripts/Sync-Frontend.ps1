param([switch]$Install)

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$goRoot = Split-Path -Parent $scriptRoot
$sourceRoot = Resolve-Path (Join-Path $goRoot '..\frontend')
$targetRoot = Join-Path $goRoot 'frontend'

New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
robocopy $sourceRoot $targetRoot /E /XD node_modules dist .idea /XF '*.tsbuildinfo' 'api.ts' 'api.test.ts' 'App.tsx'
if ($LASTEXITCODE -ge 8) {
    throw "Frontend sync failed with robocopy exit code $LASTEXITCODE"
}

Write-Host 'Shared React files synced; desktop adapter files were preserved.'
if ($Install) {
    Push-Location $targetRoot
    try { npm ci } finally { Pop-Location }
}
