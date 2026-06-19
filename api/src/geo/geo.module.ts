import { forwardRef, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GeoService } from './geo.service';
import { GeoController } from './geo.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, forwardRef(() => AuthModule)],
  providers: [GeoService],
  controllers: [GeoController],
  exports: [GeoService],
})
export class GeoModule {}
