import { Module } from '@nestjs/common';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';
import { UploadsModule } from '../uploads/uploads.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UploadsModule, AuthModule],
  controllers: [ShopsController],
  providers: [ShopsService],
})
export class ShopsModule {}
