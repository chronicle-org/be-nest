import "tsconfig-paths/register";
import * as fs from "fs";
import * as path from "path";
import { DocumentBuilder } from "@nestjs/swagger";

/**
 * Standalone OpenAPI spec generator that doesn't require app initialization
 * Useful for CI/CD pipelines and offline spec generation
 */
function generateOpenAPI() {
  try {
    // Build the OpenAPI spec configuration
    const config = new DocumentBuilder()
      .setTitle("Chronicle API")
      .setDescription("Chronicle - Social Platform Backend API")
      .setVersion("1.0.0")
      .setContact(
        "Chronicle Support",
        "https://github.com/chronicle-org/be-nest",
        "",
      )
      .setLicense("UNLICENSED", "")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token",
        },
        "access-token",
      )
      .addCookieAuth(
        "chronicle_access_token",
        {
          type: "apiKey",
          in: "cookie",
          description: "JWT token in chronicle_access_token cookie",
        },
        "cookie-auth",
      )
      .addServer("http://localhost:3001", "Local Development")
      .addServer(
        "https://nestjs-app-272206208371.asia-southeast1.run.app",
        "Production",
      )
      .addTag("Auth", "Authentication endpoints")
      .addTag("Posts", "Post management endpoints")
      .addTag("Comments", "Comment management endpoints")
      .addTag("Users", "User management endpoints")
      .addTag("Notifications", "Notification endpoints")
      .addTag("Health", "Health check endpoints")
      .build();

    // Create base OpenAPI document structure
    const document: Record<string, any> = {
      openapi: "3.0.0",
      info: config.info,
      servers: config.servers,
      paths: {},
      components: {
        securitySchemes: config.components?.securitySchemes || {},
        schemas: {},
      },
      tags: config.tags,
      x_logo: {
        url: "https://nestjs.com/img/logo-small.ede75a6953f7c3a6.svg",
        altText: "NestJS Logo",
      },
    };

    // Save OpenAPI spec to file
    const outputPath = path.join(__dirname, "openapi.json");
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

    console.log(`✅ OpenAPI spec generated successfully!`);
    console.log(`📄 File location: ${outputPath}`);
    console.log(`📋 Size: ${fs.statSync(outputPath).size} bytes`);
    console.log(``);
    console.log(`Next steps:`);
    console.log(`1. Upload to SwaggerHub: https://app.swaggerhub.com`);
    console.log(`2. View local Swagger UI: http://localhost:3001/api/docs`);
    console.log(
      `3. Download OpenAPI JSON: http://localhost:3001/api/docs-json`,
    );

    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to generate OpenAPI spec:", err);
    process.exit(1);
  }
}

generateOpenAPI();
