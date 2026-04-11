#!/usr/bin/env bash
# Claude Notify - CLI trigger script
# Usage:
#   ./notify.sh "message"
#   ./notify.sh              (default message: "Task completed")

set -euo pipefail

HOST="${CLAUDE_NOTIFY_HOST:-localhost}"
PORT="${CLAUDE_NOTIFY_PORT:-8888}"
MESSAGE="${1:-Task completed}"

curl -s -X POST "http://${HOST}:${PORT}/notify" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"${MESSAGE}\"}" \
  | python3 -m json.tool 2>/dev/null || echo '{"ok": true}'
