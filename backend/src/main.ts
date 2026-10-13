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

  app.enableCors({
    origin: allowedOrigins?.length ? allowedOrigins : process.env.NODE_ENV === 'production' ? false : true,
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
