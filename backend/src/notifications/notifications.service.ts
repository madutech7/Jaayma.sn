import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048).refine(isSupportedPushEndpoint, 'Endpoint push non pris en charge'),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
  expirationTime: z.number().nullable().optional(),
});

const endpointSchema = z.object({
  endpoint: z.string().url().max(2048).refine(isSupportedPushEndpoint, 'Endpoint push non pris en charge'),
});

const broadcastSchema = z.object({
  title: z.string().trim().min(3).max(60),
  body: z.string().trim().min(3).max(180),
  url: z.string().trim().regex(/^\/(?!\/)[^\s]*$/, 'Le lien doit rester sur Jaayma'),
});

type NewOrder = {
  id: string;
  reference: string;
  customerName: string;
  total: number;
  items: Array<{ quantity: number }>;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  getVapidPublicKey(): string | null {
    return this.getVapidConfiguration()?.publicKey ?? null;
  }

  getAdminPushSettings() {
    const vapid = this.getVapidConfiguration();
    return {
      configured: Boolean(vapid),
      subject: vapid?.subject ?? null,
    };
  }

  async sendBroadcast(input: unknown) {
    const parsed = broadcastSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    if (!this.getVapidConfiguration()) {
      throw new BadRequestException('Configurez les clés VAPID avant d’envoyer une notification.');
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    let deliveredCount = 0;
    let failedCount = 0;
    const tag = `jaay-announcement-${Date.now()}`;

    for (let index = 0; index < subscriptions.length; index += 25) {
      const batch = subscriptions.slice(index, index + 25);
      const results = await Promise.allSettled(
        batch.map((subscription) =>
          this.sendToSubscription(subscription, {
            ...parsed.data,
            tag,
          }),
        ),
      );
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) deliveredCount += 1;
        else failedCount += 1;
      }
    }

    return {
      title: parsed.data.title,
      body: parsed.data.body,
      url: parsed.data.url,
      targetCount: subscriptions.length,
      deliveredCount,
      failedCount,
    };
  }

  async saveSubscription(userId: string, input: unknown) {
    const parsed = subscriptionSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    if (!this.getVapidConfiguration()) {
      throw new BadRequestException('Les notifications ne sont pas configurées.');
    }

    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!userExists) {
      throw new NotFoundException('Compte vendeur introuvable.');
    }

    const { endpoint, keys } = parsed.data;
    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      update: {
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return { success: true };
  }

  async removeSubscription(userId: string, input: unknown) {
    const parsed = endpointSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint: parsed.data.endpoint },
    });
    return { success: true };
  }

  async sendTestNotification(userId: string, input: unknown) {
    const parsed = endpointSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const subscription = await this.prisma.pushSubscription.findFirst({
      where: { userId, endpoint: parsed.data.endpoint },
    });
    if (!subscription) {
      throw new NotFoundException('Cet appareil n’est pas abonné aux notifications.');
    }

    const sent = await this.sendToSubscription(subscription, {
      title: 'Tout est prêt !',
      body: 'Jaayma vous préviendra dès qu’une nouvelle commande arrivera.',
      url: '/espace/commandes',
      tag: 'jaay-notification-test',
    });
    if (!sent) {
      throw new NotFoundException('Cette alerte a expiré. Réactivez les notifications sur cet appareil.');
    }

    return { success: true };
  }

  async notifyNewOrder(order: NewOrder, ownerId: string | null) {
    if (!ownerId) return;

    try {
      const subscriptions = await this.prisma.pushSubscription.findMany({
        where: { userId: ownerId },
      });
      const quantity = order.items.reduce((total, item) => total + item.quantity, 0);
      const amount = new Intl.NumberFormat('fr-FR').format(order.total);

      const deliveries = await Promise.allSettled(
        subscriptions.map((subscription) =>
          this.sendToSubscription(subscription, {
            title: 'Nouvelle commande',
            body: `${order.customerName} · ${quantity} article${quantity > 1 ? 's' : ''} · ${amount} FCFA`,
            url: `/espace/commandes/${order.id}`,
            tag: `jaay-order-${order.reference}`,
          }),
        ),
      );

      for (const delivery of deliveries) {
        if (delivery.status === 'rejected') {
          this.logger.warn(`Échec d’envoi push : ${(delivery.reason as Error).message}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Impossible d’envoyer la notification de commande : ${(error as Error).message}`);
    }
  }

  private getVapidConfiguration(): { publicKey: string; privateKey: string; subject: string } | null {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY') ?? process.env.VAPID_PUBLIC_KEY;
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY') ?? process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return null;

    const subject =
      this.config.get<string>('VAPID_SUBJECT') ??
      process.env.VAPID_SUBJECT ??
      'mailto:jaaymasn1@gmail.com';
    return { publicKey, privateKey, subject };
  }

  private async sendToSubscription(
    subscription: { id: string; endpoint: string; p256dh: string; auth: string },
    notification: { title: string; body: string; url: string; tag: string },
  ): Promise<boolean> {
    const vapid = this.getVapidConfiguration();
    if (!vapid) {
      throw new BadRequestException('Les notifications ne sont pas configurées.');
    }

    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(notification),
        { TTL: 60 * 60 },
      );
      return true;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await this.prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
        return false;
      }
      throw error;
    }
  }
}

function isSupportedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;

    const hostname = url.hostname.toLowerCase();
    return (
      hostname === 'fcm.googleapis.com' ||
      hostname.endsWith('.fcm.googleapis.com') ||
      hostname === 'web.push.apple.com' ||
      hostname === 'push.services.mozilla.com' ||
      hostname.endsWith('.push.services.mozilla.com') ||
      hostname === 'notify.windows.com' ||
      hostname.endsWith('.notify.windows.com')
    );
  } catch {
    return false;
  }
}
