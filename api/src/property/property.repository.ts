import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  EntityManager,
  FindManyOptions,
  FindOptionsWhere,
  FindOptionsRelations,
} from 'typeorm';
import { AbstractRepository, Property } from '@common';

@Injectable()
export class PropertyRepository extends AbstractRepository<Property> {
  protected readonly logger = new Logger(PropertyRepository.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    entityManager: EntityManager,
  ) {
    super(propertyRepository, entityManager);
  }

  async findMany(options: FindManyOptions<Property>) {
    return this.propertyRepository.find(options);
  }

  async findAndCount(options: FindManyOptions<Property>) {
    return this.propertyRepository.findAndCount(options);
  }

  async count(where?: FindOptionsWhere<Property>) {
    if (where) return this.propertyRepository.count({ where });
    return this.propertyRepository.count();
  }

  /**
   * Busca uma Property garantindo ownership via join: evaluation.user.id
   */
  async findOwned(
    where: FindOptionsWhere<Property>,
    userId: string | number,
    relations?: FindOptionsRelations<Property>,
  ) {
    const id = toIdNumber(userId);
    return this.findOne(
      { ...where, evaluation: { user: { id } } } as any,
      relations,
    );
  }
}

function toIdNumber(v: string | number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException('Invalid user id');
  return n;
}
