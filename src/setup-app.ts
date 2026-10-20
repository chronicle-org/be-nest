import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { ResponseInterceptor } from "./interceptors/response.interceptor";

/**
 * Middleware, validation and response shape shared by main.ts and the e2e
 * tests, so tests exercise the same request pipeline as production.
 */
export function configureApp(app: INestApplication): void {
  // Standard security headers (nosniff, frame blocking, HSTS, CSP, ...).
  app.use(helmet());
  app.use(cookieParser());

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

  app.useGlobalInterceptors(new ResponseInterceptor());
}
