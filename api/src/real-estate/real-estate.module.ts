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
import { RealEstateController } from './real-estate.controller';
import { REAL_ESTATE_SEARCH_PORT } from 'src/evaluations/interfaces/evaluations.ports';
import { MongoRealEstateSearchAdapter } from './adapters/mongo-real-estate-search.adapter';

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
  providers: [
    RealEstateService,
    RealEstateRepository,
    RealEstateSyncTask,
    {
      provide: REAL_ESTATE_SEARCH_PORT,
      useClass: MongoRealEstateSearchAdapter,
    },
  ],
  controllers: [RealEstateController],
  exports: [RealEstateService, REAL_ESTATE_SEARCH_PORT],
})
export class RealEstateModule {}
