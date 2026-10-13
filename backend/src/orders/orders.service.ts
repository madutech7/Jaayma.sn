import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

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
      }),
    )
    .min(1),
});

@Injectable()
export class OrdersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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

    const quantitiesByProductId = new Map<string, number>();

    for (const item of parsed.data.items) {
      quantitiesByProductId.set(
        item.productId,
        (quantitiesByProductId.get(item.productId) ?? 0) + item.quantity,
      );
    }

    const items = Array.from(quantitiesByProductId, ([productId, quantity]) => ({
      productId,
      quantity,
    }));

    return this.prisma.$transaction(async (transaction) => {
      const shop = await transaction.shop.findFirst({
        where: { id: parsed.data.shopId, status: 'ACTIVE' },
        select: { deliveryFee: true },
      });

      if (!shop) {
        throw new BadRequestException('Boutique introuvable');
      }

      const productIds = items.map((item) => item.productId);
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

      for (const item of items) {
        const product = productsById.get(item.productId);

        if (!product || product.stock < item.quantity) {
          throw new BadRequestException('Stock insuffisant pour un des produits');
        }

        const result = await transaction.product.updateMany({
          where: {
            id: item.productId,
            shopId: parsed.data.shopId,
            status: 'ACTIVE',
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });

        if (result.count !== 1) {
          throw new BadRequestException('Stock insuffisant pour un des produits');
        }
      }

      const priceByProductId = new Map(products.map((product) => [product.id, product.price]));
      const subtotal = items.reduce(
        (sum, item) => sum + item.quantity * (priceByProductId.get(item.productId) ?? 0),
        0,
      );
      const deliveryFee = shop.deliveryFee;

      return transaction.order.create({
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
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: priceByProductId.get(item.productId) ?? 0,
            })),
          },
        },
        include: { items: true },
      });
    });
  }
}

function createOrderReference() {
  return `JY-${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
}
