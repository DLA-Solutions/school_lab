# Shared path filters for local CI — mirrors archived .github/workflows/ci.yml.archived.
# Source from bin/ci and git hooks.

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
      mobile/*)
        web=1
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

# Paths that must not widen surface detection to all surfaces (CI/tooling/docs churn on feature branches).
ci_pr_gate_excluded_path() {
  local file="$1"

  case "$file" in
    .github/workflows/* | bin/ci | bin/ci-fast | bin/lib/ci-surfaces.sh | bin/install-git-hooks | .githooks/*)
      return 0
      ;;
    .cursor/* | docs/*)
      return 0
      ;;
  esac

  return 1
}

ci_filter_paths_for_pr_gate() {
  local changed="$1"
  local file

  while IFS= read -r file; do
    [ -n "$file" ] || continue
    if ci_pr_gate_excluded_path "$file"; then
      continue
    fi
    printf '%s\n' "$file"
  done <<EOF
$changed
EOF
}

# Product-surface detection for bin/ci — ignores docs/, .cursor/, and CI hook/tooling paths
# so infra churn on a web branch does not require frontend/backoffice/site checks.
ci_detect_pr_surfaces() {
  local repo_root="$1"
  local base_ref="${2:-origin/main}"
  local diff_mode="${3:-three_dot}"
  local changed filtered

  changed="$(ci_changed_files "$repo_root" "$base_ref" "$diff_mode")"
  filtered="$(ci_filter_paths_for_pr_gate "$changed")"
  ci_surfaces_from_changed "$filtered"
}

ci_surface_csv_contains() {
  local csv="$1"
  local surface="$2"
  printf ',%s,' "$csv" | grep -q ",${surface},"
}
