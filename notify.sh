#!/usr/bin/env bash
# Claude Notify - CLI trigger script
# Usage:
#   ./notify.sh "message"
#   ./notify.sh              (default message: "Task completed")

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT_FILE="$SCRIPT_DIR/.notify-port"

HOST="${CLAUDE_NOTIFY_HOST:-localhost}"

# Port resolution priority:
#   1. CLAUDE_NOTIFY_PORT env var (explicit override, e.g. for a remote host)
#   2. .notify-port file written by server.js on startup (auto-sync, same host)
#   3. 8888 default
PORT="${CLAUDE_NOTIFY_PORT:-}"
if [ -z "$PORT" ] && [ -s "$PORT_FILE" ]; then
  PORT="$(tr -d '[:space:]' < "$PORT_FILE")"
fi
PORT="${PORT:-8888}"

MESSAGE="${1:-Task completed}"

curl -s -X POST "http://${HOST}:${PORT}/notify" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"${MESSAGE}\"}" \
  | python3 -m json.tool 2>/dev/null || echo '{"ok": true}'
