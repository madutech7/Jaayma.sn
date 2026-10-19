import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [UploadsController],
  imports: [AuthModule],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
