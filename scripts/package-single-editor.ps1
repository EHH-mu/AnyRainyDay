$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$DistEditor = Join-Path $RepoRoot 'dist-editor'
$PortableTemplate = Join-Path $RepoRoot 'portable'
$ReleaseRoot = Join-Path $RepoRoot 'release'
$AppRoot = Join-Path $ReleaseRoot 'AnyRainyDay-SingleEditor'
$WebRoot = Join-Path $AppRoot 'web'
$ZipPath = Join-Path $ReleaseRoot 'AnyRainyDay-SingleEditor-Windows.zip'

Push-Location $RepoRoot
try {
  npm run editor:build
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/create-standalone-editor.ps1
}
finally {
  Pop-Location
}

if (-not (Test-Path $DistEditor)) {
  throw 'dist-editor was not created.'
}

if (Test-Path $AppRoot) {
  Remove-Item -Path $AppRoot -Recurse -Force
}

if (-not (Test-Path $ReleaseRoot)) {
  New-Item -ItemType Directory -Force -Path $ReleaseRoot | Out-Null
}

New-Item -ItemType Directory -Force -Path $AppRoot | Out-Null
Copy-Item -Path (Join-Path $PortableTemplate '*') -Destination $AppRoot -Recurse -Force
Copy-Item -Path $DistEditor -Destination $WebRoot -Recurse -Force
Copy-Item -Path (Join-Path $DistEditor 'editor-standalone.html') -Destination (Join-Path $AppRoot 'editor-standalone.html') -Force
Copy-Item -Path (Join-Path $DistEditor 'editor-standalone.html') -Destination (Join-Path $AppRoot '直接打开编辑器.html') -Force
Copy-Item -Path (Join-Path $RepoRoot 'LICENSE') -Destination (Join-Path $AppRoot 'LICENSE.txt') -Force
Copy-Item -Path (Join-Path $RepoRoot 'NOTICE.txt') -Destination (Join-Path $AppRoot 'NOTICE.txt') -Force

if (Test-Path $ZipPath) {
  Remove-Item -Path $ZipPath -Force
}

Compress-Archive -Path (Join-Path $AppRoot '*') -DestinationPath $ZipPath -Force
Write-Host "Created: $ZipPath"
