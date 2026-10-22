import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function getPrismaClientOptions() {
  const rawConnectionLimit = process.env.PRISMA_CONNECTION_LIMIT?.trim();
  const databaseUrl = process.env.DATABASE_URL;

  if (!rawConnectionLimit || !databaseUrl) return undefined;

  const connectionLimit = Number(rawConnectionLimit);
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 100) {
    throw new Error('PRISMA_CONNECTION_LIMIT must be an integer between 1 and 100.');
  }

  const url = new URL(databaseUrl);
  url.searchParams.set('connection_limit', String(connectionLimit));

  return { datasources: { db: { url: url.toString() } } };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super(getPrismaClientOptions());
  }

  async onModuleInit() {
    // Try to connect but don't crash the app if the DB is sleeping (Neon cold start).
    // Prisma will reconnect lazily on the first actual query.
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (err) {
      this.logger.warn(
        `Database not immediately reachable at startup (Neon cold start?): ${(err as Error).message}. Will retry on first query.`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
