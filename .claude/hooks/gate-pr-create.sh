#!/usr/bin/env bash
# Claude Code adaptation of .cursor/hooks/gate-pr-create.sh.
# CI is deploy-only — never block PR creation.
# Run bin/ci or web/bin/backend-ci manually, or rely on deploy-kamal before shipping.
#
# Wired as a PreToolUse hook on the Bash tool (see .claude/settings.json),
# matched only when the command contains `gh pr create`. Claude Code's
# PreToolUse hook contract expects JSON on stdout with a "permissionDecision"
# of "allow" | "deny" | "ask" (falling back to the default prompt otherwise).

set -euo pipefail

printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}\n'
exit 0
