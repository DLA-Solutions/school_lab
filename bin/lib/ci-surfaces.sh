# Shared path filters for local CI — mirrors archived .github/workflows/ci.yml.archived.
# Source from bin/ci, git hooks, and .cursor/hooks/gate-pr-create.sh.

ci_resolve_base_ref() {
  local repo_root="$1"
  local base_ref="${2:-origin/main}"

  if git -C "$repo_root" rev-parse --verify "$base_ref" >/dev/null 2>&1; then
    printf '%s' "$base_ref"
    return 0
  fi

  if git -C "$repo_root" rev-parse --verify "${base_ref#origin/}" >/dev/null 2>&1; then
    printf '%s' "${base_ref#origin/}"
    return 0
  fi

  git -C "$repo_root" merge-base HEAD origin/main 2>/dev/null || git -C "$repo_root" rev-parse HEAD~1
}

# three_dot: BASE...HEAD (default for branch vs main)
# two_dot:   BASE..HEAD (commits being pushed)
# staged:    git index vs HEAD (pre-commit)
ci_changed_files() {
  local repo_root="$1"
  local base_ref="${2:-origin/main}"
  local diff_mode="${3:-three_dot}"

  case "$diff_mode" in
    staged)
      git -C "$repo_root" diff --cached --name-only 2>/dev/null || true
      ;;
    two_dot)
      git -C "$repo_root" diff --name-only "${base_ref}..HEAD" 2>/dev/null || true
      ;;
    *)
      local resolved
      resolved="$(ci_resolve_base_ref "$repo_root" "$base_ref")"
      git -C "$repo_root" diff --name-only "${resolved}...HEAD" 2>/dev/null || true
      ;;
  esac
}

# Prints one surface per line: web | site | frontend | backoffice
ci_surfaces_from_changed() {
  local changed="$1"
  local file
  local web=0 site=0 frontend=0 backoffice=0

  while IFS= read -r file; do
    [ -n "$file" ] || continue
    case "$file" in
      .github/workflows/ci.yml* | .github/workflows/openapi.yml* | bin/ci | bin/ci-fast | bin/lib/ci-surfaces.sh | .githooks/*)
        web=1
        site=1
        frontend=1
        backoffice=1
        ;;
      web/* | web/bin/backend-ci*)
        web=1
        ;;
      site/*)
        site=1
        ;;
      frontend/app/*)
        frontend=1
        ;;
      packages/design-tokens/*)
        frontend=1
        backoffice=1
        ;;
      frontend/backoffice/*)
        backoffice=1
        ;;
    esac
  done <<EOF
$changed
EOF

  [ "$web" -eq 1 ] && printf 'web\n'
  [ "$site" -eq 1 ] && printf 'site\n'
  [ "$frontend" -eq 1 ] && printf 'frontend\n'
  [ "$backoffice" -eq 1 ] && printf 'backoffice\n'
  return 0
}

ci_detect_surfaces() {
  local repo_root="$1"
  local base_ref="${2:-origin/main}"
  local diff_mode="${3:-three_dot}"
  local changed

  changed="$(ci_changed_files "$repo_root" "$base_ref" "$diff_mode")"
  ci_surfaces_from_changed "$changed"
}

ci_surface_csv_contains() {
  local csv="$1"
  local surface="$2"
  printf ',%s,' "$csv" | grep -q ",${surface},"
}
