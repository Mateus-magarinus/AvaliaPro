import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AbstractRepository, Property } from 'src/common';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class PropertyRepository extends AbstractRepository<Property> {
  protected readonly logger = new Logger(PropertyRepository.name);

  constructor(
    @InjectRepository(Property)
    propertyRepository: Repository<Property>,
    entityManager: EntityManager,
  ) {
    super(propertyRepository, entityManager);
  }
}
