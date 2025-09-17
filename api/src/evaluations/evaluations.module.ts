import { Module } from '@nestjs/common';
import { EvaluationsService } from './services/evaluations.service';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsRepository } from './evaluations.repository';
import { DatabaseModule, Evaluation, Property } from '@common';
import { RealEstateModule } from 'src/real-estate/real-estate.module';

@Module({
  imports: [
    DatabaseModule.forFeature([Evaluation, Property]),
    RealEstateModule,
  ],
  controllers: [EvaluationsController],
  providers: [EvaluationsService, EvaluationsRepository],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
