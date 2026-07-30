#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DBML="$ROOT/docs/database/schema.dbml"
PROJECT="contatodcd60b30ac/school_lab"

if ! command -v dbdocs >/dev/null 2>&1; then
  echo "error: dbdocs CLI not found. Install: npm install -g dbdocs" >&2
  exit 1
fi

if [[ ! -f "$DBML" ]]; then
  echo "error: missing $DBML" >&2
  exit 1
fi

echo "Validating $DBML ..."
dbdocs validate "$DBML"

echo "Publishing to https://dbdocs.io/$PROJECT ..."
dbdocs build "$DBML" --project "$PROJECT"

echo "Done. Visit: https://dbdocs.io/$PROJECT"
