import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ResponseInterceptor } from "./interceptors/response.interceptor";
import cookieParser from "cookie-parser";
import * as fs from "fs";
import * as path from "path";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const corsOriginsString = process.env.CORS_ORIGIN;
  const allowedOrigins = corsOriginsString ? corsOriginsString.split(",") : [];

  app.enableCors({
    origin: allowedOrigins,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger Setup
  const config = new DocumentBuilder()
    .setTitle("Chronicle API")
    .setDescription("Chronicle - Social Platform Backend API")
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
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
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
    },
  });

  // Export OpenAPI spec to file (useful for SwaggerHub)
  if (process.env.NODE_ENV !== "production") {
    const specPath = path.join(process.cwd(), "openapi.json");
    fs.writeFileSync(specPath, JSON.stringify(document, null, 2));
    console.log(`📄 OpenAPI spec exported to: ${specPath}`);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port, "0.0.0.0");
  console.log(`Application is running on http://localhost:${port}`);
  console.log(`Swagger UI available at http://localhost:${port}/api/docs`);
}

void bootstrap();
