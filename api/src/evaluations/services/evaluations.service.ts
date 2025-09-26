import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ILike, FindManyOptions, FindOptionsRelations, FindOptionsWhere } from 'typeorm';
import { CreateEvaluationDto } from '../dto/create-evaluation.dto';
import { UpdateEvaluationDto } from '../dto/update-evaluation.dto';
import { EvaluationsRepository } from '../evaluations.repository';
import { PropertyService } from '../../property/services/property.service';
import { Evaluation } from '../../common/models/evaluation.entity';
import {
  REAL_ESTATE_SEARCH_PORT,
  RealEstateItem,
  RealEstateSearchFilters,
  RealEstateSearchPort,
} from '../interfaces/evaluations.ports';

type Paginated<T> = { items: T[]; total: number; page: number; limit: number };

@Injectable()
export class EvaluationsService {
  private static readonly MAX_SAMPLE = 60;

  constructor(
    private readonly evaluationsRepo: EvaluationsRepository,
    private readonly propertiesService: PropertyService,
    @Inject(REAL_ESTATE_SEARCH_PORT) private readonly realEstate: RealEstateSearchPort,
  ) { }

  async createWithPreview(dto: CreateEvaluationDto, userId: string | number) {
    if (!dto?.filters) throw new BadRequestException('filters are required');

    const sampleLimitReq = Number(dto.options?.previewSampleLimit ?? 10);
    const sampleLimit = Math.min(EvaluationsService.MAX_SAMPLE, Math.max(0, sampleLimitReq));
    const total = await this.countByFilters(dto.filters);
    const sample = sampleLimit ? await this.findMany(dto.filters, { limit: sampleLimit }) : undefined;

    if (dto.options?.previewOnly) {
      return { preview: { total, sample, sampleLimit } };
    }

    const f = dto.filters || {};
    const mapped = this.mapFiltersToEntityFields(f);
    if (!mapped.city) throw new BadRequestException('filters.city is required to create an Evaluation');

    const evaluation = await this.evaluationsRepo.create(
      new Evaluation({
        name: dto.name,
        description: dto.description ?? null,
        status: 'draft',
        filters: f,
        ...mapped,
        user: { id: this.toIdNumber(userId) } as any,
      } as Partial<Evaluation>),
    );

    const attachTarget = Math.min(EvaluationsService.MAX_SAMPLE, Math.max(0, Number(total)));

    let attached = 0;
    if (attachTarget > 0) {
      const oversample = Math.min(Math.max(attachTarget * 3, attachTarget), 200);
      const docs = await this.findMany(f, { limit: oversample });
      attached = await this.propertiesService.attachFromExternalDocs(String(evaluation.id), docs as any);
    }

    return {
      evaluationId: evaluation.id,
      preview: { total, sample, sampleLimit },
      attached,
    };
  }

  async preview(filters: RealEstateSearchFilters, limit = 10) {
    if (!filters) throw new BadRequestException('filters are required');

    const effLimit = Math.min(EvaluationsService.MAX_SAMPLE, Number(limit) || EvaluationsService.MAX_SAMPLE);

    const total = await this.countByFilters(filters);
    const sample = effLimit ? await this.findMany(filters, { limit: effLimit }) : undefined;
    return { total, sample, sampleLimit: effLimit };
  }

  async listMy(
    userId: string | number,
    params?: { page?: number; limit?: number; status?: 'draft' | 'confirmed' | 'archived'; q?: string },
  ): Promise<Paginated<Evaluation>> {
    const page = Math.max(1, Number(params?.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(params?.limit ?? 20)));
    const whereBase: FindOptionsWhere<Evaluation> = { user: { id: this.toIdNumber(userId) } as any };

    const like = params?.q?.trim();
    const where: FindOptionsWhere<Evaluation> | FindOptionsWhere<Evaluation>[] = like
      ? [
        { ...whereBase, name: ILike(`%${like}%`) } as any,
        { ...whereBase, description: ILike(`%${like}%`) } as any,
        { ...whereBase, city: ILike(`%${like}%`) } as any,
      ]
      : whereBase;

    if (params?.status) {
      if (Array.isArray(where)) where.forEach((w: any) => (w.status = params.status));
      else (where as any).status = params.status;
    }

    const findOptions: FindManyOptions<Evaluation> = {
      where,
      order: { createdAt: 'DESC' } as any,
      skip: (page - 1) * limit,
      take: limit,
    };

    const [items, total] = await this.evaluationsRepo.findAndCount(findOptions);
    return { items, total, page, limit };
  }

  async getMyById(
    userId: string | number,
    evaluationId: string | number,
    withProperties = false,
  ): Promise<Evaluation> {
    const id = this.toIdNumber(evaluationId);
    const relations: FindOptionsRelations<Evaluation> | undefined = withProperties
      ? ({ properties: true, user: true } as any)
      : ({ user: true } as any);

    const evaluation = await this.evaluationsRepo.findOne(
      { id, user: { id: this.toIdNumber(userId) } } as any,
      relations,
    );
    if (!evaluation) throw new NotFoundException('Evaluation not found');
    return evaluation;
  }

  async updateMy(
    userId: string | number,
    evaluationId: string | number,
    dto: UpdateEvaluationDto,
  ): Promise<Evaluation> {
    const evaluation = await this.getMyById(userId, evaluationId);

    if (typeof (dto as any).name === 'string') evaluation.name = (dto as any).name;
    if (typeof (dto as any).description !== 'undefined')
      evaluation.description = (dto as any).description ?? null;

    if ((dto as any).filters) {
      const f = (dto as any).filters as RealEstateSearchFilters;
      evaluation.filters = f;
      const mapped = this.mapFiltersToEntityFields(f);
      if (!mapped.city) {
        throw new BadRequestException('filters.city is required to update an Evaluation');
      }
      Object.assign(evaluation, mapped);
    }

    if ((this.evaluationsRepo as any).save) {
      return (this.evaluationsRepo as any).save(evaluation);
    }
    if ((this.evaluationsRepo as any).update) {
      await (this.evaluationsRepo as any).update({ id: evaluation.id } as any, evaluation);
      return this.getMyById(userId, evaluationId);
    }
    return (this.evaluationsRepo as any).create(evaluation as Evaluation);
  }

  async confirmMy(userId: string | number, evaluationId: string | number) {
    const evaluation = await this.getMyById(userId, evaluationId);
    evaluation.status = 'confirmed';

    if ((this.evaluationsRepo as any).save) {
      return (this.evaluationsRepo as any).save(evaluation);
    }
    if ((this.evaluationsRepo as any).update) {
      await (this.evaluationsRepo as any).update({ id: evaluation.id } as any, { status: 'confirmed' });
      return this.getMyById(userId, evaluationId);
    }
    return (this.evaluationsRepo as any).create(evaluation as Evaluation);
  }

  async archiveMy(userId: string | number, evaluationId: string | number) {
    const evaluation = await this.getMyById(userId, evaluationId);
    evaluation.status = 'archived';

    if ((this.evaluationsRepo as any).save) {
      return (this.evaluationsRepo as any).save(evaluation);
    }
    if ((this.evaluationsRepo as any).update) {
      await (this.evaluationsRepo as any).update({ id: evaluation.id } as any, { status: 'archived' });
      return { ok: true };
    }
    await (this.evaluationsRepo as any).create(evaluation as Evaluation);
    return { ok: true };
  }

  private toIdNumber(v: string | number): number {
    const n = Number(v);
    if (!Number.isFinite(n)) throw new BadRequestException('Invalid user id');
    return n;
  }

  private numOrNull(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private intOrNull(v: any): number | null {
    const n = Number(v);
    return Number.isInteger(n) ? n : null;
  }

  private mapFiltersToEntityFields(f: RealEstateSearchFilters): Partial<Evaluation> {
    const city =
      typeof f.city === 'string' && f.city.trim() ? f.city.trim() : null;
    const state =
      typeof (f as any).state === 'string' && (f as any).state.trim()
        ? (f as any).state.trim()
        : 'RS';

    const typesArr = Array.isArray((f as any).types) ? (f as any).types : [];
    const propertyType =
      (typesArr.find(t => typeof t === 'string' && t.trim())?.trim()) ??
      (typeof (f as any).propertyType === 'string' ? (f as any).propertyType : undefined) ??
      (typeof (f as any).type === 'string' ? (f as any).type : null);

    return {
      city: city as any,
      state: state as any,
      propertyType: (propertyType ?? null) as any,
      bedrooms: this.intOrNull((f as any).bedrooms),
      bathrooms: this.intOrNull((f as any).bathrooms),
      priceMin: this.numOrNull((f as any).minPrice),
      garage: this.intOrNull((f as any).garage),
      priceMax: this.numOrNull((f as any).maxPrice),
      areaMin: this.numOrNull((f as any).minArea),
      areaMax: this.numOrNull((f as any).maxArea),
    } as Partial<Evaluation>;
  }

  private async countByFilters(filters: RealEstateSearchFilters): Promise<number> {
    const { total } = await this.realEstate.count(filters);
    return total;
  }

  private async findMany(
    filters: RealEstateSearchFilters,
    options?: { limit?: number; offset?: number },
  ): Promise<RealEstateItem[]> {
    const limit = Math.max(1, Number(options?.limit ?? 10));
    const offset = Math.max(0, Number(options?.offset ?? 0));
    const page = Math.floor(offset / limit) + 1;

    const { items } = await this.realEstate.search(filters, {
      page,
      limit,
      sort: 'recent',
    });
    return items;
  }
}
