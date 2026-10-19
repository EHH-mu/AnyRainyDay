$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$DistEditor = Join-Path $RepoRoot 'dist-editor'
$HtmlPath = Join-Path $DistEditor 'editor.html'
$OutPath = Join-Path $DistEditor 'editor-standalone.html'

if (-not (Test-Path $HtmlPath)) {
  throw 'dist-editor/editor.html was not found. Run editor:build first.'
}

$html = Get-Content -Path $HtmlPath -Raw
$cssMatch = [regex]::Match($html, '<link rel="stylesheet" crossorigin href="\./assets/([^"]+)">')
$jsMatch = [regex]::Match($html, '<script type="module" crossorigin src="\./assets/([^"]+)"></script>')

if (-not $cssMatch.Success -or -not $jsMatch.Success) {
  throw 'Could not find built CSS or JS asset references in dist-editor/editor.html.'
}

$cssName = $cssMatch.Groups[1].Value
$jsName = $jsMatch.Groups[1].Value
$css = Get-Content -Path (Join-Path $DistEditor "assets/$cssName") -Raw
$js = Get-Content -Path (Join-Path $DistEditor "assets/$jsName") -Raw

$scriptTag = "<script type=""module"" crossorigin src=""./assets/$jsName""></script>"
$styleTag = "<link rel=""stylesheet"" crossorigin href=""./assets/$cssName"">"

$standalone = $html.Replace($scriptTag, '')
$standalone = $standalone.Replace($styleTag, "<style>`n$css`n</style>")
$standalone = $standalone.Replace('</body>', "  <script type=""module"">`n$js`n  </script>`n  </body>")

Set-Content -Path $OutPath -Value $standalone -Encoding UTF8
Write-Host "Created: $OutPath"
