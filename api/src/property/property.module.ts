import { Module } from '@nestjs/common';
import { DatabaseModule, Property, Evaluation } from '@common';
import { PropertyRepository } from './property.repository';
import { PropertyController } from './property.controller';
import { PropertyService } from './services/property.service';

@Module({
  imports: [DatabaseModule.forFeature([Property, Evaluation])],
  providers: [PropertyRepository, PropertyService],
  controllers: [PropertyController],
  exports: [PropertyService],
})
export class PropertyModule {}
