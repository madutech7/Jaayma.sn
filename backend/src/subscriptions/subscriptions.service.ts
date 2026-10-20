import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_PRO_PRICE_XOF = 1000;
const PRO_DURATION_DAYS = 30;
const UNITECHPAY_API_URL = 'https://api.unitech.sn/api.php';

const createPaymentSchema = z.object({
  method: z.enum(['wave', 'orange_money']),
});

const webhookSchema = z.object({
  event: z.enum(['payment_completed', 'payment_failed', 'payment_expired']),
  reference: z.string().min(1).max(200),
  amount: z.union([z.number(), z.string().min(1).max(20)]),
  status: z.string().min(1).max(40),
  signed_at: z.union([z.number(), z.string().min(1).max(30)]).optional(),
  signature: z.string().regex(/^[a-f\d]{64}$/i).optional(),
  transaction_id: z.union([z.number(), z.string().min(1).max(100)]).optional(),
});

type UnitechPayResponse = {
  success?: boolean;
  message?: string;
  data?: {
    transaction_id?: number | string;
    reference?: string;
    payment_url?: string;
    amount?: number;
    status?: string;
  };
};

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private webhookConfigured = false;
  private webhookConfiguration: Promise<void> | null = null;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async getPrice() {
    const settings = await this.prisma.platformSetting.findUnique({
      where: { id: 'global' },
      select: { proPriceXof: true },
    });
    return { amount: settings?.proPriceXof ?? DEFAULT_PRO_PRICE_XOF };
  }

  async createPayment(userId: string, input: unknown) {
    const parsed = createPaymentSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());

    const apiKey = this.getApiKey();
    await this.ensureWebhookConfigured(apiKey);
    const [shop, { amount }] = await Promise.all([
      this.prisma.shop.findFirst({
        where: { ownerId: userId },
        include: { owner: { select: { phone: true } } },
      }),
      this.getPrice(),
    ]);
    if (!shop || !shop.owner) throw new NotFoundException('Boutique ou vendeur introuvable.');

    const phone = this.getSenegalMobileNumber(shop.owner.phone);
    const frontendUrl = this.getFrontendUrl();
    const payment = await this.prisma.subscriptionPayment.create({
      data: {
        shopId: shop.id,
        amount,
        currency: 'XOF',
        method: parsed.data.method,
        status: 'pending',
      },
      select: { id: true },
    });

    const successUrl = new URL('/espace/abonnement', frontendUrl);
    successUrl.searchParams.set('paiement', payment.id);
    const cancelUrl = new URL('/espace/abonnement', frontendUrl);
    cancelUrl.searchParams.set('paiement', payment.id);
    cancelUrl.searchParams.set('retour', 'annule');

    const action = parsed.data.method === 'wave' ? 'create_wave_payment' : 'create_orange_om';
    const payload = {
      amount,
      customer_number: phone,
      description: `Jaaymaa Pro - ${shop.slug}`.slice(0, 120),
      callback_success: successUrl.toString(),
      callback_cancel: cancelUrl.toString(),
    };

    try {
      const response = await fetch(`${UNITECHPAY_API_URL}?action=${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20_000),
      });

      const result = (await response.json().catch(() => null)) as UnitechPayResponse | null;
      const paymentUrl = result?.data?.payment_url;
      const reference = result?.data?.reference;
      const transactionId = result?.data?.transaction_id;
      if (
        !response.ok ||
        result?.success !== true ||
        !paymentUrl ||
        !reference ||
        Number(result.data?.amount) !== amount
      ) {
        await this.markPaymentStatus(payment.id, 'failed');
        this.logger.warn(`UnitechPay payment creation rejected (${response.status}).`);
        throw new BadGatewayException('U‑NITech PAY n’a pas pu créer ce paiement. Réessayez.');
      }

      let safePaymentUrl: URL;
      try {
        safePaymentUrl = new URL(paymentUrl);
      } catch {
        await this.markPaymentStatus(payment.id, 'failed');
        throw new BadGatewayException('Le lien de paiement reçu est invalide.');
      }
      if (safePaymentUrl.protocol !== 'https:') {
        await this.markPaymentStatus(payment.id, 'failed');
        throw new BadGatewayException('Le lien de paiement reçu est invalide.');
      }

      await this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          reference: reference.slice(0, 200),
          providerTransactionId: transactionId === undefined ? null : String(transactionId).slice(0, 100),
        },
      });

      return {
        id: payment.id,
        paymentUrl: safePaymentUrl.toString(),
        amount,
        method: parsed.data.method,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      await this.markPaymentStatus(payment.id, 'failed').catch(() => undefined);
      this.logger.error('UnitechPay could not be reached while creating a subscription payment.');
      throw new BadGatewayException('Le service de paiement est momentanément indisponible. Réessayez.');
    }
  }

  async getPayment(userId: string, id: string) {
    const payment = await this.prisma.subscriptionPayment.findFirst({
      where: { id, shop: { ownerId: userId } },
      select: { id: true, status: true, amount: true, currency: true, method: true, createdAt: true, paidAt: true },
    });
    if (!payment) throw new NotFoundException('Paiement introuvable.');
    return payment;
  }

  async handleWebhook(input: unknown, headerSignature?: string, rawBody?: Buffer) {
    const parsed = webhookSchema.safeParse(input);
    const apiKey = this.getApiKey();
    if (!parsed.success) throw new BadRequestException('Webhook U‑NITech PAY invalide.');

    const event = parsed.data;
    const canonicalPayload = event.signed_at === undefined
      ? null
      : [event.event, event.reference, String(event.amount), event.status, String(event.signed_at)].join('|');
    const bodySignatureValid = canonicalPayload !== null && event.signature !== undefined
      ? this.signatureMatches(
          createHmac('sha256', apiKey).update(canonicalPayload).digest(),
          event.signature,
        )
      : false;
    const headerSignatureValid = rawBody && headerSignature
      ? this.signatureMatches(createHmac('sha256', apiKey).update(rawBody).digest(), headerSignature)
      : false;
    if (!bodySignatureValid && !headerSignatureValid) {
      throw new UnauthorizedException('Signature du webhook invalide.');
    }

    if (
      event.event === 'payment_completed' &&
      !['completed', 'paid'].includes(event.status.toLowerCase())
    ) {
      throw new BadRequestException('Le statut du webhook ne correspond pas à un paiement réussi.');
    }

    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { reference: event.reference },
      select: { id: true, shopId: true, amount: true, providerTransactionId: true, status: true },
    });
    if (!payment) {
      // A valid provider callback can arrive while a payment session is being recorded.
      // Acknowledge unknown references so unrelated transactions are not retried forever.
      return { received: true, processed: false };
    }

    if (Number(event.amount) !== payment.amount) {
      throw new BadRequestException('Le montant du webhook ne correspond pas au paiement.');
    }
    if (
      payment.providerTransactionId &&
      event.transaction_id !== undefined &&
      String(event.transaction_id) !== payment.providerTransactionId
    ) {
      throw new BadRequestException('La transaction du webhook ne correspond pas au paiement.');
    }

    const targetStatus =
      event.event === 'payment_completed'
        ? 'paid'
        : event.event === 'payment_failed'
          ? 'failed'
          : 'expired';
    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.subscriptionPayment.updateMany({
        where: { id: payment.id, status: 'pending' },
        data: { status: targetStatus, ...(targetStatus === 'paid' ? { paidAt: new Date() } : {}) },
      });
      if (claimed.count === 0 || targetStatus !== 'paid') return { processed: claimed.count > 0 };

      const shop = await tx.shop.findUnique({
        where: { id: payment.shopId },
        select: { plan: true, planExpiresAt: true },
      });
      if (!shop) throw new NotFoundException('Boutique introuvable pour ce paiement.');

      const now = new Date();
      const activeExpiry =
        shop.plan === 'pro' && shop.planExpiresAt && shop.planExpiresAt > now
          ? shop.planExpiresAt
          : now;
      const planExpiresAt = new Date(activeExpiry.getTime() + PRO_DURATION_DAYS * 24 * 60 * 60 * 1000);
      await tx.shop.update({
        where: { id: payment.shopId },
        data: {
          plan: 'pro',
          planExpiresAt,
          proReminder3DaysSentAt: null,
          proReminder1DaySentAt: null,
        },
      });
      return { processed: true };
    });

    return { received: true, processed: result.processed };
  }

  private getApiKey() {
    const apiKey = this.config.get<string>('UNITECHPAY_API_KEY') ?? process.env.UNITECHPAY_API_KEY;
    if (!apiKey?.trim()) {
      throw new ServiceUnavailableException('Le paiement en ligne n’est pas encore configuré.');
    }
    return apiKey.trim();
  }

  private async ensureWebhookConfigured(apiKey: string) {
    if (this.webhookConfigured) return;
    if (!this.webhookConfiguration) {
      this.webhookConfiguration = this.configureWebhook(apiKey);
    }
    try {
      await this.webhookConfiguration;
      this.webhookConfigured = true;
    } finally {
      this.webhookConfiguration = null;
    }
  }

  private async configureWebhook(apiKey: string) {
    const webhookUrl = this.getWebhookUrl();
    try {
      const response = await fetch(`${UNITECHPAY_API_URL}?action=configure_webhook`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          webhook_url: webhookUrl,
          events: ['payment_completed', 'payment_failed', 'payment_expired'],
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const result = (await response.json().catch(() => null)) as { success?: boolean } | null;
      if (!response.ok || result?.success !== true) {
        this.logger.error(`UnitechPay webhook setup failed (${response.status}).`);
        throw new ServiceUnavailableException('Impossible de préparer la confirmation automatique du paiement. Réessayez.');
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error('UnitechPay webhook setup could not be reached.');
      throw new ServiceUnavailableException('Impossible de joindre le service de confirmation des paiements. Réessayez.');
    }
  }

  private getWebhookUrl() {
    const configuredUrl = this.config.get<string>('UNITECHPAY_WEBHOOK_URL') ?? process.env.UNITECHPAY_WEBHOOK_URL;
    const renderUrl = this.config.get<string>('RENDER_EXTERNAL_URL') ?? process.env.RENDER_EXTERNAL_URL;
    const defaultBase = renderUrl?.trim() || 'https://jaayma-sn.onrender.com';
    const rawUrl = configuredUrl?.trim() || `${defaultBase.replace(/\/$/, '')}/subscriptions/unitechpay/webhook`;
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== 'https:') throw new Error('HTTPS required');
      return url.toString();
    } catch {
      throw new ServiceUnavailableException('UNITECHPAY_WEBHOOK_URL doit être une URL HTTPS valide.');
    }
  }

  private signatureMatches(expected: Buffer, value: string) {
    if (!/^[a-f\d]{64}$/i.test(value)) return false;
    const received = Buffer.from(value, 'hex');
    return received.length === expected.length && timingSafeEqual(received, expected);
  }

  private getFrontendUrl() {
    const configuredUrl = this.config.get<string>('FRONTEND_URL') ?? process.env.FRONTEND_URL;
    // Keep payment callbacks on the currently deployed Cloudflare site until
    // the custom jaayma.sn domain is actually configured and live.
    const rawUrl = configuredUrl?.trim() || 'https://jaayma-sn.madutech0.workers.dev';
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== 'https:' && url.hostname !== 'localhost') throw new Error('HTTPS required');
      return url.origin;
    } catch {
      throw new ServiceUnavailableException('FRONTEND_URL doit être une URL HTTPS valide.');
    }
  }

  private getSenegalMobileNumber(phone: string) {
    const digits = phone.replace(/\D/g, '');
    const local = digits.startsWith('221') ? digits.slice(3) : digits;
    if (!/^7\d{8}$/.test(local)) {
      throw new BadRequestException('Votre compte doit utiliser un numéro mobile sénégalais valide pour payer.');
    }
    return local;
  }

  private async markPaymentStatus(id: string, status: string) {
    await this.prisma.subscriptionPayment.updateMany({
      where: { id, status: 'pending' },
      data: { status },
    });
  }
}
