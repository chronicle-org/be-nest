import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ResponseInterceptor } from "./interceptors/response.interceptor";
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  const corsOriginsString = process.env.CORS_ORIGIN;
  const allowedOrigins = corsOriginsString ? corsOriginsString.split(",") : [];

  app.enableCors({
    origin: allowedOrigins,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  app.useGlobalInterceptors(new ResponseInterceptor());
  const port = process.env.PORT || 8080;
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
