#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deploying Cadence to GCP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "→ Building..."
npm run build

echo "→ Staging deploy package..."
DEPLOY_DIR=$(mktemp -d)
cp -r dist server.js package.json "$DEPLOY_DIR/"

# Inject ANTHROPIC_API_KEY from .env into a temporary app.yaml
ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY=' .env | cut -d'=' -f2-)
awk -v key="$ANTHROPIC_API_KEY" \
  '/^# env_variables/{print "env_variables:"; print "  ANTHROPIC_API_KEY: \"" key "\""; print ""; next} 1' \
  app.yaml > "$DEPLOY_DIR/app.yaml"

echo "→ Deploying to App Engine..."
gcloud app deploy "$DEPLOY_DIR/app.yaml" --quiet \
  --project cadence-491202

rm -rf "$DEPLOY_DIR"

echo "→ Done."
echo "  URL: https://cadence-491202.uc.r.appspot.com"
