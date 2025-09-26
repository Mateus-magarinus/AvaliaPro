import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeepPartial,
  EntityManager,
  FindManyOptions,
  FindOptionsRelations,
  FindOptionsWhere,
  Repository,
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

  private num(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private safeCoord(v: any, kind: 'lat' | 'lng'): number | null {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    const abs = Math.abs(n);
    if (kind === 'lat') return abs <= 90 ? Number(n.toFixed(6)) : null;
    return abs <= 180 ? Number(n.toFixed(6)) : null;
  }

  async insertManyDedup(
    evaluationId: string | number,
    items: Partial<Property>[],
  ): Promise<number> {
    if (!items?.length) return 0;

    const evalIdNum = Number(evaluationId);
    if (!Number.isFinite(evalIdNum)) {
      throw new BadRequestException('Invalid evaluation id');
    }

    const meta = this.propertyRepository.metadata;
    const rel = meta.findRelationWithPropertyPath('evaluation');
    const fkDbCol = rel?.joinColumns?.[0]?.databaseName ?? 'evaluationId';
    const targetEntity = meta.target;

    this.logger.debug(
      `insertManyDedup: evalId=${evalIdNum}, table=${meta.tableName}, fkDbCol=${fkDbCol}`,
    );

    const prepared = items
      .map((it) => {
        const address =
          String(it.address ?? '').trim() ||
          String((it as any).contactLink ?? '').trim() ||
          'N/D';
        const city = String(it.city ?? '').trim();
        const neighborhood =
          typeof it.neighborhood === 'string'
            ? it.neighborhood.trim() || null
            : (it.neighborhood as any) ?? null;

        return {
          ...it,
          address,
          city,
          neighborhood,
          latitude: this.safeCoord((it as any).latitude, 'lat'),
          longitude: this.safeCoord((it as any).longitude, 'lng'),
          totalArea: this.num((it as any).totalArea),
          totalValue: this.num((it as any).totalValue),
          unitValue: this.num((it as any).unitValue),
          bedrooms:
            typeof (it as any).bedrooms === 'number'
              ? (it as any).bedrooms
              : Number.isInteger((it as any).bedrooms)
                ? Number((it as any).bedrooms)
                : null,
          bathrooms:
            typeof (it as any).bathrooms === 'number'
              ? (it as any).bathrooms
              : Number.isInteger((it as any).bathrooms)
                ? Number((it as any).bathrooms)
                : null,
          garageSpots:
            typeof (it as any).garageSpots === 'number'
              ? (it as any).garageSpots
              : Number.isInteger((it as any).garageSpots)
                ? Number((it as any).garageSpots)
                : null,
        } as Partial<Property>;
      })
      .filter((it) => it.city && it.address);

    if (!prepared.length) return 0;

    const keyOf = (i: Partial<Property>) =>
      `${String(i.city).toLowerCase()}|${String(i.neighborhood ?? '').toLowerCase()}|${String(i.address).toLowerCase()}|${(i as any).totalValue ?? ''}`;
    const uniq = new Map<string, any>();
    for (const it of prepared) {
      const k = keyOf(it);
      if (!uniq.has(k)) uniq.set(k, it);
    }
    const deduped = Array.from(uniq.values());
    this.logger.debug(
      `insertManyDedup: incoming=${items.length} prepared=${prepared.length} deduped=${deduped.length}`,
    );
    if (!deduped.length) return 0;

    const filtered: any[] = [];
    for (const it of deduped) {
      const exists = await this.propertyRepository
        .createQueryBuilder('p')
        .select('1')
        .where(`p."${fkDbCol}" = :evaluationId`, { evaluationId: evalIdNum })
        .andWhere('LOWER(p.address) = LOWER(:addr)', { addr: it.address })
        .andWhere('LOWER(p.city) = LOWER(:city)', { city: it.city })
        .andWhere(`p.neighborhood IS NOT DISTINCT FROM :neighborhood`, {
          neighborhood: it.neighborhood ?? null,
        })
        .andWhere(`p."totalValue" IS NOT DISTINCT FROM :totalValue`, {
          totalValue: (it as any).totalValue ?? null,
        })
        .limit(1)
        .getRawOne();

      if (!exists) filtered.push(it);
    }
    this.logger.debug(`insertManyDedup: toInsert=${filtered.length}`);
    if (!filtered.length) return 0;

    const values = filtered.map((it) => ({
      ...it,
      evaluation: { id: evalIdNum } as any,
    }));

    let inserted = 0;
    try {
      const chunk = 500;
      for (let i = 0; i < values.length; i += chunk) {
        const slice = values.slice(i, i + chunk);
        const res = await this.propertyRepository
          .createQueryBuilder()
          .insert()
          .into(Property)
          .values(slice)
          .execute();
        inserted += res.identifiers?.length ?? slice.length;
      }
      this.logger.debug(`insertManyDedup: inserted=${inserted}`);
      if (inserted > 0) return inserted;
    } catch (e) {
      this.logger.error(`insertManyDedup insert() failed — will fallback to save(): ${e?.message}`);
    }

    try {
      const entities = values.map((v) => this.propertyRepository.create(v));
      const chunkSize = 200;
      let saved = 0;
      for (let i = 0; i < entities.length; i += chunkSize) {
        const slice = entities.slice(i, i + chunkSize) as DeepPartial<Property>[];
        const res = await this.propertyRepository.save(slice);
        saved += res.length;
      }
      this.logger.debug(`insertManyDedup fallback save(): saved=${saved}`);
      return saved;
    } catch (e) {
      this.logger.error(`insertManyDedup fallback save() failed: ${e?.message}`);
      throw e;
    }
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
