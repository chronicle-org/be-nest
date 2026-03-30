# SwaggerHub Integration Guide

This guide explains how to sync your Chronicle API documentation to SwaggerHub for centralized API management.

## What is SwaggerHub?

SwaggerHub is a platform for:
- 📚 Centralized API documentation & versioning
- 🔄 Syncing with GitHub (auto-publish on updates)
- 🚀 API mocking servers
- 👥 Team collaboration
- 📊 Analytics & metrics

## Quick Start

### Option 1: Download Complete Spec (⭐ Recommended)

**Fastest way to get a complete, detailed OpenAPI spec:**

```bash
# Terminal 1: Start dev server
npm run start:dev

# Terminal 2: Download the spec
npm run download:openapi

# Then upload openapi.json to SwaggerHub
```

### Option 2: Manual Upload (One-time)

1. **Generate the OpenAPI spec locally:**
   ```bash
   npm run generate:openapi
   ```
   This creates `openapi.json` in your project root (basic template).

2. **Go to SwaggerHub:**
   - Visit https://app.swaggerhub.com
   - Sign up or log in with your account

3. **Create a new API:**
   - Click "Create" → "New API"
   - Name: `Chronicle API`
   - Version: `1.0.0`
   - Select "OpenAPI 3.0" format

4. **Upload the spec:**
   - Click "Import and Document"
   - Upload your generated `openapi.json` file
   - Your API documentation is now live!

1. **Generate the OpenAPI spec locally:**
   ```bash
   npm run generate:openapi
   ```
   This creates `openapi.json` in your project root.

2. **Go to SwaggerHub:**
   - Visit https://app.swaggerhub.com
   - Sign up or log in with your account

3. **Create a new API:**
   - Click "Create" → "New API"
   - Name: `Chronicle API`
   - Version: `1.0.0`
   - Select "OpenAPI 3.0" format

4. **Upload the spec:**
   - Click "Import and Document"
   - Upload your generated `openapi.json` file
   - Your API documentation is now live!

### Option 2: GitHub Integration (Auto-Sync) ⭐ Recommended

This automatically publishes your OpenAPI spec to SwaggerHub whenever you push to GitHub.

#### Step 1: Set up GitHub Repository Access in SwaggerHub

1. Go to https://app.swaggerhub.com/settings/integrations
2. Click "GitHub"
3. Authorize SwaggerHub to access your GitHub account
4. Grant permissions to `chronicle-org` organization

#### Step 2: Configure OpenAPI Export (Docker)

Add a GitHub Actions workflow to auto-generate and export OpenAPI spec:

Create `.github/workflows/generate-openapi.yml`:

```yaml
name: Generate OpenAPI Spec

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'package.json'
      - 'nest-cli.json'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate OpenAPI spec
        run: npm run generate:openapi
      
      - name: Upload to SwaggerHub
        env:
          SWAGGERHUB_API_KEY: ${{ secrets.SWAGGERHUB_API_KEY }}
        run: |
          npm install -g swaggerhub-cli
          swaggerhub api:create chronicle-org/Chronicle-API/1.0.0 -f openapi.json --setdefault
        if: success()
```

#### Step 3: Add SwaggerHub API Key to GitHub Secrets

1. Go to SwaggerHub Settings: https://app.swaggerhub.com/settings/api-key
2. Copy your API key
3. Add to GitHub repo secrets:
   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `SWAGGERHUB_API_KEY`
   - Value: Paste your SwaggerHub API key

#### Step 4: Push and Verify

```bash
git add .github/workflows/generate-openapi.yml
git commit -m "ci: add swaggerhub auto-sync"
git push origin main
```

Your API docs will now automatically sync to SwaggerHub on every commit!

## Manual Generation Commands

### ⭐ Easiest: Download from Running App

When your dev server is running, download the complete spec:

```bash
npm run start:dev
# In another terminal:
npm run download:openapi
```

This creates `openapi.json` with all your endpoints fully documented.

### Alternative: Generate Template

Generate a template spec (without endpoint details):
```bash
npm run generate:openapi
```
Outputs: `openapi.json` (basic structure only)

### Manual Download with curl

If you prefer to download manually:
```bash
# Linux/Mac
curl http://localhost:3001/api/docs-json > openapi.json

# Windows PowerShell
Invoke-WebRequest -Uri "http://localhost:3001/api/docs-json" -OutFile "openapi.json"

# Windows batch
powershell -Command "Invoke-WebRequest -Uri 'http://localhost:3001/api/docs-json' -OutFile 'openapi.json'"
```

## SwaggerHub URLs

Once uploaded, your API exists at:
- **SwaggerHub API Page**: https://app.swaggerhub.com/apis/chronicle-org/Chronicle-API
- **Public Documentation**: https://app.swaggerhub.com/apis-docs/chronicle-org/Chronicle-API
- **JSON Spec**: https://api.swaggerhub.com/apis/chronicle-org/Chronicle-API/1.0.0

## Version Management

When you release a new version:

1. Update `setVersion()` in `main.ts`:
   ```typescript
   .setVersion("1.1.0")
   ```

2. Generate new spec:
   ```bash
   npm run generate:openapi
   ```

3. Upload or let GitHub Actions sync it:
   ```bash
   swaggerhub api:create chronicle-org/Chronicle-API/1.1.0 \
     -f openapi.json --setdefault
   ```

## Benefits of SwaggerHub

✅ **Centralized Documentation**: Single source of truth for your API
✅ **Versioning**: Track multiple API versions
✅ **Mocking**: Auto-generated mock servers for testing
✅ **Public Sharing**: Share API docs with external partners
✅ **Team Collaboration**: Comments and version control
✅ **Change Tracking**: See who changed what and when
✅ **Analytics**: Track API documentation views and usage

## Current Setup Summary

Your Chronicle API has:
- ✅ Built-in Swagger UI at `/api/docs` (auto-hosted)
- ✅ OpenAPI JSON export at `/api/docs-json` (served by your app)
- ✅ `openapi.json` file generation (dev environment)
- ⭐ Ready for SwaggerHub integration (follow steps above)

## Troubleshooting

### openapi.json not generated?
- Make sure you're in development mode (`NODE_ENV !== "production"`)
- Run `npm run start:dev` to generate it automatically
- Or use `npm run generate:openapi` manually

### SwaggerHub upload fails?
- Check your API key is correct: https://app.swaggerhub.com/settings/api-key
- Ensure the org/API/version format matches your SwaggerHub setup
- Try uploading through the UI first as a test

### GitHub Actions workflow not triggering?
- Check that you pushed to `main` branch
- Verify `.github/workflows/generate-openapi.yml` is in your repo
- Check the Actions tab to see job logs

## Next Steps

1. **Choose your method:**
   - Manual (simple, but requires manual updates)
   - GitHub Actions (automatic, recommended)

2. **Set up SwaggerHub account** (if you haven't)

3. **Upload your first spec:**
   ```bash
   npm run generate:openapi
   # Then upload through SwaggerHub UI
   ```

4. **Enable GitHub integration** (optional for auto-sync)

Your Chronicle API documentation is now enterprise-grade! 🚀
