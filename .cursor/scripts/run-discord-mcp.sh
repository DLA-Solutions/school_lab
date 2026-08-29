#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$SCRIPT_DIR/../mcp.env"
SERVER="$SCRIPT_DIR/../mcp/discord-deploy/server.mjs"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from .cursor/mcp.env.example first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

webhook_ok=false
if [[ -n "${DISCORD_DEPLOY_WEBHOOK_URL:-}" && "$DISCORD_DEPLOY_WEBHOOK_URL" != *"your_webhook_token_here"* ]]; then
  webhook_ok=true
fi

bot_ok=false
if [[ -n "${DISCORD_BOT_TOKEN:-}" && "$DISCORD_BOT_TOKEN" != *"your_discord_bot_token_here"* \
  && -n "${DISCORD_DEPLOY_CHANNEL_ID:-}" && "$DISCORD_DEPLOY_CHANNEL_ID" != "000000000000000000" ]]; then
  bot_ok=true
fi

if [[ "$webhook_ok" != true && "$bot_ok" != true ]]; then
  echo "Discord deploy MCP is not configured in $ENV_FILE." >&2
  echo "If you cannot edit the Discord channel, set DISCORD_BOT_TOKEN + DISCORD_DEPLOY_CHANNEL_ID." >&2
  echo "Create the bot at https://discord.com/developers/applications, copy the channel ID (Developer Mode → right-click channel), and ask a server admin to open the bot invite URL once." >&2
  echo "Webhook URL is optional and only works if someone with Manage Webhooks creates one for you." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ is required for the Discord deploy MCP." >&2
  exit 1
fi

if [[ ! -f "$SERVER" ]]; then
  echo "Discord MCP server not found at $SERVER" >&2
  exit 1
fi

if git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  SCHOOL_LAB_GIT_SHA="$(git -C "$ROOT" rev-parse --short HEAD)"
  SCHOOL_LAB_GIT_BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)"
  export SCHOOL_LAB_GIT_SHA SCHOOL_LAB_GIT_BRANCH
fi

exec node "$SERVER"
