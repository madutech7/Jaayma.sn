import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('health')
  health() {
    return {
      ok: true,
      service: 'jaayma-api',
      time: new Date().toISOString(),
    };
  }

  @Get('health/db')
  async healthDb() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        ok: true,
        db: 'alive',
        service: 'jaayma-api',
        time: new Date().toISOString(),
      };
    } catch (error) {
      return {
        ok: false,
        db: 'error',
        message: (error as Error).message,
        time: new Date().toISOString(),
      };
    }
  }
}
