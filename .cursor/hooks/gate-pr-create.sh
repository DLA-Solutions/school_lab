#!/usr/bin/env bash
# Blocks `gh pr create` unless local CI passed on HEAD for product surfaces changed vs base.
# Uses ci_detect_pr_surfaces (path-aware): docs/, .cursor/, bin/ci, and .githooks/ do not
# widen required surfaces. Stamp: .cursor/ci.stamp (gitignored; written by bin/ci or web/bin/backend-ci).

set -euo pipefail

input=$(cat)
command=$(printf '%s' "$input" | python3 -c "import json,sys; print(json.load(sys.stdin).get('command',''))" 2>/dev/null || echo "")

if ! printf '%s' "$command" | grep -qE 'gh pr create'; then
  printf '{"permission":"allow"}\n'
  exit 0
fi

REPO_ROOT="${CURSOR_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
STAMP_FILE="$REPO_ROOT/.cursor/ci.stamp"
HEAD_SHA=$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo "")

# shellcheck source=../../bin/lib/ci-surfaces.sh
source "$REPO_ROOT/bin/lib/ci-surfaces.sh"

deny() {
  python3 -c 'import json,sys; print(json.dumps({"permission":"deny","user_message":sys.argv[1],"agent_message":sys.argv[2]}))' "$1" "$2"
  exit 2
}

if [ ! -f "$STAMP_FILE" ]; then
  deny \
    "Local CI has not passed on this commit. Run: bin/ci" \
    "gh pr create blocked: missing .cursor/ci.stamp. Run bin/ci (or bin/ci-fast) and retry only after exit 0."
fi

STAMP_SHA=$(head -1 "$STAMP_FILE" | tr -d '[:space:]')

if [ "$STAMP_SHA" != "$HEAD_SHA" ]; then
  deny \
    "Local CI stamp is stale (commit changed). Re-run: bin/ci" \
    "gh pr create blocked: ci.stamp does not match HEAD. Run bin/ci on the current commit."
fi

STAMP_SURFACES=""
while IFS= read -r line; do
  case "$line" in
    surfaces=*)
      STAMP_SURFACES="${line#surfaces=}"
      ;;
  esac
done < "$STAMP_FILE"

REQUIRED_SURFACES="$(ci_detect_pr_surfaces "$REPO_ROOT" "origin/main" || true)"

if [ -z "$REQUIRED_SURFACES" ]; then
  if [ "$STAMP_SURFACES" = "none" ] || [ -n "$STAMP_SURFACES" ]; then
    printf '{"permission":"allow"}\n'
    exit 0
  fi
fi

MISSING=""
while IFS= read -r surface; do
  [ -n "$surface" ] || continue
  if ! ci_surface_csv_contains "$STAMP_SURFACES" "$surface"; then
    MISSING="${MISSING}${MISSING:+, }${surface}"
  fi
done <<EOF
$REQUIRED_SURFACES
EOF

if [ -n "$MISSING" ]; then
  HINT="bin/ci"
  if [ "$MISSING" = "web" ]; then
    HINT="web/bin/backend-ci"
  fi
  deny \
    "Local CI missing surface(s): ${MISSING}. Run: ${HINT}" \
    "gh pr create blocked: ci.stamp lacks required surfaces (${MISSING}). Run ${HINT} on the current commit."
fi

printf '{"permission":"allow"}\n'
exit 0
