import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

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
