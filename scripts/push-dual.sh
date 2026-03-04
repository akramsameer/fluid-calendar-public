#!/bin/bash
#
# Push to both private (SaaS) and public (OS) test repos after a commit.
#
# Usage:
#   ./scripts/push-dual.sh                  # Push to both repos, public branch = main
#   ./scripts/push-dual.sh --branch staging # Push to a specific branch on the public repo
#   ./scripts/push-dual.sh --no-origin      # Skip pushing to origin (already pushed)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
OS_WORKTREE="/tmp/fluid-os-test"

# Defaults
TARGET_BRANCH="main"
PUSH_ORIGIN=true

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --branch)
      TARGET_BRANCH="$2"
      shift 2
      ;;
    --no-origin)
      PUSH_ORIGIN=false
      shift
      ;;
    -h|--help)
      echo "Usage: ./scripts/push-dual.sh [--branch <name>] [--no-origin]"
      echo ""
      echo "Options:"
      echo "  --branch <name>   Target branch on the public repo (default: main)"
      echo "  --no-origin       Skip pushing to origin"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run with --help for usage."
      exit 1
      ;;
  esac
done

cd "$ROOT_DIR"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "Current branch: $CURRENT_BRANCH"
echo ""

# --- Pre-flight checks ---

# Check remotes exist
for remote in saas-test os-test; do
  if ! git remote get-url "$remote" &>/dev/null; then
    echo "ERROR: Remote '$remote' not found."
    echo "Add it with: git remote add $remote <url>"
    exit 1
  fi
done

# Check os-only worktree exists
if [ ! -d "$OS_WORKTREE" ]; then
  echo "ERROR: OS-only worktree not found at $OS_WORKTREE"
  echo ""
  echo "Recreate it with:"
  echo "  git worktree add $OS_WORKTREE os-only"
  exit 1
fi

# --- Step 1: Push to origin ---

if [ "$PUSH_ORIGIN" = true ]; then
  echo "=== Pushing to origin ($CURRENT_BRANCH) ==="
  git push origin "$CURRENT_BRANCH"
  echo ""
else
  echo "=== Skipping origin push (--no-origin) ==="
  echo ""
fi

# --- Step 2: Push to saas-test ---

echo "=== Pushing to saas-test ($CURRENT_BRANCH) ==="
git push saas-test "$CURRENT_BRANCH"
echo ""

# --- Step 3: Sync os-only worktree ---

echo "=== Syncing os-only worktree ==="

# Safety check: verify saas/ is in the worktree's .gitignore
if ! grep -q "^saas/" "$OS_WORKTREE/.gitignore" 2>/dev/null; then
  echo "ERROR: 'saas/' is NOT listed in $OS_WORKTREE/.gitignore"
  echo "This is a safety guard to prevent leaking SaaS code to the public repo."
  echo "Add 'saas/' to $OS_WORKTREE/.gitignore before running this script."
  exit 1
fi

# Merge current branch into os-only
pushd "$OS_WORKTREE" > /dev/null

if ! git merge "origin/$CURRENT_BRANCH" --no-edit; then
  echo ""
  echo "ERROR: Merge conflict in os-only worktree."
  echo "Resolve conflicts manually in $OS_WORKTREE, then run:"
  echo "  cd $OS_WORKTREE && git merge --continue"
  echo "  git push os-test os-only:$TARGET_BRANCH"
  git merge --abort 2>/dev/null || true
  popd > /dev/null
  exit 1
fi

# Post-merge safety check: ensure no saas/ files are staged
LEAKED_FILES="$(git diff --cached --name-only 2>/dev/null | grep "^saas/" || true)"
if [ -n "$LEAKED_FILES" ]; then
  echo ""
  echo "ERROR: saas/ files detected in os-only after merge!"
  echo "Leaked files:"
  echo "$LEAKED_FILES"
  echo ""
  echo "Aborting. Resetting merge..."
  git reset --hard HEAD~1
  popd > /dev/null
  exit 1
fi

popd > /dev/null
echo ""

# --- Step 4: Push os-only to public repo ---

echo "=== Pushing os-only → os-test ($TARGET_BRANCH) ==="
pushd "$OS_WORKTREE" > /dev/null
git push os-test "os-only:$TARGET_BRANCH"
popd > /dev/null
echo ""

# --- Summary ---

echo "=== Done ==="
echo "  Private (origin):    $CURRENT_BRANCH pushed"
if [ "$PUSH_ORIGIN" = true ]; then
  echo "  Private (saas-test): $CURRENT_BRANCH pushed"
fi
echo "  Public (os-test):    os-only → $TARGET_BRANCH pushed"
