#!/usr/bin/env bash
#
# Install and register a GitHub Actions self-hosted runner on Linux (amd64).
# Run on the Hetzner app server as root or with sudo — creates user github-runner.
#
#   REGISTRATION_TOKEN='<one-hour token>' ./scripts/setup-github-runner.sh
#
# Token: GitHub → Settings → Actions → Runners → New self-hosted runner.
# Full runbook: docs/guidelines/process/github-actions-runner.md

set -euo pipefail

RUNNER_USER="${RUNNER_USER:-github-runner}"
RUNNER_HOME="/home/${RUNNER_USER}"
RUNNER_DIR="${RUNNER_HOME}/actions-runner"
RUNNER_VERSION="${RUNNER_VERSION:-2.325.0}"
REPO_URL="${REPO_URL:-https://github.com/DLA-Solutions/school_lab}"
RUNNER_NAME="${RUNNER_NAME:-hetzner-app}"
RUNNER_LABELS="${RUNNER_LABELS:-hetzner,linux}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root or with sudo." >&2
  exit 1
fi

if [[ -z "${REGISTRATION_TOKEN:-}" ]]; then
  echo "Set REGISTRATION_TOKEN (one-hour token from GitHub runner setup UI)." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required on the runner host." >&2
  exit 1
fi

if ! id "${RUNNER_USER}" &>/dev/null; then
  adduser --disabled-password --gecos "GitHub Actions runner" "${RUNNER_USER}"
fi

usermod -aG docker "${RUNNER_USER}"

mkdir -p "${RUNNER_DIR}"
cd "${RUNNER_DIR}"

ARCHIVE="actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
if [[ ! -f "${ARCHIVE}" ]]; then
  curl -fsSL -o "${ARCHIVE}" \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${ARCHIVE}"
fi

tar xzf "${ARCHIVE}"

chown -R "${RUNNER_USER}:${RUNNER_USER}" "${RUNNER_DIR}"

sudo -u "${RUNNER_USER}" bash -c "
  cd '${RUNNER_DIR}'
  ./config.sh \
    --url '${REPO_URL}' \
    --token '${REGISTRATION_TOKEN}' \
    --name '${RUNNER_NAME}' \
    --labels '${RUNNER_LABELS}' \
    --unattended
"

./svc.sh install "${RUNNER_USER}"
./svc.sh start
./svc.sh status

echo "Runner installed. Confirm Idle status under GitHub → Settings → Actions → Runners."
