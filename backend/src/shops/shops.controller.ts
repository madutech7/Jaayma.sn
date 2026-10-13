import { Body, Controller, Get, Inject, Param, Post, Put, Query } from '@nestjs/common';
import { ShopsService } from './shops.service';

@Controller('shops')
export class ShopsController {
  constructor(@Inject(ShopsService) private readonly shopsService: ShopsService) {}

  @Get()
  findAll(@Query('q') q?: string, @Query('category') category?: string) {
    return this.shopsService.findAll({ q, category });
  }

  @Post()
  create(@Body() body: unknown) {
    return this.shopsService.create(body);
  }

  @Get('by-owner/:ownerId')
  findByOwner(@Param('ownerId') ownerId: string) {
    return this.shopsService.findByOwnerId(ownerId);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.shopsService.findBySlug(slug);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.shopsService.update(id, body);
  }
}
