#!/usr/bin/env bash
# Cursor hook for `gh pr create`. CI is deploy-only — never block PR creation.
# Run bin/ci or web/bin/backend-ci manually, or rely on deploy-kamal before shipping.

set -euo pipefail

printf '{"permission":"allow"}\n'
exit 0
