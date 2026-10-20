import { Body, Controller, Delete, Get, Header, Headers, Inject, Param, Post, Put, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { AuthService } from '../auth/auth.service';

@Controller()
export class ProductsController {
  constructor(
    @Inject(ProductsService) private readonly productsService: ProductsService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Get('shops/:shopId/products')
  findByShop(@Param('shopId') shopId: string, @Headers('authorization') authHeader?: string) {
    const userId = this.auth.requireSessionUserId(authHeader);
    return this.productsService.findByShop(shopId, userId);
  }

  @Get('shops/:shopSlug/products/:productId')
  @Header('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300')
  findPublicByShopSlug(@Param('shopSlug') shopSlug: string, @Param('productId') productId: string) {
    return this.productsService.findPublicByShopSlug(shopSlug, productId);
  }

  @Post('shops/:shopId/products')
  create(
    @Param('shopId') shopId: string,
    @Body() body: unknown,
    @Headers('authorization') authHeader?: string,
  ) {
    const userId = this.auth.requireSessionUserId(authHeader);
    return this.productsService.create(shopId, body, userId);
  }

  @Get('products/explore')
  @Header('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300')
  explore(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findForExplore({
      q,
      category,
      page: page && /^\d+$/.test(page) ? Number(page) : 1,
      limit: limit && /^\d+$/.test(limit) ? Number(limit) : 20,
    });
  }

  @Get('products/:id')
  findById(@Param('id') id: string, @Headers('authorization') authHeader?: string) {
    const userId = this.auth.requireSessionUserId(authHeader);
    return this.productsService.findById(id, userId);
  }

  @Put('products/:id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authHeader?: string,
  ) {
    const userId = this.auth.requireSessionUserId(authHeader);
    return this.productsService.update(id, body, userId);
  }

  @Delete('products/:id')
  delete(@Param('id') id: string, @Headers('authorization') authHeader?: string) {
    const userId = this.auth.requireSessionUserId(authHeader);
    return this.productsService.delete(id, userId);
  }
}
