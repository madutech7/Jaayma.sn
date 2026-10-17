import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: this.notifications.getVapidPublicKey() };
  }

  @Post('push-subscriptions')
  saveSubscription(@Headers('authorization') authHeader: string | undefined, @Body() body: unknown) {
    return this.notifications.saveSubscription(getUserId(authHeader), body);
  }

  @Delete('push-subscriptions')
  removeSubscription(@Headers('authorization') authHeader: string | undefined, @Body() body: unknown) {
    return this.notifications.removeSubscription(getUserId(authHeader), body);
  }

  @Post('test')
  sendTest(@Headers('authorization') authHeader: string | undefined, @Body() body: unknown) {
    return this.notifications.sendTestNotification(getUserId(authHeader), body);
  }
}

function getUserId(authHeader?: string): string {
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  // Match the existing seller session format: usr_<userId>_<created-at>.
  const match = token?.match(/^usr_([^_]+)_\d+$/);
  if (!match) {
    throw new UnauthorizedException('Non autorisé');
  }
  return match[1];
}
