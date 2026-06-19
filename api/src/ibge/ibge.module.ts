import { forwardRef, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IbgeService } from './ibge.service';
import { IbgeController } from './ibge.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, forwardRef(() => AuthModule)],
  providers: [IbgeService],
  controllers: [IbgeController],
  exports: [IbgeService],
})
export class IbgeModule {}
