import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [OrdersController],
  imports: [NotificationsModule, AuthModule],
  providers: [OrdersService],
})
export class OrdersModule {}
