import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

const orderSchema = z.object({
  shopId: z.string().min(1),
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  deliveryAddress: z.string().min(3),
  note: z.string().optional(),
  paymentMethod: z.string().optional().default('cash'),
  paymentStatus: z.string().optional().default('pending'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
        options: z.string().optional().nullable(),
      }),
    )
    .min(1),
});

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async findByShop(shopId: string) {
    return this.prisma.order.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              include: { images: { take: 1, orderBy: { position: 'asc' } } },
            },
          },
        },
      },
    });
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: { images: { take: 1, orderBy: { position: 'asc' } } },
            },
          },
        },
        shop: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    return order;
  }

  async findByReference(reference: string) {
    const order = await this.prisma.order.findUnique({
      where: { reference },
      include: {
        items: {
          include: {
            product: {
              include: { images: { take: 1, orderBy: { position: 'asc' } } },
            },
          },
        },
        shop: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    return order;
  }

  async updateStatus(id: string, status?: OrderStatus, paymentStatus?: string) {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Commande introuvable');
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
      },
      include: { items: true },
    });
  }

  async create(input: unknown) {
    const parsed = orderSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const totalQuantityByProductId = new Map<string, number>();

    for (const item of parsed.data.items) {
      totalQuantityByProductId.set(
        item.productId,
        (totalQuantityByProductId.get(item.productId) ?? 0) + item.quantity,
      );
    }

    const productIds = Array.from(totalQuantityByProductId.keys());

    const order = await this.prisma.$transaction(async (transaction) => {
      const shop = await transaction.shop.findFirst({
        where: { id: parsed.data.shopId, status: 'ACTIVE' },
        select: { deliveryFee: true, ownerId: true },
      });

      if (!shop) {
        throw new BadRequestException('Boutique introuvable');
      }

      const products = await transaction.product.findMany({
        where: {
          id: { in: productIds },
          shopId: parsed.data.shopId,
          status: 'ACTIVE',
        },
        select: { id: true, price: true, stock: true },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Produit indisponible dans cette boutique');
      }

      const productsById = new Map(products.map((product) => [product.id, product]));

      for (const [productId, totalQty] of totalQuantityByProductId) {
        const product = productsById.get(productId);

        if (!product || product.stock < totalQty) {
          throw new BadRequestException('Stock insuffisant pour un des produits');
        }

        const result = await transaction.product.updateMany({
          where: {
            id: productId,
            shopId: parsed.data.shopId,
            status: 'ACTIVE',
            stock: { gte: totalQty },
          },
          data: { stock: { decrement: totalQty } },
        });

        if (result.count !== 1) {
          throw new BadRequestException('Stock insuffisant pour un des produits');
        }
      }

      const priceByProductId = new Map(products.map((product) => [product.id, product.price]));
      const subtotal = parsed.data.items.reduce(
        (sum, item) => sum + item.quantity * (priceByProductId.get(item.productId) ?? 0),
        0,
      );
      const deliveryFee = shop.deliveryFee;

      const createdOrder = await transaction.order.create({
        data: {
          reference: createOrderReference(),
          shopId: parsed.data.shopId,
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone,
          deliveryAddress: parsed.data.deliveryAddress,
          note: parsed.data.note,
          paymentMethod: parsed.data.paymentMethod,
          paymentStatus: parsed.data.paymentStatus,
          subtotal,
          deliveryFee,
          total: subtotal + deliveryFee,
          items: {
            create: parsed.data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: priceByProductId.get(item.productId) ?? 0,
              options: item.options || null,
            })),
          },
        },
        include: { items: true },
      });

      return {
        order: createdOrder,
        ownerId: shop.ownerId,
      };
    });

    // Notification delivery must never prevent a customer order from succeeding.
    void this.notifications.notifyNewOrder(order.order, order.ownerId);

    return order.order;
  }
}

function createOrderReference() {
  return `JY-${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
}
