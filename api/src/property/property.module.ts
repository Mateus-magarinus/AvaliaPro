import { Module } from '@nestjs/common';
import { DatabaseModule, Property } from '@common';
import { PropertyRepository } from './property.repository';

@Module({
  imports: [DatabaseModule, DatabaseModule.forFeature([Property])],
  controllers: [],
  providers: [PropertyRepository],
  exports: [],
})
export class PropertyModule {}
