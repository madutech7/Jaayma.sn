import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

const uploadSchema = z.object({
  shopId: z.string().min(1),
  fileName: z.string().min(3),
  contentType: z
    .string()
    .regex(/^image\/(jpeg|png|webp|avif|heic|heif)$/i, 'Format image non supporté'),
});

const imageUploadSchema = z.object({
  ownerId: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/),
  folder: z.enum(['logos', 'covers', 'products', 'misc']),
  fileName: z.string().min(1),
  contentType: z
    .string()
    .regex(/^image\/(jpeg|png|webp|avif|heic|heif)$/i, 'Format image non supporté'),
});

@Injectable()
export class UploadsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private getS3Config() {
    const bucket =
      process.env.S3_BUCKET ||
      process.env.STORAGE_BUCKET ||
      process.env.R2_BUCKET ||
      'jaayma';

    const accessKeyId =
      process.env.AWS_ACCESS_KEY_ID ||
      process.env.S3_ACCESS_KEY_ID ||
      process.env.STORAGE_ACCESS_KEY_ID ||
      process.env.R2_ACCESS_KEY_ID;

    const secretAccessKey =
      process.env.AWS_SECRET_ACCESS_KEY ||
      process.env.S3_SECRET_ACCESS_KEY ||
      process.env.STORAGE_SECRET_ACCESS_KEY ||
      process.env.R2_SECRET_ACCESS_KEY;

    const endpoint =
      process.env.AWS_ENDPOINT_URL_S3 ||
      process.env.AWS_ENDPOINT_URL ||
      process.env.S3_ENDPOINT ||
      process.env.STORAGE_ENDPOINT ||
      (process.env.R2_ACCOUNT_ID
        ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : undefined);

    const region =
      process.env.AWS_REGION ||
      process.env.S3_REGION ||
      process.env.STORAGE_REGION ||
      'eu-central-1';

    const publicBaseUrl =
      process.env.S3_PUBLIC_URL ||
      process.env.STORAGE_PUBLIC_URL ||
      process.env.PUBLIC_R2_BASE_URL;

    if (!accessKeyId || !secretAccessKey) {
      throw new BadRequestException(
        'Configuration Storage manquante (AWS_ACCESS_KEY_ID et AWS_SECRET_ACCESS_KEY requis)',
      );
    }

    const s3Client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });

    return { s3Client, bucket, publicBaseUrl };
  }

  async createImageUpload(input: unknown) {
    const parsed = imageUploadSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    if (parsed.data.folder === 'products') {
      const shop = await this.prisma.shop.findFirst({
        where: { ownerId: parsed.data.ownerId, status: { not: 'SUSPENDED' } },
        select: { id: true },
      });

      if (!shop) {
        throw new BadRequestException('Boutique introuvable');
      }
    }

    const { s3Client, bucket, publicBaseUrl } = this.getS3Config();
    const extension = extensionForContentType(parsed.data.contentType);
    const key = `${parsed.data.folder}/${parsed.data.ownerId}/${randomUUID()}.${extension}`;
    const cacheControl = 'public, max-age=31536000, immutable';
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: parsed.data.contentType,
      CacheControl: cacheControl,
    });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const publicUrl = publicBaseUrl
      ? `${publicBaseUrl.replace(/\/$/, '')}/${key}`
      : `http://localhost:${process.env.PORT || 4000}/uploads/file/${key}`;

    return {
      key,
      uploadUrl,
      publicUrl,
      expiresIn: 300,
      method: 'PUT',
      headers: {
        'Content-Type': parsed.data.contentType,
        'Cache-Control': cacheControl,
      },
    };
  }

  async createProductImageUpload(input: unknown) {
    const parsed = uploadSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const { s3Client, bucket, publicBaseUrl } = this.getS3Config();

    const shop = await this.prisma.shop.findFirst({
      where: { id: parsed.data.shopId, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!shop) {
      throw new BadRequestException('Boutique introuvable');
    }

    const extension = extensionForContentType(parsed.data.contentType);
    const key = `shops/${parsed.data.shopId}/products/${randomUUID()}.${extension}`;
    const cacheControl = 'public, max-age=31536000, immutable';

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: parsed.data.contentType,
      CacheControl: cacheControl,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    const publicUrl = publicBaseUrl
      ? `${publicBaseUrl.replace(/\/$/, '')}/${key}`
      : `http://localhost:${process.env.PORT || 4000}/uploads/file/${key}`;

    return {
      key,
      uploadUrl,
      publicUrl,
      expiresIn: 300,
      method: 'PUT',
      headers: {
        'Content-Type': parsed.data.contentType,
        'Cache-Control': cacheControl,
      },
    };
  }

  async getFile(key: string) {
    const { s3Client, bucket } = this.getS3Config();

    try {
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );

      return {
        body: response.Body,
        contentType: response.ContentType ?? 'application/octet-stream',
        cacheControl:
          response.CacheControl ?? 'public, max-age=31536000, immutable',
      };
    } catch {
      throw new NotFoundException('Fichier introuvable');
    }
  }
}

function extensionForContentType(contentType: string) {
  const extensionByContentType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };

  return extensionByContentType[contentType.toLowerCase()] ?? 'webp';
}
