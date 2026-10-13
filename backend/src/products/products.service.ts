import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

const productImageSchema = z.object({
  url: z.string().min(1),
  alt: z.string().optional().default(''),
});

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().default(''),
  price: z.number().int().positive(),
  stock: z.number().int().nonnegative().optional().default(0),
  position: z.number().int().optional().default(0),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional().default('ACTIVE'),
  images: z.array(productImageSchema).max(8).optional().default([]),
});

const updateProductSchema = productSchema.partial();

@Injectable()
export class ProductsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findByShop(shopId: string) {
    return this.prisma.product.findMany({
      where: { shopId },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      include: { images: { orderBy: { position: 'asc' } } },
    });
  }

  async findForExplore(options: {
    q?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number.isFinite(options.page) ? Math.max(1, Math.floor(options.page!)) : 1;
    const limit = Number.isFinite(options.limit)
      ? Math.min(40, Math.max(1, Math.floor(options.limit!)))
      : 20;
    const query = options.q?.trim().slice(0, 100);

    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      shop: {
        is: {
          status: 'ACTIVE',
          ...(options.category ? { category: options.category } : {}),
        },
      },
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { shop: { is: { name: { contains: query, mode: 'insensitive' } } } },
              { shop: { is: { headline: { contains: query, mode: 'insensitive' } } } },
              { shop: { is: { description: { contains: query, mode: 'insensitive' } } } },
              { shop: { is: { area: { contains: query, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const results = await this.prisma.product.findMany({
      where,
      orderBy: [
        { shop: { featured: 'desc' } },
        { shop: { createdAt: 'desc' } },
        { position: 'asc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit + 1,
      select: {
        id: true,
        shopId: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        position: true,
        status: true,
        images: {
          orderBy: { position: 'asc' },
          take: 1,
          select: { id: true, productId: true, url: true, alt: true, position: true },
        },
        shop: {
          select: { id: true, slug: true, name: true, logoUrl: true, deliveryFee: true, category: true },
        },
      },
    });

    return {
      items: results.slice(0, limit),
      hasNextPage: results.length > limit,
    };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { position: 'asc' } } },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return product;
  }

  async create(shopId: string, input: unknown) {
    const parsed = productSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true },
    });

    if (!shop) {
      throw new BadRequestException('Boutique introuvable');
    }

    return this.prisma.product.create({
      data: {
        shopId,
        name: parsed.data.name,
        description: parsed.data.description,
        price: parsed.data.price,
        stock: parsed.data.stock,
        position: parsed.data.position,
        status: parsed.data.status,
        images: {
          create: parsed.data.images.map((image, index) => ({
            url: image.url,
            alt: image.alt ?? '',
            position: index,
          })),
        },
      },
      include: { images: { orderBy: { position: 'asc' } } },
    });
  }

  async update(id: string, input: unknown) {
    const parsed = updateProductSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Produit introuvable');
    }

    const { images, ...data } = parsed.data;

    return this.prisma.$transaction(async (tx) => {
      if (images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (images.length > 0) {
          await tx.productImage.createMany({
            data: images.map((img, idx) => ({
              productId: id,
              url: img.url,
              alt: img.alt ?? '',
              position: idx,
            })),
          });
        }
      }

      return tx.product.update({
        where: { id },
        data,
        include: { images: { orderBy: { position: 'asc' } } },
      });
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Produit introuvable');
    }

    await this.prisma.product.delete({ where: { id } });
    return { success: true };
  }
}
