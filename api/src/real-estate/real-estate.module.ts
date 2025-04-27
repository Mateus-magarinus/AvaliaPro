import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RealEstateRepository } from './real-estate.repository';
import { RealEstateSyncTask } from './tasks/real-estate‑sync.task';
import {
  MongoDatabaseModule,
  RealEstateDocument,
  RealEstateSchema,
} from '@common';
import { RealEstateService } from './real-estate.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    ScheduleModule.forRoot(),
    MongoDatabaseModule,
    MongoDatabaseModule.forFeature([
      { name: RealEstateDocument.name, schema: RealEstateSchema },
    ]),
  ],
  providers: [RealEstateService, RealEstateRepository, RealEstateSyncTask],
  exports: [RealEstateService],
})
export class RealEstateModule {}
