#!/bin/bash
#
# Run both OS and SaaS versions simultaneously on different ports.
#
# Usage:
#   ./scripts/run-dual.sh          # Build both, then run
#   ./scripts/run-dual.sh --run    # Skip builds, just run (if already built)
#
# Ports:
#   SaaS version: http://localhost:3000
#   OS version:   http://localhost:3001

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
OS_BUILD_DIR="$ROOT_DIR/.next-os"

cd "$ROOT_DIR"

cleanup() {
  echo ""
  echo "Shutting down servers..."
  kill $SAAS_PID $OS_PID 2>/dev/null
  wait $SAAS_PID $OS_PID 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

if [ "$1" != "--run" ]; then
  echo "=== Building OS version ==="
  npx tsx scripts/clean-saas-symlinks.ts
  NEXT_PUBLIC_ENABLE_SAAS_FEATURES=false npx next build
  rm -rf "$OS_BUILD_DIR"
  cp -r .next/standalone "$OS_BUILD_DIR"
  # Copy static assets for OS build
  cp -r .next/static "$OS_BUILD_DIR/.next/static" 2>/dev/null || true
  cp -r public "$OS_BUILD_DIR/public" 2>/dev/null || true
  echo ""

  echo "=== Building SaaS version ==="
  npx tsx scripts/setup-saas.ts
  npx next build
  echo ""
fi

echo "=== Starting both servers ==="
echo "  SaaS: http://localhost:3000"
echo "  OS:   http://localhost:3001"
echo ""

PORT=3000 node .next/standalone/server.js &
SAAS_PID=$!

PORT=3001 node "$OS_BUILD_DIR/server.js" &
OS_PID=$!

echo "Both servers running. Press Ctrl+C to stop."
wait
