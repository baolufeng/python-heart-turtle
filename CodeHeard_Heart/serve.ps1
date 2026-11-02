param([switch]$NoBrowser)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = $null
$listener = $null

foreach ($candidatePort in 8765..8795) {
    $candidateListener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $candidatePort)
    try {
        $candidateListener.Start()
        $port = $candidatePort
        $listener = $candidateListener
        if ($port -ne 8765) {
            Write-Host "Port 8765 is busy. Using port $port instead."
        }
        break
    } catch {
        $candidateListener.Stop()
    }
}

if ($null -eq $listener) {
    throw "No free local port was found between 8765 and 8795."
}

$url = "http://localhost:$port/index.html"
Write-Host ""
Write-Host "Echo of Light is running."
Write-Host "URL: $url"
Write-Host "Camera is processed locally. Close this window to stop the server."
Write-Host ""
if (-not $NoBrowser) {
    $edgeCandidates = @(
        "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        "C:\Program Files\Google\Chrome\Application\chrome.exe",
        "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    )
    $browser = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($browser) {
        Start-Process -FilePath $browser -ArgumentList "--new-window", $url
    } else {
        Start-Process $url
    }
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".mjs"  = "text/javascript; charset=utf-8"
    ".wasm" = "application/wasm"
    ".task" = "application/octet-stream"
    ".png"  = "image/png"
}

while ($listener.Server.IsBound) {
    $client = $listener.AcceptTcpClient()
    try {
        $client.ReceiveTimeout = 4000
        $stream = $client.GetStream()
        $stream.ReadTimeout = 4000
        $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
        $requestLine = $reader.ReadLine()
        $headerCount = 0
        while ($headerCount -lt 100) {
            $headerLine = $reader.ReadLine()
            if ($null -eq $headerLine -or $headerLine -eq "") { break }
            $headerCount++
        }

        $relativePath = if ($requestLine -match "^GET\s+/([^\s?]*)") {
            [System.Uri]::UnescapeDataString($Matches[1])
        } else {
            ""
        }
        if ([string]::IsNullOrWhiteSpace($relativePath)) { $relativePath = "index.html" }

        $candidate = [System.IO.Path]::GetFullPath((Join-Path $root $relativePath))
        $rootPrefix = [System.IO.Path]::GetFullPath($root) + [System.IO.Path]::DirectorySeparatorChar
        if (-not $candidate.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Invalid path"
        }

        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            $body = [System.IO.File]::ReadAllBytes($candidate)
            $extension = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant()
            $contentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { "application/octet-stream" }
            $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
        } else {
            $body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
            $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
        }

        $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        $stream.Write($body, 0, $body.Length)
        $stream.Flush()
    } catch {
        Write-Host "Request failed: $($_.Exception.Message)"
    } finally {
        $client.Close()
    }
}
