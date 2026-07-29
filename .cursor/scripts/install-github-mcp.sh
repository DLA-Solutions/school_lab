#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN_DIR="$ROOT/.cursor/bin"
BIN="$BIN_DIR/github-mcp-server"
VERSION="v1.7.0"

arch="$(uname -m)"
case "$arch" in
  arm64) asset="github-mcp-server_Darwin_arm64.tar.gz" ;;
  x86_64) asset="github-mcp-server_Darwin_x86_64.tar.gz" ;;
  *)
    echo "Unsupported architecture: $arch" >&2
    exit 1
    ;;
esac

mkdir -p "$BIN_DIR"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

url="https://github.com/github/github-mcp-server/releases/download/${VERSION}/${asset}"
echo "Downloading $url ..."
curl -fsSL "$url" -o "$tmpdir/archive.tar.gz"
tar -xzf "$tmpdir/archive.tar.gz" -C "$tmpdir"
install -m 755 "$tmpdir/github-mcp-server" "$BIN"

echo "Installed $BIN"
