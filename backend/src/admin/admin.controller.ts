import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  Post,
  Patch,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShopStatus } from '@prisma/client';
import { z } from 'zod';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import { AdminService } from './admin.service';

const planSchema = z.object({
  plan: z.enum(['free', 'pro']),
  durationDays: z.number().int().min(1).max(3650).optional(),
});

const statusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'SUSPENDED']),
});

const explorerSettingSchema = z.object({
  enabled: z.boolean(),
});

const proPriceSchema = z.object({
  amount: z.number().int().min(1).max(100_000_000),
});

@Controller('admin')
export class AdminController {
  constructor(
    @Inject(AdminService) private readonly admin: AdminService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(AnalyticsService) private readonly analytics: AnalyticsService,
  ) {}

  @Get('public-features')
  publicFeatures() {
    return this.admin.getPublicFeatures();
  }

  @Get('access')
  async access(@Headers('authorization') authHeader?: string) {
    const user = await this.requireAdmin(authHeader);
    return { isAdmin: true, phone: user.phone, name: user.name };
  }

  @Get('overview')
  async overview(
    @Headers('authorization') authHeader: string | undefined,
  ) {
    await this.requireAdmin(authHeader);
    return this.admin.getOverview();
  }

  @Get('shops')
  async shops(
    @Headers('authorization') authHeader: string | undefined,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('page') page?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.admin.getShops({
      q,
      status: parseStatus(status),
      plan: parsePlan(plan),
      page: parsePage(page),
    });
  }

  @Get('subscriptions')
  async subscriptions(
    @Headers('authorization') authHeader: string | undefined,
    @Query('q') q?: string,
    @Query('plan') plan?: string,
    @Query('page') page?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.admin.getSubscriptions({ q, plan: parsePlan(plan), page: parsePage(page) });
  }

  @Get('orders')
  async orders(
    @Headers('authorization') authHeader: string | undefined,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('payment') payment?: string,
    @Query('page') page?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.admin.getOrders({
      q,
      status: parseOrderStatus(status),
      payment: parsePaymentStatus(payment),
      page: parsePage(page),
    });
  }

  @Get('accounts')
  async accounts(
    @Headers('authorization') authHeader: string | undefined,
    @Query('q') q?: string,
    @Query('hasShop') hasShop?: string,
    @Query('page') page?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.admin.getAccounts({ q, hasShop: parseHasShop(hasShop), page: parsePage(page) });
  }

  @Get('settings')
  async settings(@Headers('authorization') authHeader: string | undefined) {
    await this.requireAdmin(authHeader);
    return this.admin.getSettings();
  }

  @Get('analytics')
  async analyticsDashboard(
    @Headers('authorization') authHeader: string | undefined,
    @Query('days') days?: string,
  ) {
    await this.requireAdmin(authHeader);
    const requestedDays = Number(days);
    const rangeDays = [7, 28, 90, 365].includes(requestedDays) ? requestedDays : 28;
    return this.analytics.getDashboard(rangeDays);
  }

  @Get('analytics/realtime')
  async analyticsRealtime(@Headers('authorization') authHeader: string | undefined) {
    await this.requireAdmin(authHeader);
    return this.analytics.getRealtime();
  }

  @Patch('settings/explorer')
  async setExplorerVisibility(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: unknown,
  ) {
    await this.requireAdmin(authHeader);
    const parsed = explorerSettingSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.admin.setExplorerEnabled(parsed.data.enabled);
  }

  @Patch('settings/maintenance')
  async setMaintenanceMode(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: unknown,
  ) {
    await this.requireAdmin(authHeader);
    const parsed = explorerSettingSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.admin.setMaintenanceEnabled(parsed.data.enabled);
  }

  @Patch('settings/pro-price')
  async setProPrice(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: unknown,
  ) {
    await this.requireAdmin(authHeader);
    const parsed = proPriceSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.admin.setProPrice(parsed.data.amount);
  }

  @Get('notifications')
  async notificationHistory(
    @Headers('authorization') authHeader: string | undefined,
    @Query('page') page?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.admin.getBroadcastHistory(parsePage(page));
  }

  @Post('notifications')
  async sendNotification(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: unknown,
  ) {
    const user = await this.requireAdmin(authHeader);
    return this.admin.sendAnnouncement(body, user.phone);
  }

  @Patch('shops/:id/plan')
  async updatePlan(
    @Headers('authorization') authHeader: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.requireAdmin(authHeader);
    const parsed = planSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.admin.updateShopPlan(id, parsed.data.plan, parsed.data.durationDays ?? 30);
  }

  @Patch('shops/:id/status')
  async updateStatus(
    @Headers('authorization') authHeader: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.requireAdmin(authHeader);
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.admin.updateShopStatus(id, parsed.data.status);
  }

  private async requireAdmin(authHeader?: string) {
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const userId = token ? this.auth.verifySessionToken(token) : null;
    if (!userId) throw new UnauthorizedException('Session invalide ou expirée. Reconnectez-vous.');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, name: true },
    });
    if (!user) throw new UnauthorizedException('Compte introuvable. Reconnectez-vous.');

    const allowedPhones = (this.config.get<string>('ADMIN_PHONES') ?? process.env.ADMIN_PHONES ?? '')
      .split(',')
      .map(normalizePhone)
      .filter(Boolean);
    if (!allowedPhones.length || !allowedPhones.includes(normalizePhone(user.phone))) {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return user;
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function parsePage(value?: string): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  return Math.max(1, Math.min(100_000, Number(value)));
}

function parseStatus(value?: string): ShopStatus | undefined {
  return value && ['DRAFT', 'ACTIVE', 'SUSPENDED'].includes(value)
    ? (value as ShopStatus)
    : undefined;
}

function parsePlan(value?: string): 'free' | 'pro' | 'expired' | undefined {
  return value === 'free' || value === 'pro' || value === 'expired' ? value : undefined;
}

function parseOrderStatus(value?: string) {
  return value && ['NEW', 'CONFIRMED', 'PAID', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].includes(value)
    ? value as 'NEW' | 'CONFIRMED' | 'PAID' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
    : undefined;
}

function parsePaymentStatus(value?: string): 'paid' | 'pending' | undefined {
  return value === 'paid' || value === 'pending' ? value : undefined;
}

function parseHasShop(value?: string): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}
