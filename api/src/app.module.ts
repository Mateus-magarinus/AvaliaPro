import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from '@common';
import { UsersModule } from './auth/users/users.module';
import { RealEstateModule } from './real-estate/real-estate.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { PropertyModule } from './property/property.module';

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

        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION: Joi.string().required(),

        API_IMOVEIS_LIST: Joi.string().required(),
        API_IMOVEL_DETAIL: Joi.string().required(),

        API_COLIGADAS_TIMEOUT_MS: Joi.number().default(10000),
      }),
      validationOptions: { abortEarly: false },
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    RealEstateModule,
    EvaluationsModule,
    PropertyModule,
  ],
})
export class AppModule {}
