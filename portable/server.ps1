$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $Root 'web'
$StateDir = Join-Path $Root '.server'
$PortFile = Join-Path $StateDir 'port.txt'

if (-not (Test-Path $WebRoot)) {
  Write-Host '没有找到 web 文件夹，请确认压缩包已完整解压。'
  Read-Host '按 Enter 退出'
  exit 1
}

if (-not (Test-Path $StateDir)) {
  New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
}

function Get-ContentType {
  param([string]$Path)

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    '.html' { 'text/html; charset=utf-8'; break }
    '.css' { 'text/css; charset=utf-8'; break }
    '.js' { 'text/javascript; charset=utf-8'; break }
    '.json' { 'application/json; charset=utf-8'; break }
    '.png' { 'image/png'; break }
    '.jpg' { 'image/jpeg'; break }
    '.jpeg' { 'image/jpeg'; break }
    '.webp' { 'image/webp'; break }
    '.svg' { 'image/svg+xml'; break }
    '.wasm' { 'application/wasm'; break }
    default { 'application/octet-stream' }
  }
}

function Send-Text {
  param(
    [System.Net.HttpListenerResponse]$Response,
    [int]$StatusCode,
    [string]$Text
  )

  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $Response.StatusCode = $StatusCode
  $Response.ContentType = 'text/plain; charset=utf-8'
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.OutputStream.Close()
}

$listener = $null
$port = $null

foreach ($candidatePort in 5173..5273) {
  try {
    $candidate = New-Object System.Net.HttpListener
    $candidate.Prefixes.Add("http://127.0.0.1:$candidatePort/")
    $candidate.Start()
    $listener = $candidate
    $port = $candidatePort
    break
  }
  catch {
    if ($candidate) {
      $candidate.Close()
    }
  }
}

if (-not $listener) {
  Write-Host '无法启动本地服务，请检查是否有安全软件拦截 localhost。'
  Read-Host '按 Enter 退出'
  exit 1
}

Set-Content -Path $PortFile -Value $port -Encoding ASCII
$url = "http://127.0.0.1:$port/editor.html"
Start-Process $url

Write-Host "AnyRainyDay 单图雨效编辑器已启动：$url"
Write-Host '关闭此窗口或运行“停止雨效编辑器.bat”即可停止。'

$webRootFull = [System.IO.Path]::GetFullPath($WebRoot)

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    if ($request.Url.AbsolutePath -eq '/__stop') {
      Send-Text $response 200 'stopping'
      break
    }

    $urlPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($urlPath)) {
      $urlPath = 'editor.html'
    }

    $relativePath = $urlPath -replace '/', [System.IO.Path]::DirectorySeparatorChar
    $fullPath = [System.IO.Path]::GetFullPath((Join-Path $WebRoot $relativePath))

    if (-not $fullPath.StartsWith($webRootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
      Send-Text $response 403 'Forbidden'
      continue
    }

    if (-not (Test-Path $fullPath -PathType Leaf)) {
      Send-Text $response 404 'Not found'
      continue
    }

    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    $response.StatusCode = 200
    $response.ContentType = Get-ContentType $fullPath
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
    $response.OutputStream.Close()
  }
}
finally {
  if ($listener) {
    $listener.Stop()
    $listener.Close()
  }
  if (Test-Path $PortFile) {
    Remove-Item -Path $PortFile -Force
  }
  Write-Host '编辑器已停止。'
}
