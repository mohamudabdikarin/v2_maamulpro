import * as dotenv from 'dotenv';
import * as path from 'path';

// Load the backend environment without mutating source files at runtime.
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('NestBootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend connection
  const configuredOrigins = new Set((process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean));
  const tenantBaseDomain = (process.env.TENANT_BASE_DOMAIN || 'maamulpro.site')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tenantOrigin = new RegExp(`^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.${tenantBaseDomain}$`, 'i');
  const developmentOrigins = process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];
  app.enableCors({
    origin: (origin, callback) => callback(null, !origin || configuredOrigins.has(origin) || developmentOrigins.includes(origin) || tenantOrigin.test(origin)),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global exception filter and response transformer
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`MaamulPro NestJS Backend server listening on port ${port}`);
}

bootstrap();
