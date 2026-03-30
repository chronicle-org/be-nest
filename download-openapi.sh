#!/bin/bash
# Download complete OpenAPI spec from running app

APP_URL="${1:-http://localhost:3001}"

echo "📥 Downloading OpenAPI spec from $APP_URL..."

curl -s "$APP_URL/api/docs-json" > openapi.json

if [ -s openapi.json ]; then
  echo "✅ OpenAPI spec downloaded successfully!"
  echo "📄 File: openapi.json"
  echo "📋 Size: $(wc -c < openapi.json) bytes"
  echo ""
  echo "📤 Ready to upload to SwaggerHub: https://app.swaggerhub.com"
else
  echo "❌ Failed to download spec. Make sure the app is running at $APP_URL"
  exit 1
fi
