@echo off
REM Download complete OpenAPI spec from running app (Windows version)

setlocal enabledelayedexpansion

set APP_URL=%1
if "%APP_URL%"=="" set APP_URL=http://localhost:3001

echo Downloading OpenAPI spec from !APP_URL!...

powershell -NoProfile -Command "Invoke-WebRequest -Uri '!APP_URL!/api/docs-json' -OutFile 'openapi.json'"

if exist openapi.json (
  for /f %%A in ('powershell -NoProfile -Command "(Get-Item openapi.json).Length"') do set SIZE=%%A
  echo ✅ OpenAPI spec downloaded successfully!
  echo 📄 File: openapi.json
  echo 📋 Size: !SIZE! bytes
  echo.
  echo 📤 Ready to upload to SwaggerHub: https://app.swaggerhub.com
) else (
  echo ❌ Failed to download spec. Make sure the app is running at !APP_URL!
  exit /b 1
)
