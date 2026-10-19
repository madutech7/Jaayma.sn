import { Body, Controller, Get, Headers, Inject, Param, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    @Inject(SubscriptionsService) private readonly subscriptions: SubscriptionsService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Post('payments')
  createPayment(@Body() body: unknown, @Headers('authorization') authHeader?: string) {
    const userId = this.auth.requireSessionUserId(authHeader);
    return this.subscriptions.createPayment(userId, body);
  }

  @Get('payments/:id')
  getPayment(@Param('id') id: string, @Headers('authorization') authHeader?: string) {
    const userId = this.auth.requireSessionUserId(authHeader);
    return this.subscriptions.getPayment(userId, id);
  }

  @Post('unitechpay/webhook')
  handleUnitechPayWebhook(@Body() body: unknown) {
    return this.subscriptions.handleWebhook(body);
  }
}
