#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../mcp.env"
BIN="$SCRIPT_DIR/../bin/github-mcp-server"

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
