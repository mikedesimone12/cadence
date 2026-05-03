#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deploying Cadence to GCP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "→ Building..."
npm run build

echo "→ Staging deploy package..."
DEPLOY_DIR=$(mktemp -d)
cp app.yaml "$DEPLOY_DIR/"
cp -r dist  "$DEPLOY_DIR/"

echo "→ Deploying to App Engine..."
gcloud app deploy "$DEPLOY_DIR/app.yaml" --quiet \
  --project cadence-491202

rm -rf "$DEPLOY_DIR"

echo "→ Done."
echo "  URL: https://cadence-491202.uc.r.appspot.com"
