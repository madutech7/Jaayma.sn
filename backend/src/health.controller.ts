import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      ok: true,
      service: 'jaayma-api',
      time: new Date().toISOString(),
    };
  }
}
