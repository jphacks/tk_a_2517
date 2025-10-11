#!/usr/bin/env bash
HOST=http://localhost:3002
echo "Checking MCP experiment at $HOST"

echo "1) GET /management.html"
curl -sSf "$HOST/management.html" >/dev/null && echo " -> OK" || echo " -> failed"

echo "\n2) GET /mcp/fetch"
curl -s "$HOST/mcp/fetch?url=https://example.com&apiKey=devkey123" | jq -r '.markdown | .[0:400]'

echo "\n3) POST /mcp/stepify"
curl -s -X POST "$HOST/mcp/stepify" -H 'x-api-key: devkey123' -H 'Content-Type: application/json' -d '{"text":"写真を撮る。来場者を誘導する。忘れ物対応をする。"}' | jq '.tasks'

echo "\nSmoke test complete"
