import { Body, Controller, Get, Headers, Inject, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { SubscriptionsService } from './subscriptions.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    @Inject(SubscriptionsService) private readonly subscriptions: SubscriptionsService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Get('price')
  getPrice() {
    return this.subscriptions.getPrice();
  }

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
  handleUnitechPayWebhook(
    @Body() body: unknown,
    @Headers('x-unitechpay-signature') signature: string | undefined,
    @Req() request: RawBodyRequest,
  ) {
    return this.subscriptions.handleWebhook(body, signature, request.rawBody);
  }
}
