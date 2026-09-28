#!/usr/bin/env bash
# Claude Code copy of .cursor/scripts/run-github-mcp.sh — shares the same
# credentials file and installed binary under .cursor/ (single source of truth).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$ROOT/.cursor/mcp.env"
BIN="$ROOT/.cursor/bin/github-mcp-server"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from .cursor/mcp.env.example first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" || "$GITHUB_PERSONAL_ACCESS_TOKEN" == "your_github_pat_here" ]]; then
  echo "Set GITHUB_PERSONAL_ACCESS_TOKEN in $ENV_FILE" >&2
  exit 1
fi

export GITHUB_TOOLSETS="${GITHUB_TOOLSETS:-default,projects}"

if [[ ! -x "$BIN" ]]; then
  echo "GitHub MCP binary not found. Run: .cursor/scripts/install-github-mcp.sh" >&2
  exit 1
fi

exec "$BIN" stdio
