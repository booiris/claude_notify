#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NOTIFY_SCRIPT="$SCRIPT_DIR/notify.sh"
CLAUDE_SETTINGS_DIR="$HOME/.claude"
CLAUDE_SETTINGS="$CLAUDE_SETTINGS_DIR/settings.json"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[ OK ]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERR ]${NC} $1" >&2; exit 1; }

# --- Banner ---
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║      🔨 Claude Notify Installer      ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# --- Check dependencies ---
info "Checking dependencies..."

command -v node &>/dev/null || error "Node.js is required but not found. Install: https://nodejs.org"
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_MAJOR" -ge 14 ] || error "Node.js >= 14 required (found $(node -v))"
ok "Node.js $(node -v)"

command -v curl &>/dev/null || error "curl is required but not found"
ok "curl"

# --- Make scripts executable ---
chmod +x "$NOTIFY_SCRIPT"
ok "notify.sh is executable"

# --- Configure Claude Code hook ---
info "Configuring Claude Code Stop hook..."
mkdir -p "$CLAUDE_SETTINGS_DIR"

HOOK_CMD="$NOTIFY_SCRIPT"

if [ -f "$CLAUDE_SETTINGS" ]; then
  RESULT=$(node -e "
    const fs = require('fs');
    const hookCmd = process.argv[1];

    let settings;
    try {
      settings = JSON.parse(fs.readFileSync('$CLAUDE_SETTINGS', 'utf8'));
    } catch(e) {
      console.error('Failed to parse settings: ' + e.message);
      process.exit(1);
    }

    if (!settings.hooks) settings.hooks = {};

    const hookEntry = {
      matcher: '',
      hooks: [{ type: 'command', command: hookCmd }]
    };

    const eventTypes = ['Stop', 'PermissionRequest'];
    let allSkipped = true;

    for (const evt of eventTypes) {
      if (!Array.isArray(settings.hooks[evt])) settings.hooks[evt] = [];

      const exists = settings.hooks[evt].some(
        h => Array.isArray(h.hooks) && h.hooks.some(
          hk => typeof hk.command === 'string' && hk.command.includes('notify.sh')
        )
      );

      if (!exists) {
        settings.hooks[evt].push({ ...hookEntry });
        allSkipped = false;
      }
    }

    if (allSkipped) {
      console.log('SKIP');
      process.exit(0);
    }

    fs.writeFileSync('$CLAUDE_SETTINGS', JSON.stringify(settings, null, 2) + '\n');
    console.log('OK');
  " "$HOOK_CMD" 2>&1) || error "Failed to update $CLAUDE_SETTINGS"

  case "$RESULT" in
    SKIP) warn "Hook already configured, skipping" ;;
    OK)   ok "Hook added to $CLAUDE_SETTINGS" ;;
    *)    error "Unexpected result: $RESULT" ;;
  esac
else
  node -e "
    const fs = require('fs');
    const entry = { matcher: '', hooks: [{ type: 'command', command: process.argv[1] }] };
    const settings = {
      hooks: {
        Stop: [entry],
        PermissionRequest: [{ ...entry }]
      }
    };
    fs.writeFileSync('$CLAUDE_SETTINGS', JSON.stringify(settings, null, 2) + '\n');
  " "$HOOK_CMD" || error "Failed to create $CLAUDE_SETTINGS"
  ok "Created $CLAUDE_SETTINGS"
fi

# --- Done ---
echo ""
echo -e "  ${GREEN}✅ Installation complete!${NC}"
echo ""
echo "  Next steps:"
echo ""
echo -e "    1. Start the server:  ${CYAN}node ${SCRIPT_DIR}/server.js${NC}"
echo -e "    2. Open browser:      ${CYAN}http://localhost:8888${NC}"
echo "    3. Click「解锁声音」button in the page"
echo "    4. Use Claude Code as usual — you'll hear a Peon when it's done 🔨"
echo ""
