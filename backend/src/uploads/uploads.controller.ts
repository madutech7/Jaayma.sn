import { Body, Controller, Get, Headers, Inject, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Readable } from 'node:stream';
import { UploadsService } from './uploads.service';
import { AuthService } from '../auth/auth.service';

@Controller('uploads')
export class UploadsController {
  constructor(
    @Inject(UploadsService) private readonly uploadsService: UploadsService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Post('image')
  createImageUpload(@Body() body: unknown, @Headers('authorization') authHeader?: string) {
    const userId = this.auth.requireSessionUserId(authHeader);
    const input = body && typeof body === 'object' ? { ...body, ownerId: userId } : body;
    return this.uploadsService.createImageUpload(input);
  }

  @Post('product-image')
  createProductImageUpload(@Body() body: unknown, @Headers('authorization') authHeader?: string) {
    const userId = this.auth.requireSessionUserId(authHeader);
    return this.uploadsService.createProductImageUpload(body, userId);
  }

  @Get('file/*')
  async getFile(@Req() req: Request, @Res() res: Response) {
    const encodedKey = req.url.replace(/^\/uploads\/file\//, '').split('?')[0];
    const key = encodedKey.split('/').map(decodeURIComponent).join('/');
    const file = await this.uploadsService.getFile(key);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', file.cacheControl);

    if (file.body instanceof Readable) {
      file.body.pipe(res);
    } else if (file.body && typeof (file.body as any).transformToByteArray === 'function') {
      const bytes = await (file.body as any).transformToByteArray();
      res.end(Buffer.from(bytes));
    } else {
      res.end();
    }
  }
}
