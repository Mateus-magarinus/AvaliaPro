import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule, Property, Evaluation } from '@common';
import { PropertyRepository } from './property.repository';
import { PropertyController } from './property.controller';
import { PropertyService } from './services/property.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    DatabaseModule.forFeature([Property, Evaluation]),
    forwardRef(() => AuthModule),
  ],
  providers: [PropertyRepository, PropertyService],
  controllers: [PropertyController],
  exports: [PropertyService],
})
export class PropertyModule { }
