import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const corsOrigin = configService.get<string>('CORS_ORIGIN') ?? process.env.CORS_ORIGIN;
  const allowedOrigins = corsOrigin
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaultOrigins = [
    'https://jaayma.sn',
    'https://www.jaayma.sn',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins?.length && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
        return callback(null, true);
      }

      if (
        origin.endsWith('.workers.dev') ||
        origin.endsWith('.pages.dev') ||
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
  console.log(`[Jaayma API] Server running on http://localhost:${port}`);
}

bootstrap().catch((error: unknown) => {
  console.error('Impossible de démarrer Jaayma API', error);
  process.exit(1);
});
