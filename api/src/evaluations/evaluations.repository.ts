import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AbstractRepository, Evaluation } from 'src/common';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class EvaluationsRepository extends AbstractRepository<Evaluation> {
  protected readonly logger = new Logger(EvaluationsRepository.name);

  constructor(
    @InjectRepository(Evaluation)
    evaluationsRepository: Repository<Evaluation>,
    entityManager: EntityManager,
  ) {
    super(evaluationsRepository, entityManager);
  }
}
