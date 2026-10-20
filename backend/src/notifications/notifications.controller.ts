import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  Inject,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Get('vapid-public-key')
  @Header('Cache-Control', 'public, max-age=3600, s-maxage=86400')
  getVapidPublicKey() {
    return { publicKey: this.notifications.getVapidPublicKey() };
  }

  @Post('push-subscriptions')
  saveSubscription(@Headers('authorization') authHeader: string | undefined, @Body() body: unknown) {
    return this.notifications.saveSubscription(this.getUserId(authHeader), body);
  }

  @Delete('push-subscriptions')
  removeSubscription(@Headers('authorization') authHeader: string | undefined, @Body() body: unknown) {
    return this.notifications.removeSubscription(this.getUserId(authHeader), body);
  }

  @Post('test')
  sendTest(@Headers('authorization') authHeader: string | undefined, @Body() body: unknown) {
    return this.notifications.sendTestNotification(this.getUserId(authHeader), body);
  }

  private getUserId(authHeader?: string): string {
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const userId = token ? this.auth.verifySessionToken(token) : null;
    if (!userId) {
      throw new UnauthorizedException('Session expirée. Reconnectez-vous.');
    }
    return userId;
  }
}
