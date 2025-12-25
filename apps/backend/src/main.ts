import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security: Fail fast if JWT_SECRET not set in production
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production environment');
  }

  // Security: Helmet for HTTP headers protection
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", 'wss:', 'ws:'],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow WebSocket connections
    }),
  );

  // Enable cookie parsing for JWT auth
  app.use(cookieParser());

  // CORS - allow frontend URL from env
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3006';
  app.enableCors({
    origin: [frontendUrl],
    credentials: true,
  });

  // Global validation pipe with security settings
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true, // Reject unknown properties
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter to hide internal errors
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
