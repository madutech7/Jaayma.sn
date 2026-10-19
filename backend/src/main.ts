import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { rateLimitMiddleware } from './security/rate-limit.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const configService = app.get(ConfigService);

  const corsOrigin = configService.get<string>('CORS_ORIGIN') ?? process.env.CORS_ORIGIN;
  const allowedOrigins = corsOrigin
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaultOrigins = [
    'https://jaayma.sn',
    'https://www.jaayma.sn',
    'https://jaayma-sn.madutech0.workers.dev',
  ];

  // Render sits behind one trusted reverse proxy; this lets Express rate-limit
  // by the originating client's forwarded address instead of the proxy itself.
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);
  expressApp.disable('x-powered-by');
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ extended: true, limit: '100kb' }));
  app.use(rateLimitMiddleware);

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins?.length && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (
        defaultOrigins.includes(origin) ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }

      callback(new Error(`Origine CORS non autorisée : ${origin}`));
    },
    credentials: true,
  });
  app.enableShutdownHooks();

  const port = Number(configService.get<string>('PORT') ?? process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`[Jaaymaa API] Server running on http://localhost:${port}`);
}

bootstrap().catch((error: unknown) => {
  console.error('Impossible de démarrer Jaaymaa API', error);
  process.exit(1);
});
