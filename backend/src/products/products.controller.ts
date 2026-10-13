import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller()
export class ProductsController {
  constructor(@Inject(ProductsService) private readonly productsService: ProductsService) {}

  @Get('shops/:shopId/products')
  findByShop(@Param('shopId') shopId: string) {
    return this.productsService.findByShop(shopId);
  }

  @Post('shops/:shopId/products')
  create(@Param('shopId') shopId: string, @Body() body: unknown) {
    return this.productsService.create(shopId, body);
  }

  @Get('products/explore')
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
  findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Put('products/:id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.productsService.update(id, body);
  }

  @Delete('products/:id')
  delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }
}
