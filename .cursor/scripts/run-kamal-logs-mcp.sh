#!/usr/bin/env bash
# Stdio launcher for the read-only Kamal logs MCP. No secrets file: the
# server only runs `bin/kamal app logs` and does not follow or deploy.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER="$SCRIPT_DIR/../mcp/kamal-logs/server.mjs"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ is required for the Kamal logs MCP." >&2
  exit 1
fi

if [[ ! -f "$SERVER" ]]; then
  echo "Kamal logs MCP server not found at $SERVER" >&2
  exit 1
fi

export SCHOOL_LAB_ROOT="$ROOT"
exec node "$SERVER"
