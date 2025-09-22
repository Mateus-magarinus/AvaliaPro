import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RealEstateRepository } from './real-estate.repository';
import {
  MongoDatabaseModule,
  RealEstateDocument,
  RealEstateSchema,
} from '@common';
import { RealEstateService } from './real-estate.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RealEstateController } from './real-estate.controller';
import { REAL_ESTATE_SEARCH_PORT } from 'src/evaluations/interfaces/evaluations.ports';
import { MongoRealEstateSearchAdapter } from './adapters/mongo-real-estate-search.adapter';
import { ColigadasMapper } from './providers/coligadas/coligadas.mapper';
import { ColigadasClient } from './providers/coligadas/coligadas.client';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (cfg: ConfigService) => ({
        timeout: cfg.get<number>('API_COLIGADAS_TIMEOUT_MS') ?? 10000,
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),
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
    {
      provide: REAL_ESTATE_SEARCH_PORT,
      useClass: MongoRealEstateSearchAdapter,
    },
    ColigadasClient,
    ColigadasMapper,
  ],
  controllers: [RealEstateController],
  exports: [RealEstateService, REAL_ESTATE_SEARCH_PORT],
})
export class RealEstateModule {}
