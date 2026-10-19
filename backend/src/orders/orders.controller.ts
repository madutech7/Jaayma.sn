import { Body, Controller, Get, Headers, Inject, Param, Patch, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const updateOrderSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.enum(['pending', 'paid']).optional(),
}).refine((body) => body.status !== undefined || body.paymentStatus !== undefined);

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject(OrdersService) private readonly ordersService: OrdersService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Post()
  create(@Body() body: unknown) {
    return this.ordersService.create(body);
  }

  @Get('shops/:shopId')
  findByShop(@Param('shopId') shopId: string, @Headers('authorization') authHeader?: string) {
    const userId = this.auth.requireSessionUserId(authHeader);
    return this.ordersService.findByShop(shopId, userId);
  }

  @Get('reference/:reference')
  findByReference(@Param('reference') reference: string) {
    return this.ordersService.findByReference(reference);
  }

  @Get(':id')
  findById(@Param('id') id: string, @Headers('authorization') authHeader?: string) {
    const userId = this.auth.requireSessionUserId(authHeader);
    return this.ordersService.findById(id, userId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authHeader?: string,
  ) {
    const userId = this.auth.requireSessionUserId(authHeader);
    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.ordersService.updateStatus(id, parsed.data.status, parsed.data.paymentStatus, userId);
  }
}
