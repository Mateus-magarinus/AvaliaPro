import {
  Repository,
  FindOptionsWhere,
  EntityManager,
  FindOptionsRelations,
} from 'typeorm';
import { Logger, NotFoundException } from '@nestjs/common';
import { AbstractEntity } from './abstract.entity';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export abstract class AbstractRepository<T extends AbstractEntity<T>> {
  protected abstract readonly logger: Logger;

  constructor(
    private readonly itemsRepository: Repository<T>,
    private readonly entityManager: EntityManager,
  ) {}

  async findOne(
    where: FindOptionsWhere<T>,
    relations?: FindOptionsRelations<T>,
  ): Promise<T> {
    const entity = await this.itemsRepository.findOne({ where, relations });

    if (!entity) {
      this.logger.warn('Document not found with where', where);
      throw new NotFoundException('Entity not found.');
    }

    return entity;
  }

  async create(entity: T): Promise<T> {
    return this.entityManager.save(entity);
  }

  async findOneAndUpdate(
    where: FindOptionsWhere<T>,
    partialEntity: QueryDeepPartialEntity<T>,
  ) {
    const updateResult = await this.itemsRepository.update(
      where,
      partialEntity,
    );

    if (!updateResult.affected) {
      this.logger.warn('Entity not found with where', where);
      throw new NotFoundException('Entity not found.');
    }

    return this.findOne(where);
  }

  async find(where: FindOptionsWhere<T>) {
    return this.itemsRepository.findBy(where);
  }

  async findOneAndDelete(where: FindOptionsWhere<T>) {
    const entity = await this.findOne(where);
    await this.itemsRepository.delete(where);
    return entity;
  }
}
