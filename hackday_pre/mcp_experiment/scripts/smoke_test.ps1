# Smoke test for MCP experiment (PowerShell)
# Usage: run after docker-compose up

$host = 'http://localhost:3002'
Write-Host "Checking MCP experiment at $host`n"

# Check management page
Write-Host "1) GET /management.html"
try {
    $r = Invoke-WebRequest "$host/management.html" -UseBasicParsing -ErrorAction Stop
    Write-Host " -> HTTP" $r.StatusCode "- OK"
} catch {
    Write-Host " -> Failed to GET /management.html:`n" $_.Exception.Message
}

# Check fetch endpoint
Write-Host "`n2) GET /mcp/fetch?url=https://example.com&apiKey=devkey123"
try {
    $res = Invoke-RestMethod "$host/mcp/fetch?url=https://example.com&apiKey=devkey123" -Method GET -ErrorAction Stop
    Write-Host " -> Success. Sample output (first 400 chars):`n" ($res.markdown.Substring(0,[Math]::Min(400,$res.markdown.Length)))
} catch {
    Write-Host " -> fetch failed:`n" $_.Exception.Message
}

# Check stepify endpoint (POST)
Write-Host "`n3) POST /mcp/stepify (x-api-key header)"
$body = @{ text = '写真を撮る。来場者を誘導する。忘れ物対応をする。' } | ConvertTo-Json
try {
    $res2 = Invoke-RestMethod -Uri "$host/mcp/stepify" -Method POST -Headers @{ 'x-api-key' = 'devkey123' } -Body $body -ContentType 'application/json' -ErrorAction Stop
    Write-Host " -> stepify returned tasks:`n"
    $res2.tasks | ForEach-Object { Write-Host "  - $_.id : $_.title" }
} catch {
    Write-Host " -> stepify failed:`n" $_.Exception.Message
}

Write-Host "`nSmoke test complete. If any check failed, paste the error output here and I will help debug."
