#!/usr/bin/env bash
set -e

VERSION=$(node -p "require('./apps/desktop/package.json').version")
TAG="v$VERSION"

echo "Building desktop v$VERSION..."

cd apps/desktop
npx vite build
npx electron-builder --win --publish never
cd ../..

echo "Creating GitHub release $TAG..."
gh release create "$TAG" \
  apps/desktop/release/*.exe \
  apps/desktop/release/*.AppImage \
  --title "Desktop $TAG" \
  --generate-notes \
  2>/dev/null || \
gh release create "$TAG" \
  apps/desktop/release/*.exe \
  --title "Desktop $TAG" \
  --generate-notes

echo "Done! Release $TAG published."
