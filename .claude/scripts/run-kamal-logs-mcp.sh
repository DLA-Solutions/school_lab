#!/usr/bin/env bash
# Claude Code copy of .cursor/scripts/run-kamal-logs-mcp.sh — shares the same
# server implementation under .cursor/ (single source of truth).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER="$ROOT/.cursor/mcp/kamal-logs/server.mjs"

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
