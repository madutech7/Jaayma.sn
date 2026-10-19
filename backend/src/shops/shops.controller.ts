import { Body, Controller, Get, Headers, Inject, Param, Post, Put, Query } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { AuthService } from '../auth/auth.service';

@Controller('shops')
export class ShopsController {
  constructor(
    @Inject(ShopsService) private readonly shopsService: ShopsService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Get()
  findAll(@Query('q') q?: string, @Query('category') category?: string) {
    return this.shopsService.findAll({ q, category });
  }

  @Get('explore')
  explore(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.shopsService.findForExplore({
      q,
      category,
      page: page && /^\d+$/.test(page) ? Number(page) : 1,
      limit: limit && /^\d+$/.test(limit) ? Number(limit) : 12,
    });
  }

  @Post()
  create(@Body() body: unknown, @Headers('authorization') authHeader?: string) {
    const userId = this.auth.requireSessionUserId(authHeader);
    return this.shopsService.create(body, userId);
  }

  @Get('by-owner/:ownerId')
  findByOwner(@Param('ownerId') ownerId: string, @Headers('authorization') authHeader?: string) {
    const userId = this.auth.requireSessionUserId(authHeader);
    return this.shopsService.findByOwnerId(userId, ownerId);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.shopsService.findBySlug(slug);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authHeader?: string,
  ) {
    const userId = this.auth.requireSessionUserId(authHeader);
    return this.shopsService.update(id, body, userId);
  }
}
