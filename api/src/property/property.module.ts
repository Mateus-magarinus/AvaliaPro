import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule, Property, Evaluation } from '@common';
import { PropertyRepository } from './property.repository';
import { PropertyController } from './property.controller';
import { PropertyService } from './services/property.service';
import { AuthModule } from '../auth/auth.module';
import { IbgeModule } from '../ibge/ibge.module';

@Module({
  imports: [
    DatabaseModule.forFeature([Property, Evaluation]),
    forwardRef(() => AuthModule),
    IbgeModule,
  ],
  providers: [PropertyRepository, PropertyService],
  controllers: [PropertyController],
  exports: [PropertyService, PropertyRepository],
})
export class PropertyModule { }
