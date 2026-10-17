import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

const registerSchema = z.object({
  phone: z.string().min(8),
  password: z.string().min(6),
  name: z.string().optional().default(''),
});

const loginSchema = z.object({
  phone: z.string().min(8),
  password: z.string().min(1),
});

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  createSessionToken(userId: string): string {
    const timestamp = Date.now();
    const signature = createHmac('sha256', this.getSessionSecret())
      .update(`${userId}.${timestamp}`)
      .digest('hex');
    return `usr_${userId}_${timestamp}_${signature}`;
  }

  verifySessionToken(token: string, requireSignature = false): string | null {
    const match = token.match(/^usr_([^_]+)_(\d+)(?:_([a-f0-9]{64}))?$/i);
    if (!match) return null;

    const [, userId, timestampRaw, signature] = match;
    const timestamp = Number(timestampRaw);
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000;
    if (!Number.isSafeInteger(timestamp) || timestamp > now + 5 * 60 * 1000 || now - timestamp > maxAge) {
      return null;
    }

    if (!signature) return requireSignature ? null : userId;

    const expected = createHmac('sha256', this.getSessionSecret())
      .update(`${userId}.${timestamp}`)
      .digest();
    const received = Buffer.from(signature, 'hex');
    return received.length === expected.length && timingSafeEqual(received, expected)
      ? userId
      : null;
  }

  private getSessionSecret(): string {
    const secret = this.config.get<string>('JWT_SECRET') ?? process.env.JWT_SECRET;
    if (secret) return secret;
    if (process.env.NODE_ENV !== 'production') return 'jaayma-local-session-secret';
    throw new InternalServerErrorException('JWT_SECRET doit être configuré pour les sessions.');
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, stored: string): boolean {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;
    const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512');
    const keyBuf = Buffer.from(key, 'hex');
    return hash.length === keyBuf.length && timingSafeEqual(hash, keyBuf);
  }

  async register(input: unknown) {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const cleanPhone = parsed.data.phone.trim();
    const existing = await this.prisma.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (existing) {
      throw new BadRequestException('Ce numéro de téléphone est déjà utilisé');
    }

    const passwordHash = this.hashPassword(parsed.data.password);

    const user = await this.prisma.user.create({
      data: {
        phone: cleanPhone,
        name: parsed.data.name || 'Vendeur',
        passwordHash,
      },
      select: {
        id: true,
        phone: true,
        name: true,
        createdAt: true,
      },
    });

    return {
      user,
      shop: null,
      token: this.createSessionToken(user.id),
    };
  }

  async login(input: unknown) {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const cleanPhone = parsed.data.phone.trim();
    const user = await this.prisma.user.findUnique({
      where: { phone: cleanPhone },
      include: {
        shops: {
          take: 1,
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Numéro ou mot de passe incorrect');
    }

    const isValid = this.verifyPassword(parsed.data.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Numéro ou mot de passe incorrect');
    }

    const shop = user.shops[0] ?? null;

    return {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
      },
      shop,
      token: this.createSessionToken(user.id),
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        name: true,
        shops: {
          take: 1,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    return {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
      },
      shop: user.shops[0] ?? null,
    };
  }
}
