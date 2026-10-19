import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

const shopSchema = z.object({
  ownerId: z.string().optional().nullable(),
  name: z.string().min(2),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lien boutique invalide'),
  headline: z.string().optional().default(''),
  area: z.string().optional().default(''),
  description: z.string().optional().default(''),
  category: z.string().optional().nullable(),
  themeColor: z.enum(['#C8265A', '#0E7C66', '#FFC83D', '#3B4A7A', '#B4531E']).optional().default('#C8265A'),
  whatsapp: z.string().optional().nullable(),
  waveNumber: z.string().optional().nullable(),
  orangeMoneyNumber: z.string().optional().nullable(),
  acceptsCash: z.boolean().optional().default(true),
  deliveryFee: z.number().int().nonnegative().default(0),
  deliveryNote: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
  facebookPixelId: z.string().optional().nullable(),
  tiktokPixelId: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'SUSPENDED']).optional().default('ACTIVE'),
});

// Publication status and ownership are managed through protected admin flows.
const updateShopSchema = shopSchema.partial().omit({ slug: true, ownerId: true, status: true });

@Injectable()
export class ShopsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UploadsService) private readonly uploads: UploadsService,
  ) {}

  async findAll(query?: { q?: string; category?: string }) {
    const whereClause: Record<string, unknown> = {
      status: 'ACTIVE',
    };

    if (query?.category && query.category !== 'Tous') {
      whereClause.category = query.category;
    }

    if (query?.q) {
      whereClause.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { headline: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { area: { contains: query.q, mode: 'insensitive' } },
        { products: { some: { name: { contains: query.q, mode: 'insensitive' } } } },
      ];
    }

    return this.prisma.shop.findMany({
      where: whereClause,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      include: {
        products: {
          where: { status: 'ACTIVE' },
          take: 6,
          include: { images: { orderBy: { position: 'asc' }, take: 1 } },
        },
      },
    });
  }

  async findForExplore(options: { q?: string; category?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Math.floor(options.page || 1));
    const limit = Math.min(24, Math.max(1, Math.floor(options.limit || 12)));
    const query = options.q?.trim().slice(0, 100);
    const whereClause: Record<string, unknown> = { status: 'ACTIVE' };

    if (options.category && options.category !== 'Tous') {
      whereClause.category = options.category;
    }

    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { headline: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { area: { contains: query, mode: 'insensitive' } },
        { products: { some: { status: 'ACTIVE', name: { contains: query, mode: 'insensitive' } } } },
      ];
    }

    const items = await this.prisma.shop.findMany({
      where: whereClause,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit + 1,
      include: {
        products: {
          where: { status: 'ACTIVE' },
          take: 4,
          include: { images: { orderBy: { position: 'asc' }, take: 1 } },
        },
      },
    });

    const hasNextPage = items.length > limit;
    if (hasNextPage) items.pop();
    return { items, hasNextPage };
  }

  async create(input: unknown, ownerId: string) {
    const parsed = shopSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const existingShopForOwner = await this.prisma.shop.findFirst({
      where: { ownerId },
      select: { id: true },
    });
    if (existingShopForOwner) {
      throw new BadRequestException('Un compte vendeur ne peut créer qu’une seule boutique.');
    }

    const existingSlug = await this.prisma.shop.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (existingSlug) {
      throw new BadRequestException('Ce lien de boutique est déjà utilisé');
    }

    return this.prisma.shop.create({
      data: {
        ...parsed.data,
        ownerId,
      },
      include: {
        products: {
          where: { status: 'ACTIVE' },
          include: { images: true },
        },
      },
    });
  }

  async update(id: string, input: unknown, ownerId: string) {
    const parsed = updateShopSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) {
      throw new NotFoundException('Boutique introuvable');
    }
    if (shop.ownerId !== ownerId) {
      throw new ForbiddenException('Vous ne pouvez modifier que votre boutique.');
    }

    const updated = await this.prisma.shop.update({
      where: { id },
      data: parsed.data,
      include: {
        products: {
          where: { status: 'ACTIVE' },
          include: { images: true },
        },
      },
    });

    // Supprimer les anciennes images du storage si elles ont été remplacées
    const urlsToDelete: string[] = [];
    if (parsed.data.logoUrl !== undefined && parsed.data.logoUrl !== shop.logoUrl && shop.logoUrl) {
      urlsToDelete.push(shop.logoUrl);
    }
    if (parsed.data.coverUrl !== undefined && parsed.data.coverUrl !== shop.coverUrl && shop.coverUrl) {
      urlsToDelete.push(shop.coverUrl);
    }
    if (urlsToDelete.length > 0) {
      setImmediate(() => this.uploads.deleteByUrls(urlsToDelete));
    }

    return updated;
  }

  async findBySlug(slug: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: {
        products: {
          where: { status: 'ACTIVE' },
          orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
          include: {
            images: { orderBy: { position: 'asc' }, take: 1 },
            _count: { select: { images: true } },
          },
        },
      },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable');
    }

    return shop;
  }

  async findById(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
          include: { images: { orderBy: { position: 'asc' } } },
        },
      },
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable');
    }

    return shop;
  }

  async findByOwnerId(ownerId: string, requestedOwnerId: string) {
    if (ownerId !== requestedOwnerId) {
      throw new ForbiddenException('Accès réservé au propriétaire de la boutique.');
    }
    return this.prisma.shop.findFirst({
      where: { ownerId },
      include: {
        products: {
          orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
          include: { images: { orderBy: { position: 'asc' } } },
        },
      },
    });
  }
}
