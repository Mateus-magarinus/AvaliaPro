import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Evaluation } from '../common/models/evaluation.entity';

import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './services/evaluations.service';
import { EvaluationsRepository } from './evaluations.repository';

import { PropertyModule } from '../property/property.module';
import { RealEstateModule } from '../real-estate/real-estate.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Evaluation]),
    PropertyModule,
    RealEstateModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [EvaluationsController],
  providers: [EvaluationsService, EvaluationsRepository],
  exports: [EvaluationsService, EvaluationsRepository],
})
export class EvaluationsModule { }
