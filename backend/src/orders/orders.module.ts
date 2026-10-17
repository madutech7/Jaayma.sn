import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [OrdersController],
  imports: [NotificationsModule],
  providers: [OrdersService],
})
export class OrdersModule {}
