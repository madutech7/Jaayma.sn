import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma, ShopStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const PAGE_SIZE = 12;
const ORDER_PAGE_SIZE = 15;

@Injectable()
export class AdminService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async getAccounts(filters: { q?: string; hasShop?: boolean; page: number }) {
    const query = filters.q?.trim().slice(0, 100);
    const where: Prisma.UserWhereInput = {
      ...(filters.hasShop === undefined ? {} : { shops: filters.hasShop ? { some: {} } : { none: {} } }),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query } },
            ],
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          phone: true,
          createdAt: true,
          _count: { select: { shops: true } },
          shops: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
              status: true,
              _count: { select: { orders: true } },
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((user) => ({
        id: user.id,
        name: user.name,
        phone: user.phone,
        createdAt: user.createdAt,
        shopCount: user._count.shops,
        orderCount: user.shops.reduce((sum, shop) => sum + shop._count.orders, 0),
        shops: user.shops.map(({ _count, ...shop }) => shop),
      })),
      total,
      page: filters.page,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }

  async getSettings() {
    const adminPhones = (this.config.get<string>('ADMIN_PHONES') ?? process.env.ADMIN_PHONES ?? '')
      .split(',')
      .map((phone) => phone.trim())
      .filter(Boolean);
    const [pushSubscriptions, pushSettings] = await Promise.all([
      this.prisma.pushSubscription.count(),
      Promise.resolve(this.notifications.getAdminPushSettings()),
    ]);
    return {
      admins: adminPhones,
      pushSubscriptions,
      push: pushSettings,
      databaseConnected: true,
    };
  }

  async getBroadcastHistory(page: number) {
    const pageSize = 15;
    const [total, items] = await Promise.all([
      this.prisma.adminBroadcast.count(),
      this.prisma.adminBroadcast.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async sendAnnouncement(input: unknown, sentByPhone: string) {
    const sent = await this.notifications.sendBroadcast(input);
    const record = await this.prisma.adminBroadcast.create({
      data: { ...sent, sentByPhone },
    });
    return { ...record, success: true };
  }

  async getOverview(filters: {
    q?: string;
    status?: ShopStatus;
    plan?: 'free' | 'pro' | 'expired';
    page: number;
  }) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const query = filters.q?.trim().slice(0, 100);
    const shopFilters: Prisma.ShopWhereInput[] = [];
    if (filters.status) shopFilters.push({ status: filters.status });
    if (filters.plan === 'expired') {
      shopFilters.push({ plan: 'pro', planExpiresAt: { lt: new Date() } });
    } else if (filters.plan === 'pro') {
      shopFilters.push({
        plan: 'pro',
        OR: [{ planExpiresAt: null }, { planExpiresAt: { gte: new Date() } }],
      });
    } else if (filters.plan === 'free') {
      shopFilters.push({
        OR: [
          { plan: 'free' },
          { plan: 'pro', planExpiresAt: { lt: new Date() } },
        ],
      });
    }
    if (query) {
      shopFilters.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
          { owner: { is: { phone: { contains: query, mode: 'insensitive' } } } },
          { owner: { is: { name: { contains: query, mode: 'insensitive' } } } },
        ],
      });
    }
    const where: Prisma.ShopWhereInput = shopFilters.length ? { AND: shopFilters } : {};

    const [
      totalShops,
      activeShops,
      draftShops,
      suspendedShops,
      proShops,
      expiredProShops,
      sellers,
      products,
      totalOrders,
      newOrders,
      paidOrders,
      revenue,
      todayOrders,
      revenueToday,
      shopsTotal,
      shops,
      recentOrders,
    ] = await Promise.all([
      this.prisma.shop.count(),
      this.prisma.shop.count({ where: { status: 'ACTIVE' } }),
      this.prisma.shop.count({ where: { status: 'DRAFT' } }),
      this.prisma.shop.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.shop.count({
        where: { plan: 'pro', OR: [{ planExpiresAt: null }, { planExpiresAt: { gte: new Date() } }] },
      }),
      this.prisma.shop.count({ where: { plan: 'pro', planExpiresAt: { lt: new Date() } } }),
      this.prisma.user.count(),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'NEW' } }),
      this.prisma.order.count({ where: { paymentStatus: 'paid' } }),
      this.prisma.order.aggregate({
        where: { paymentStatus: 'paid' },
        _sum: { total: true },
      }),
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.aggregate({
        where: { paymentStatus: 'paid', createdAt: { gte: today } },
        _sum: { total: true },
      }),
      this.prisma.shop.count({ where }),
      this.prisma.shop.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (filters.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          planExpiresAt: true,
          status: true,
          createdAt: true,
          whatsapp: true,
          owner: { select: { name: true, phone: true } },
          _count: { select: { products: true, orders: true } },
        },
      }),
      this.prisma.order.findMany({
        where: { status: 'NEW' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          reference: true,
          customerName: true,
          total: true,
          createdAt: true,
          shop: { select: { name: true, slug: true } },
        },
      }),
    ]);

    return {
      metrics: {
        totalShops,
        activeShops,
        draftShops,
        suspendedShops,
        proShops,
        expiredProShops,
        sellers,
        activeProducts: products,
        totalOrders,
        newOrders,
        paidOrders,
        revenue: revenue._sum.total ?? 0,
        todayOrders,
        revenueToday: revenueToday._sum.total ?? 0,
      },
      shops: {
        items: shops,
        total: shopsTotal,
        page: filters.page,
        pageSize: PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(shopsTotal / PAGE_SIZE)),
      },
      recentOrders,
    };
  }

  async getOrders(filters: {
    q?: string;
    status?: OrderStatus;
    payment?: 'paid' | 'pending';
    page: number;
  }) {
    const query = filters.q?.trim().slice(0, 100);
    const where: Prisma.OrderWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.payment ? { paymentStatus: filters.payment } : {}),
      ...(query
        ? {
            OR: [
              { reference: { contains: query, mode: 'insensitive' } },
              { customerName: { contains: query, mode: 'insensitive' } },
              { customerPhone: { contains: query } },
              { shop: { name: { contains: query, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * ORDER_PAGE_SIZE,
        take: ORDER_PAGE_SIZE,
        select: {
          id: true,
          reference: true,
          customerName: true,
          customerPhone: true,
          total: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          createdAt: true,
          shop: { select: { name: true, slug: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    return {
      items,
      total,
      page: filters.page,
      pageSize: ORDER_PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(total / ORDER_PAGE_SIZE)),
    };
  }

  async updateShopPlan(id: string, plan: 'free' | 'pro', durationDays: number) {
    await this.ensureShopExists(id);
    const planExpiresAt = plan === 'pro' ? new Date(Date.now() + durationDays * 86_400_000) : null;
    return this.prisma.shop.update({
      where: { id },
      data: { plan, planExpiresAt },
      select: { id: true, plan: true, planExpiresAt: true },
    });
  }

  async updateShopStatus(id: string, status: ShopStatus) {
    await this.ensureShopExists(id);
    return this.prisma.shop.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });
  }

  private async ensureShopExists(id: string) {
    const exists = await this.prisma.shop.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Boutique introuvable.');
  }
}
