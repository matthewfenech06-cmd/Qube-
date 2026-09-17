param(
  [int]$Port = 8080,
  [string]$Root = $PSScriptRoot
)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root on http://localhost:$Port/"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".json" = "application/json"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".ico"  = "image/x-icon"
  ".txt"  = "text/plain; charset=utf-8"
  ".xml"  = "application/xml"
  ".mp4"  = "video/mp4"
  ".webp" = "image/webp"
}

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
  } catch {
    break
  }
  $request = $context.Request
  $response = $context.Response
  $response.KeepAlive = $false
  $response.SendChunked = $false
  try {
    $path = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
    if ($path -eq "/") { $path = "/index.html" }

    $filePath = Join-Path $Root ($path.TrimStart("/"))

    # clean URLs: /whats-on -> /whats-on.html
    if (-not (Test-Path $filePath -PathType Leaf)) {
      if (Test-Path "$filePath.html" -PathType Leaf) {
        $filePath = "$filePath.html"
      }
    }

    if (Test-Path $filePath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
      $contentType = $mime[$ext]
      if (-not $contentType) { $contentType = "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $response.ContentType = $contentType
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $response.StatusCode = 404
      $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
      $response.ContentType = "text/plain; charset=utf-8"
      $response.ContentLength64 = $notFoundBytes.Length
      $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
    }
  } catch {
    Write-Host "Error: $_"
    $response.StatusCode = 500
  } finally {
    $response.OutputStream.Close()
  }
}
