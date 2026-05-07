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

# Inject server-side secrets from .env into a temporary app.yaml
ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY=' .env | cut -d'=' -f2-)
VITE_SPOTIFY_CLIENT_ID=$(grep '^VITE_SPOTIFY_CLIENT_ID=' .env | cut -d'=' -f2-)
SPOTIFY_CLIENT_SECRET=$(grep '^SPOTIFY_CLIENT_SECRET=' .env | cut -d'=' -f2-)
awk -v ak="$ANTHROPIC_API_KEY" \
    -v sc_id="$VITE_SPOTIFY_CLIENT_ID" \
    -v sc_secret="$SPOTIFY_CLIENT_SECRET" \
  '/^# env_variables/{
    print "env_variables:"
    print "  ANTHROPIC_API_KEY: \"" ak "\""
    print "  VITE_SPOTIFY_CLIENT_ID: \"" sc_id "\""
    print "  SPOTIFY_CLIENT_SECRET: \"" sc_secret "\""
    print ""
    next
  } 1' \
  app.yaml > "$DEPLOY_DIR/app.yaml"

echo "→ Deploying to App Engine..."
gcloud app deploy "$DEPLOY_DIR/app.yaml" --quiet \
  --project cadence-491202

rm -rf "$DEPLOY_DIR"

echo "→ Done."
echo "  URL: https://cadence-491202.uc.r.appspot.com"
