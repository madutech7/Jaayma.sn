import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/client';

@Controller('orders')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() body: unknown) {
    return this.ordersService.create(body);
  }

  @Get('shops/:shopId')
  findByShop(@Param('shopId') shopId: string) {
    return this.ordersService.findByShop(shopId);
  }

  @Get('reference/:reference')
  findByReference(@Param('reference') reference: string) {
    return this.ordersService.findByReference(reference);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status?: OrderStatus; paymentStatus?: string },
  ) {
    return this.ordersService.updateStatus(id, body.status, body.paymentStatus);
  }
}
