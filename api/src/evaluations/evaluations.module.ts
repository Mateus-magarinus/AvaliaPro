import { Module } from '@nestjs/common';
import { EvaluationsService } from './services/evaluations.service';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsRepository } from './evaluations.repository';
import { DatabaseModule, Evaluation, Property } from '@common';

@Module({
  imports: [DatabaseModule.forFeature([Evaluation, Property])],
  controllers: [EvaluationsController],
  providers: [EvaluationsService, EvaluationsRepository],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
