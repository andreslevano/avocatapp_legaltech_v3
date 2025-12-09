#!/bin/bash

# Exit immediately if a command exits with a non-zero status,
# treat unset variables as an error, and ensure pipelines fail fast.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v firebase >/dev/null 2>&1; then
  echo "Error: firebase CLI is not installed or not on PATH." >&2
  exit 1
fi

VERSION="$(git rev-parse --short HEAD)-$(date +%Y%m%d%H%M%S)"
DEPLOY_TS="$(date '+%Y-%m-%d %H:%M:%S %Z')"

echo "Starting Firebase deploy at $DEPLOY_TS"
echo "Deploy version: $VERSION"
echo "Note: run this script outside restricted sandboxes (Cursor required_permissions=['all']) so npm can access ~/.nvm."

echo "Clearing frontend caches..."
rm -rf .next node_modules/.cache

if [ -d "functions" ]; then
  echo "Clearing backend caches..."
  rm -rf functions/lib functions/.cache
fi

echo "Installing root dependencies..."
npm install

# Temporarily move API routes to avoid build conflicts with static export
# API routes are handled by Firebase Cloud Functions
# Use .disabled extension so Next.js won't process it
if [ -d "src/app/api" ]; then
  echo "Temporarily moving API routes for build..."
  mv src/app/api src/app/api.disabled
  API_MOVED=true
else
  API_MOVED=false
fi

echo "Building Next.js application..."
# Workaround for Next.js static export pages-manifest.json issue
mkdir -p .next/server
echo '{}' > .next/server/pages-manifest.json
npm run build || {
  # If build fails, try again after ensuring directory exists
  mkdir -p .next/server
  npm run build
}

# Restore API routes after build
if [ "$API_MOVED" = true ]; then
  echo "Restoring API routes..."
  mv src/app/api.disabled src/app/api
fi

if [ -d "functions" ]; then
  echo "Installing Firebase Functions dependencies..."
  npm --prefix functions install

  echo "Building Firebase Functions..."
  npm --prefix functions run build
fi

VERSION_FILE="public/version.json"
echo "Writing deployment metadata to $VERSION_FILE"
printf '{\n  "version": "%s",\n  "deployedAt": "%s"\n}\n' "$VERSION" "$DEPLOY_TS" > "$VERSION_FILE"

echo "Deploying to Firebase..."
firebase deploy

COMPLETED_TS="$(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "Deploy completed at $COMPLETED_TS"

