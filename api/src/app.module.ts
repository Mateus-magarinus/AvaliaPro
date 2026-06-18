import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from '@common';
import { UsersModule } from './auth/users/users.module';
import { RealEstateModule } from './real-estate/real-estate.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { PropertyModule } from './property/property.module';
import { PlansModule } from './plans/plans.module';
import { AdminModule } from './admin/admin.module';
import { CacheModule } from './cache/cache.module';
import { IbgeModule } from './ibge/ibge.module';
import { CensusModule } from './census/census.module';
import { GeoModule } from './geo/geo.module';
import { ColumnPreferencesModule } from './column-preferences/column-preferences.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        HTTP_PORT: Joi.number().required(),

        DATABASE_HOST: Joi.string().required(),
        DATABASE_PORT: Joi.number().required(),
        DATABASE_USER: Joi.string().required(),
        DATABASE_PASSWORD: Joi.string().required(),
        DATABASE_NAME: Joi.string().required(),
        DATABASE_SYNC: Joi.boolean().required(),
        DATABASE_LOGGING: Joi.boolean().required(),

        MONGODB_URI: Joi.string().uri().required(),

        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRATION: Joi.number().required(),

        API_IMOVEIS_LIST: Joi.string().required(),
        API_IMOVEL_DETAIL: Joi.string().required(),

        API_COLIGADAS_TIMEOUT_MS: Joi.number().default(10000),
        API_COLIGADAS_CONCURRENCY: Joi.number().default(6),

        REDIS_URL: Joi.string().uri().optional().allow(''),

        IBGE_AGREGADO: Joi.number().default(1685),
        IBGE_VARIAVEL: Joi.number().default(10143),
        IBGE_TIMEOUT_MS: Joi.number().default(8000),
        IBGE_CACHE_TTL_DAYS: Joi.number().default(30),

        CENSUS_DATA_PATH: Joi.string().optional().allow(''),

        OVERPASS_URL: Joi.string()
          .uri()
          .default('https://overpass-api.de/api/interpreter'),
        OVERPASS_TIMEOUT_MS: Joi.number().default(15000),
        GEO_CACHE_TTL_HOURS: Joi.number().default(24),
      }),
      validationOptions: { abortEarly: false },
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    RealEstateModule,
    EvaluationsModule,
    PropertyModule,
    PlansModule,
    AdminModule,
    CacheModule,
    IbgeModule,
    CensusModule,
    GeoModule,
    ColumnPreferencesModule,
  ],
})
export class AppModule {}
