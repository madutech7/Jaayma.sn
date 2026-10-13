import { Body, Controller, Get, Inject, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Readable } from 'node:stream';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(@Inject(UploadsService) private readonly uploadsService: UploadsService) {}

  @Post('image')
  createImageUpload(@Body() body: unknown) {
    return this.uploadsService.createImageUpload(body);
  }

  @Post('product-image')
  createProductImageUpload(@Body() body: unknown) {
    return this.uploadsService.createProductImageUpload(body);
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
