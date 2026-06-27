import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  EntityManager,
  FindManyOptions,
  FindOptionsWhere,
  FindOptionsRelations,
} from 'typeorm';
import { AbstractRepository, Evaluation } from '@common';
import { toIdNumber } from './helpers/evaluations.helpers';

@Injectable()
export class EvaluationsRepository extends AbstractRepository<Evaluation> {
  protected readonly logger = new Logger(EvaluationsRepository.name);

  constructor(
    @InjectRepository(Evaluation)
    private readonly evaluationsOrmRepo: Repository<Evaluation>, // <— guardamos para os utilitários
    entityManager: EntityManager,
  ) {
    super(evaluationsOrmRepo, entityManager);
  }

  /** find + opções completas (where/order/relations/paginação) */
  async findMany(options: FindManyOptions<Evaluation>): Promise<Evaluation[]> {
    return this.evaluationsOrmRepo.find(options);
  }

  /** findAndCount para paginação */
  async findAndCount(
    options: FindManyOptions<Evaluation>,
  ): Promise<[Evaluation[], number]> {
    return this.evaluationsOrmRepo.findAndCount(options);
  }

  /** count simples (com where opcional) */
  async count(where?: FindOptionsWhere<Evaluation>): Promise<number> {
    if (where) return this.evaluationsOrmRepo.count({ where });
    return this.evaluationsOrmRepo.count();
  }

  /**
   * Remove todas as avaliações de um usuário (e, por cascata de FK,
   * as propriedades vinculadas). Usado ao excluir a conta.
   */
  async deleteByUser(userId: number): Promise<void> {
    await this.evaluationsOrmRepo.delete({ user: { id: userId } } as any);
  }

  /**
   * Helper: busca uma Evaluation garantindo ownership (user.id).
   * Aceita relations opcionais.
   */
  async findOwned(
    where: FindOptionsWhere<Evaluation>,
    userId: string | number,
    relations?: FindOptionsRelations<Evaluation>,
  ): Promise<Evaluation> {
    const ownerId = toIdNumber(userId);
    // mescla o filtro recebido com o owner
    const ownedWhere = {
      ...where,
      user: { id: ownerId } as any,
    } as FindOptionsWhere<Evaluation>;

    return this.findOne(ownedWhere, relations);
  }
}
