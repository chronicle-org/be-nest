#!/usr/bin/env node

const https = require("https");
const fs = require("fs");
const path = require("path");

const appUrl = process.argv[2] || "http://localhost:3001";
const specUrl = `${appUrl}/api/docs-json`;

console.log(`📥 Downloading OpenAPI spec from ${specUrl}...`);

// Parse URL
const url = new URL(specUrl);
const protocol = url.protocol === "https:" ? https : require("http");

protocol
  .get(specUrl, (res) => {
    let data = "";

    if (res.statusCode !== 200) {
      console.error(
        `❌ Failed: HTTP ${res.statusCode}. Make sure the app is running at ${appUrl}`,
      );
      process.exit(1);
    }

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      try {
        const spec = JSON.parse(data);
        const outputPath = path.join(process.cwd(), "openapi.json");
        fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2));

        const size = fs.statSync(outputPath).size;
        console.log(`✅ OpenAPI spec downloaded successfully!`);
        console.log(`📄 File: ${outputPath}`);
        console.log(`📋 Size: ${size} bytes`);
        console.log(``);
        console.log(
          `📤 Ready to upload to SwaggerHub: https://app.swaggerhub.com`,
        );
      } catch (err) {
        console.error("❌ Failed to parse response:", err.message);
        process.exit(1);
      }
    });
  })
  .on("error", (err) => {
    console.error(
      `❌ Connection failed: ${err.message}. Make sure the app is running at ${appUrl}`,
    );
    process.exit(1);
  });
