import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
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
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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
      token: `usr_${user.id}_${Date.now()}`,
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
      token: `usr_${user.id}_${Date.now()}`,
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
