import type { NextFunction, Request, Response } from 'express';

type RateLimitPolicy = { limit: number; windowMs: number; name: string };
type Bucket = { count: number; resetAt: number };
type RateLimitRule = RateLimitPolicy & { key: string };

const buckets = new Map<string, Bucket>();
const MINUTE = 60_000;

function rulesFor(request: Request): RateLimitRule[] {
  const path = request.path.toLowerCase();
  const method = request.method.toUpperCase();
  const clientIp = request.ip || request.socket.remoteAddress || 'unknown';
  const body = request.body && typeof request.body === 'object'
    ? request.body as Record<string, unknown>
    : {};

  if (method === 'POST' && path === '/auth/login') {
    const phone = normalizePhone(body.phone);
    return [
      { key: `login-ip:${clientIp}`, name: 'login', limit: 120, windowMs: MINUTE },
      ...(phone ? [{ key: `login-phone:${phone}`, name: 'login-account', limit: 8, windowMs: 15 * MINUTE }] : []),
    ];
  }
  if (method === 'POST' && path === '/auth/register') {
    const phone = normalizePhone(body.phone);
    return [
      { key: `register-ip:${clientIp}`, name: 'register', limit: 120, windowMs: 60 * MINUTE },
      ...(phone ? [{ key: `register-phone:${phone}`, name: 'register-account', limit: 3, windowMs: 60 * MINUTE }] : []),
    ];
  }
  if (method === 'POST' && path === '/orders') {
    const phone = normalizePhone(body.customerPhone);
    const shopId = normalizeIdentifier(body.shopId);
    return [
      { key: `order-ip:${clientIp}`, name: 'order-create', limit: 120, windowMs: MINUTE },
      ...(phone && shopId
        ? [{ key: `order-customer:${shopId}:${phone}`, name: 'order-customer', limit: 5, windowMs: 10 * MINUTE }]
        : []),
    ];
  }
  if (method === 'GET' && path.startsWith('/orders/reference/')) {
    return [
      { key: `order-lookup-ip:${clientIp}`, name: 'order-lookup', limit: 300, windowMs: MINUTE },
      { key: `order-lookup-ref:${path}`, name: 'order-lookup-reference', limit: 10, windowMs: MINUTE },
    ];
  }
  if (method === 'POST' && path.startsWith('/uploads/')) {
    return [
      { key: `upload-ip:${clientIp}`, name: 'upload-signing', limit: 120, windowMs: MINUTE },
      { key: `upload-session:${sessionIdentifier(request)}`, name: 'upload-session', limit: 20, windowMs: 10 * MINUTE },
    ];
  }
  if (method === 'POST' && path === '/admin/notifications') {
    return [{ key: `admin-broadcast:${sessionIdentifier(request)}`, name: 'admin-broadcast', limit: 5, windowMs: 60 * MINUTE }];
  }
  if (method === 'POST' && path === '/notifications/test') {
    return [
      { key: `push-test-ip:${clientIp}`, name: 'push-test-ip', limit: 120, windowMs: MINUTE },
      { key: `push-test:${sessionIdentifier(request)}`, name: 'push-test', limit: 5, windowMs: 10 * MINUTE },
    ];
  }
  if ((method === 'POST' || method === 'DELETE') && path === '/notifications/push-subscriptions') {
    return [{ key: `push-subscription:${sessionIdentifier(request)}`, name: 'push-subscription', limit: 30, windowMs: MINUTE }];
  }

  return [];
}

function normalizeIdentifier(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase().slice(0, 80) : '';
}

function normalizePhone(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\D/g, '').slice(-24) : '';
}

function sessionIdentifier(request: Request) {
  const token = request.header('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const match = token.match(/^usr_([^_]+)_\d+_[a-f0-9]{64}$/i);
  return match?.[1] ?? request.ip ?? 'unknown';
}

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size > 20_000) {
    const oldestKey = buckets.keys().next().value;
    if (!oldestKey) break;
    buckets.delete(oldestKey);
  }
}

export function rateLimitMiddleware(request: Request, response: Response, next: NextFunction) {
  const now = Date.now();
  if (buckets.size > 20_000 || Math.random() < 0.01) pruneExpired(now);

  for (const rule of rulesFor(request)) {
    let bucket = buckets.get(rule.key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + rule.windowMs };
      buckets.set(rule.key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > rule.limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      response.setHeader('Retry-After', String(retryAfterSeconds));
      response.setHeader('Cache-Control', 'no-store');
      response.status(429).json({
        statusCode: 429,
        message: 'Trop de requêtes. Réessayez dans quelques instants.',
        retryAfterSeconds,
      });
      return;
    }

    response.setHeader('RateLimit-Limit', String(rule.limit));
    response.setHeader('RateLimit-Remaining', String(Math.max(0, rule.limit - bucket.count)));
    response.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
  }
  next();
}
