#!/usr/bin/env bash
# Blocks `gh pr create` unless web/bin/backend-ci passed on the current HEAD.
# Stamp: .cursor/backend-ci.stamp (gitignored; written by web/bin/backend-ci).

set -euo pipefail

input=$(cat)
command=$(printf '%s' "$input" | python3 -c "import json,sys; print(json.load(sys.stdin).get('command',''))" 2>/dev/null || echo "")

if ! printf '%s' "$command" | grep -qE 'gh pr create'; then
  printf '{"permission":"allow"}\n'
  exit 0
fi

REPO_ROOT="${CURSOR_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
STAMP_FILE="$REPO_ROOT/.cursor/backend-ci.stamp"
HEAD_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo "")

if [ ! -f "$STAMP_FILE" ]; then
  printf '%s\n' '{
    "permission": "deny",
    "user_message": "Backend CI has not passed on this commit. Run: web/bin/backend-ci",
    "agent_message": "gh pr create blocked: missing .cursor/backend-ci.stamp. Run web/bin/backend-ci (or delegate to backend-ci agent) and retry only after exit 0."
  }'
  exit 2
fi

STAMP_SHA=$(head -1 "$STAMP_FILE" | tr -d '[:space:]')

if [ "$STAMP_SHA" != "$HEAD_SHA" ]; then
  printf '%s\n' '{
    "permission": "deny",
    "user_message": "Backend CI stamp is stale (commit changed). Re-run: web/bin/backend-ci",
    "agent_message": "gh pr create blocked: backend-ci.stamp does not match HEAD. Run web/bin/backend-ci on the current commit."
  }'
  exit 2
fi

printf '{"permission":"allow"}\n'
exit 0
