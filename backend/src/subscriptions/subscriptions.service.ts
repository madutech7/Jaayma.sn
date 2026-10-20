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
import { Cron, CronExpression } from '@nestjs/schedule';
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

type ProviderTransaction = {
  reference?: unknown;
  amount?: unknown;
  status?: unknown;
  transaction_id?: unknown;
};

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private webhookConfigured = false;
  private webhookConfiguration: Promise<void> | null = null;
  private readonly paymentReconciliationAttempts = new Map<string, number>();
  private providerTransactionsCheckedAt = 0;
  private providerTransactionsCache: ProviderTransaction[] | null = null;
  private providerTransactionsRequest: Promise<ProviderTransaction[] | null> | null = null;

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
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        method: true,
        createdAt: true,
        paidAt: true,
        shopId: true,
        reference: true,
        providerTransactionId: true,
      },
    });
    if (!payment) throw new NotFoundException('Paiement introuvable.');

    if (payment.status === 'pending' && payment.reference) {
      void this.reconcileOnePendingPayment(payment).catch((error) => {
        this.logger.warn(`UnitechPay payment status check failed: ${this.safeErrorMessage(error)}`);
      });
    }

    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
    };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async reconcilePendingPayments() {
    const apiKey = this.getOptionalApiKey();
    if (!apiKey) return;

    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const payments = await this.prisma.subscriptionPayment.findMany({
      where: {
        status: 'pending',
        reference: { not: null },
        createdAt: { gte: cutoff },
      },
      select: {
        id: true,
        shopId: true,
        reference: true,
        providerTransactionId: true,
        amount: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    if (!payments.length) return;

    const transactions = await this.getProviderTransactionSnapshot(apiKey);
    if (!transactions) return;

    for (const payment of payments) {
      if (!transactions.some((transaction) => this.matchesPaidTransaction(transaction, payment))) continue;
      try {
        await this.activatePaidPayment(payment.id, payment.shopId);
      } catch (error) {
        this.logger.error(`Could not activate subscription payment ${payment.id}: ${this.safeErrorMessage(error)}`);
      }
    }
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
    if (targetStatus === 'paid') {
      return {
        received: true,
        processed: await this.activatePaidPayment(payment.id, payment.shopId),
      };
    }

    const claimed = await this.prisma.subscriptionPayment.updateMany({
      where: { id: payment.id, status: 'pending' },
      data: { status: targetStatus },
    });

    return { received: true, processed: claimed.count > 0 };
  }

  private getApiKey() {
    const apiKey = this.config.get<string>('UNITECHPAY_API_KEY') ?? process.env.UNITECHPAY_API_KEY;
    if (!apiKey?.trim()) {
      throw new ServiceUnavailableException('Le paiement en ligne n’est pas encore configuré.');
    }
    return apiKey.trim();
  }

  private getOptionalApiKey() {
    const apiKey = this.config.get<string>('UNITECHPAY_API_KEY') ?? process.env.UNITECHPAY_API_KEY;
    return apiKey?.trim() || null;
  }

  private async reconcileOnePendingPayment(payment: {
    id: string;
    shopId: string;
    reference: string | null;
    providerTransactionId: string | null;
    amount: number;
  }) {
    if (!payment.reference) return false;
    const now = Date.now();
    const lastAttemptAt = this.paymentReconciliationAttempts.get(payment.id) ?? 0;
    if (now - lastAttemptAt < 20_000) return false;
    this.paymentReconciliationAttempts.set(payment.id, now);
    if (this.paymentReconciliationAttempts.size > 500) {
      for (const [paymentId, attemptedAt] of this.paymentReconciliationAttempts) {
        if (now - attemptedAt > 10 * 60_000) this.paymentReconciliationAttempts.delete(paymentId);
      }
    }

    const apiKey = this.getOptionalApiKey();
    if (!apiKey) return false;
    try {
      const transactions = await this.getProviderTransactionSnapshot(apiKey);
      if (!transactions) return false;
      if (!transactions.some((transaction) => this.matchesPaidTransaction(transaction, payment))) return false;
      return this.activatePaidPayment(payment.id, payment.shopId);
    } catch (error) {
      this.logger.warn(`UnitechPay payment status check failed: ${this.safeErrorMessage(error)}`);
      return false;
    }
  }

  private async getProviderTransactionSnapshot(apiKey: string): Promise<ProviderTransaction[] | null> {
    const now = Date.now();
    if (now - this.providerTransactionsCheckedAt < 20_000) {
      if (this.providerTransactionsRequest) return this.providerTransactionsRequest;
      return this.providerTransactionsCache;
    }
    if (this.providerTransactionsRequest) return this.providerTransactionsRequest;

    this.providerTransactionsCheckedAt = now;
    this.providerTransactionsRequest = this.listProviderTransactions(apiKey)
      .then((transactions) => {
        this.providerTransactionsCache = transactions;
        return transactions;
      })
      .catch((error: unknown) => {
        this.logger.warn(`UnitechPay transaction reconciliation unavailable: ${this.safeErrorMessage(error)}`);
        return null;
      })
      .finally(() => {
        this.providerTransactionsRequest = null;
      });
    return this.providerTransactionsRequest;
  }

  private async listProviderTransactions(apiKey: string): Promise<ProviderTransaction[]> {
    const response = await fetch(`${UNITECHPAY_API_URL}?action=transactions`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });
    const result = (await response.json().catch(() => null)) as unknown;
    if (!response.ok || !this.isRecord(result) || result.success !== true) {
      throw new Error(`provider returned HTTP ${response.status}`);
    }

    const data = result.data;
    const candidates = [
      Array.isArray(data) ? data : null,
      this.isRecord(data) && Array.isArray(data.transactions) ? data.transactions : null,
      this.isRecord(data) && Array.isArray(data.items) ? data.items : null,
      Array.isArray(result.transactions) ? result.transactions : null,
    ];
    const rows = candidates.find((candidate): candidate is unknown[] => candidate !== null);
    return (rows ?? []).filter((row): row is ProviderTransaction => this.isRecord(row));
  }

  private matchesPaidTransaction(
    transaction: ProviderTransaction,
    payment: { reference: string | null; providerTransactionId: string | null; amount: number },
  ) {
    if (
      !payment.reference ||
      transaction.reference !== payment.reference ||
      Number(transaction.amount) !== payment.amount ||
      typeof transaction.status !== 'string' ||
      !['completed', 'paid'].includes(transaction.status.toLowerCase())
    ) {
      return false;
    }
    return !(
      payment.providerTransactionId &&
      transaction.transaction_id !== undefined &&
      String(transaction.transaction_id) !== payment.providerTransactionId
    );
  }

  private async activatePaidPayment(paymentId: string, shopId: string) {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.subscriptionPayment.updateMany({
        where: { id: paymentId, status: 'pending' },
        data: { status: 'paid', paidAt: new Date() },
      });
      if (claimed.count === 0) return false;

      const shop = await tx.shop.findUnique({
        where: { id: shopId },
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
        where: { id: shopId },
        data: {
          plan: 'pro',
          planExpiresAt,
          proReminder3DaysSentAt: null,
          proReminder1DaySentAt: null,
        },
      });
      return true;
    });
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private safeErrorMessage(error: unknown) {
    return error instanceof Error ? error.message.slice(0, 160) : 'unknown error';
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
