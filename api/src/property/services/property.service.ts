import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Evaluation, Property } from '@common';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { PropertyRepository } from '../property.repository';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

@Injectable()
export class PropertyService {
  constructor(
    private readonly propertyRepo: PropertyRepository,
    @InjectRepository(Evaluation)
    private readonly evaluationRepo: Repository<Evaluation>,
  ) {}

  // ---------- helpers ----------
  private toIdNumber(v: string | number): number {
    const n = Number(v);
    if (!Number.isFinite(n)) throw new BadRequestException('Invalid id');
    return n;
  }
  private round2(n: number | null | undefined): number | null {
    if (n == null) return null;
    return Math.round(n * 100) / 100;
  }
  private ensureAddressFallback(p: Partial<Property>) {
    if (!p.address || !p.address.trim()) {
      p.address = p.contactLink || 'N/D';
    }
  }

  private async assertEvaluationOwnership(
    evaluationId: string,
    userId: string,
  ) {
    const eid = this.toIdNumber(evaluationId);
    const uid = this.toIdNumber(userId);
    const ev = await this.evaluationRepo.findOne({
      where: { id: eid as any, user: { id: uid } as any },
    });
    if (!ev) throw new NotFoundException('Evaluation not found or not owned.');
    return ev;
  }

  // ---------- CRUD ----------
  async createOne(userId: string, dto: CreatePropertyDto) {
    const ev = await this.assertEvaluationOwnership(dto.evaluationId, userId);

    const entity = new Property({
      evaluation: ev,
      city: dto.city.trim(),
      neighborhood: dto.neighborhood?.trim() ?? null,
      address: (dto.address ?? '').trim(),
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      ibgeIncome: dto.ibgeIncome ?? null,
      bedrooms: dto.bedrooms ?? null,
      bathrooms: dto.bathrooms ?? null,
      garageSpots: dto.garageSpots ?? null,
      totalArea: dto.totalArea ?? null,
      totalValue: dto.totalValue ?? null,
      unitValue: dto.unitValue ?? null,
      contactLink: dto.contactLink ?? null,
      contactPhone: dto.contactPhone ?? null,
      description: dto.description ?? null,
      images: dto.images?.length ? dto.images : null,
    }) as Partial<Property>;

    this.ensureAddressFallback(entity);

    return this.propertyRepo.create(entity as any);
  }

  async getOne(propertyId: string, userId: string) {
    return this.propertyRepo.findOwned(
      { id: this.toIdNumber(propertyId) } as any,
      userId,
    );
  }

  async updateOne(propertyId: string, userId: string, dto: UpdatePropertyDto) {
    // garante ownership
    await this.getOne(propertyId, userId);

    const patch: Partial<Property> = {};
    if (dto.city !== undefined) patch.city = dto.city.trim();
    if (dto.neighborhood !== undefined)
      patch.neighborhood = dto.neighborhood?.trim() ?? null;
    if (dto.address !== undefined) patch.address = dto.address?.trim() ?? null;
    if (dto.latitude !== undefined) patch.latitude = dto.latitude ?? null;
    if (dto.longitude !== undefined) patch.longitude = dto.longitude ?? null;
    if (dto.ibgeIncome !== undefined) patch.ibgeIncome = dto.ibgeIncome ?? null;
    if (dto.bedrooms !== undefined) patch.bedrooms = dto.bedrooms ?? null;
    if (dto.bathrooms !== undefined) patch.bathrooms = dto.bathrooms ?? null;
    if (dto.garageSpots !== undefined)
      patch.garageSpots = dto.garageSpots ?? null;
    if (dto.totalArea !== undefined) patch.totalArea = dto.totalArea ?? null;
    if (dto.totalValue !== undefined) patch.totalValue = dto.totalValue ?? null;
    if (dto.unitValue !== undefined) patch.unitValue = dto.unitValue ?? null;
    if (dto.contactLink !== undefined)
      patch.contactLink = dto.contactLink ?? null;
    if (dto.contactPhone !== undefined)
      patch.contactPhone = dto.contactPhone ?? null;
    if (dto.description !== undefined)
      patch.description = dto.description ?? null;
    if (dto.images !== undefined)
      patch.images = dto.images?.length ? dto.images : null;

    this.ensureAddressFallback(patch);

    return this.propertyRepo.findOneAndUpdate(
      { id: this.toIdNumber(propertyId) } as any,
      patch as any,
    );
  }

  async deleteOne(propertyId: string, userId: string) {
    await this.getOne(propertyId, userId);
    await this.propertyRepo.findOneAndDelete({
      id: this.toIdNumber(propertyId),
    } as any);
    return { deleted: true };
  }

  // ---------- LIST ----------
  async list(
    userId: string,
    q: {
      evaluationId: string;
      page?: number;
      limit?: number;
      sort?:
        | 'totalValue'
        | 'totalArea'
        | 'unitValue'
        | 'bedrooms'
        | 'bathrooms';
      order?: 'asc' | 'desc';
      city?: string;
      neighborhood?: string;
      bedrooms?: number;
      bathrooms?: number;
      garageSpots?: number;
      totalValueMin?: number;
      totalValueMax?: number;
      totalAreaMin?: number;
      totalAreaMax?: number;
      unitValueMin?: number;
      unitValueMax?: number;
    },
  ) {
    if (!q?.evaluationId)
      throw new BadRequestException('evaluationId is required');
    const ev = await this.assertEvaluationOwnership(q.evaluationId, userId);

    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(q.limit ?? 20)));
    const orderCol = q.sort ?? 'totalValue';
    const orderDir = (q.order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';

    const where: any = { evaluation: { id: ev.id } };

    if (q.city) where.city = q.city;
    if (q.neighborhood) where.neighborhood = q.neighborhood;
    if (Number.isFinite(q.bedrooms as number)) where.bedrooms = q.bedrooms;
    if (Number.isFinite(q.bathrooms as number)) where.bathrooms = q.bathrooms;
    if (Number.isFinite(q.garageSpots as number))
      where.garageSpots = q.garageSpots;

    // ranges
    const {
      totalValueMin,
      totalValueMax,
      totalAreaMin,
      totalAreaMax,
      unitValueMin,
      unitValueMax,
    } = q;

    if (Number.isFinite(totalValueMin) && Number.isFinite(totalValueMax)) {
      where.totalValue = Between(totalValueMin!, totalValueMax!);
    } else if (Number.isFinite(totalValueMin)) {
      where.totalValue = MoreThanOrEqual(totalValueMin!);
    } else if (Number.isFinite(totalValueMax)) {
      where.totalValue = LessThanOrEqual(totalValueMax!);
    }

    if (Number.isFinite(totalAreaMin) && Number.isFinite(totalAreaMax)) {
      where.totalArea = Between(totalAreaMin!, totalAreaMax!);
    } else if (Number.isFinite(totalAreaMin)) {
      where.totalArea = MoreThanOrEqual(totalAreaMin!);
    } else if (Number.isFinite(totalAreaMax)) {
      where.totalArea = LessThanOrEqual(totalAreaMax!);
    }

    if (Number.isFinite(unitValueMin) && Number.isFinite(unitValueMax)) {
      where.unitValue = Between(unitValueMin!, unitValueMax!);
    } else if (Number.isFinite(unitValueMin)) {
      where.unitValue = MoreThanOrEqual(unitValueMin!);
    } else if (Number.isFinite(unitValueMax)) {
      where.unitValue = LessThanOrEqual(unitValueMax!);
    }

    const [items, total] = await this.propertyRepo.findAndCount({
      where,
      order: { [orderCol]: orderDir } as any,
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  // ---------- UTIL EXTRA ----------
  async recalcUnitValuesForEvaluation(evaluationId: string, userId: string) {
    const ev = await this.assertEvaluationOwnership(evaluationId, userId);
    const list = await this.propertyRepo.findMany({
      where: { evaluation: { id: ev.id } as any },
      select: ['id', 'totalArea', 'totalValue', 'unitValue'],
    });

    let updated = 0;
    for (const p of list) {
      const patch: Partial<Property> = {};
      if (!Number.isFinite(p.unitValue as any)) {
        const total = Number(p.totalValue);
        const area = Number(p.totalArea);
        if (Number.isFinite(total) && Number.isFinite(area) && area > 0) {
          patch.unitValue = this.round2(total / area);
          await this.propertyRepo.findOneAndUpdate(
            { id: p.id } as any,
            patch as any,
          );
          updated++;
        }
      }
    }
    return { updated, processed: list.length };
  }
}
