import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PropertyRepository } from '../property.repository';
import { Property } from '../../common/models/property.entity';
import { RealEstateItem } from '../../evaluations/interfaces/evaluations.ports';

type Paginated<T> = { items: T[]; total: number; page: number; limit: number };

type ExternalDoc = Partial<
  RealEstateItem & {
    latitude: number;
    longitude: number;
    totalValue: number;
    totalArea: number;
    garageSpots: number;
    contactLink: string;
    contactPhone: string;
    description: string;
  }
>;

function safeCoord(v: any, kind: 'lat' | 'lng'): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const abs = Math.abs(n);
  if (kind === 'lat') return abs <= 90 ? Number(n.toFixed(6)) : null;
  return abs <= 180 ? Number(n.toFixed(6)) : null;
}

@Injectable()
export class PropertyService {
  private readonly logger = new Logger(PropertyService.name);

  constructor(private readonly propertyRepo: PropertyRepository) { }

  private num(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  private int(v: any): number | null {
    const n = Number(v);
    return Number.isInteger(n) ? n : null;
  }
  private recalcUnitValue(totalValue?: number | null, totalArea?: number | null): number | null {
    if (totalValue == null || totalArea == null || totalArea === 0) return null;
    return Number(totalValue) / Number(totalArea);
  }

  async attachFromExternalDocs(evaluationId: string, docs: ExternalDoc[]): Promise<number> {
    if (!docs?.length) return 0;

    const norm = (v: any) => (v ?? '').toString().trim();

    const mapped: Partial<Property>[] = docs
      .map((d) => {
        const city = norm(d.city);
        const neighborhood = norm(d.neighborhood) || null;

        let address = norm(d.address);
        const url = (d.url as string) ?? (d as any).contactLink ?? null;
        if (!address && url) address = url;
        if (!address) address = 'N/D';

        const latitudeRaw =
          (typeof (d as any).latitude === 'number' ? (d as any).latitude : null) ??
          (typeof d.lat === 'number' ? d.lat : null);

        const longitudeRaw =
          (typeof (d as any).longitude === 'number' ? (d as any).longitude : null) ??
          (typeof d.lng === 'number' ? d.lng : null);

        const latitude = safeCoord(latitudeRaw, 'lat');
        const longitude = safeCoord(longitudeRaw, 'lng');

        const totalValue =
          typeof (d as any).totalValue === 'number' ? (d as any).totalValue :
            typeof d.price === 'number' ? d.price : null;

        const totalArea =
          typeof (d as any).totalArea === 'number' ? (d as any).totalArea :
            typeof d.area === 'number' ? d.area : null;

        const unitValue =
          typeof (d as any).unitValue === 'number'
            ? (d as any).unitValue
            : this.recalcUnitValue(totalValue, totalArea);

        const bedrooms = this.int(d.bedrooms);
        const bathrooms = this.int(d.bathrooms);
        const garageSpots =
          Number.isInteger((d as any).garageSpots as any)
            ? Number((d as any).garageSpots)
            : Number.isInteger((d as any).garage as any)
              ? Number((d as any).garage)
              : null;

        const contactLink = ((d as any).contactLink as string) ?? (d.url as string) ?? null;
        const contactPhone = ((d as any).contactPhone as string) ?? null;
        const description = ((d as any).description as string) ?? (d.title as string) ?? null;
        const images = Array.isArray(d.images) ? d.images : null;

        return {
          evaluation: { id: evaluationId } as any,
          city,
          neighborhood,
          address,
          latitude,
          longitude,
          ibgeIncome: null,
          bedrooms,
          bathrooms,
          garageSpots,
          totalArea,
          unitValue,
          totalValue,
          contactLink,
          contactPhone,
          description,
          images,
        } as Partial<Property>;
      })
      .filter((p) => (p.city ?? '').toString().trim() && (p.address ?? '').toString().trim());

    if (!mapped.length) return 0;

    return this.propertyRepo.insertManyDedup(evaluationId, mapped);
  }

  async listByEvaluation(
    userId: string | number,
    evaluationId: string,
    params?: { page?: number; limit?: number },
  ): Promise<Paginated<Property>> {
    const page = Math.max(1, Number(params?.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(params?.limit ?? 20)));
    const [items, total] = await this.propertyRepo.findAndCount({
      where: { evaluation: { id: evaluationId, user: { id: Number(userId) } } } as any,
      order: { createdAt: 'DESC' } as any,
      skip: (page - 1) * limit,
      take: limit,
      relations: { evaluation: { user: true } } as any,
    });
    return { items, total, page, limit };
  }

  async getOwned(userId: string | number, propertyId: string | number) {
    const prop = await this.propertyRepo.findOwned({ id: propertyId as any }, userId, {
      evaluation: true,
    } as any);
    if (!prop) throw new NotFoundException('Property not found');
    return prop;
  }

  async createManual(
    userId: string | number,
    evaluationId: string,
    data: Partial<Property>,
  ): Promise<Property> {
    const city = (data.city ?? '').toString().trim();
    const neighborhood = (data.neighborhood ?? '').toString().trim();
    const address = (data.address ?? '').toString().trim();
    if (!city || !neighborhood || !address) {
      throw new BadRequestException('city, neighborhood and address are required');
    }

    const totalValue = this.num(data.totalValue);
    const totalArea = this.num(data.totalArea);
    const unitValue =
      data.unitValue != null ? this.num(data.unitValue) : this.recalcUnitValue(totalValue, totalArea);

    const payload: Partial<Property> = {
      evaluation: { id: evaluationId } as any,
      city,
      neighborhood,
      address,
      latitude: this.num(data.latitude),
      longitude: this.num(data.longitude),
      ibgeIncome: this.num(data.ibgeIncome),
      bedrooms: this.int(data.bedrooms) ?? null,
      bathrooms: this.int(data.bathrooms) ?? null,
      garageSpots: this.int(data.garageSpots) ?? null,
      totalArea,
      unitValue,
      totalValue,
      contactLink: data.contactLink ?? null,
      contactPhone: data.contactPhone ?? null,
      description: data.description ?? null,
      images: Array.isArray(data.images) ? data.images : null,
    };

    const entity = new Property(payload as Partial<Property>);

    if ((this.propertyRepo as any).create) {
      return (this.propertyRepo as any).create(entity as Property);
    }
    if ((this.propertyRepo as any).save) {
      return (this.propertyRepo as any).save(entity as Property);
    }
    throw new Error('Repository does not support create/save');
  }

  async updateOwned(
    userId: string | number,
    propertyId: string | number,
    data: Partial<Property>,
  ): Promise<Property> {
    const prop = await this.getOwned(userId, propertyId);

    if (typeof data.city === 'string') prop.city = data.city.trim();
    if (typeof data.neighborhood === 'string') prop.neighborhood = data.neighborhood.trim();
    if (typeof data.address === 'string') prop.address = data.address.trim();

    if (typeof data.latitude !== 'undefined') prop.latitude = this.num(data.latitude);
    if (typeof data.longitude !== 'undefined') prop.longitude = this.num(data.longitude);

    if (typeof data.ibgeIncome !== 'undefined') prop.ibgeIncome = this.num(data.ibgeIncome);

    if (typeof data.bedrooms !== 'undefined') prop.bedrooms = this.int(data.bedrooms) ?? null;
    if (typeof data.bathrooms !== 'undefined') prop.bathrooms = this.int(data.bathrooms) ?? null;
    if (typeof data.garageSpots !== 'undefined') prop.garageSpots = this.int(data.garageSpots) ?? null;

    if (typeof data.totalArea !== 'undefined') prop.totalArea = this.num(data.totalArea);
    if (typeof data.totalValue !== 'undefined') prop.totalValue = this.num(data.totalValue);
    if (typeof data.unitValue !== 'undefined') {
      prop.unitValue = this.num(data.unitValue);
    } else {
      prop.unitValue = this.recalcUnitValue(prop.totalValue, prop.totalArea);
    }

    if (typeof data.contactLink !== 'undefined') prop.contactLink = data.contactLink ?? null;
    if (typeof data.contactPhone !== 'undefined') prop.contactPhone = data.contactPhone ?? null;
    if (typeof data.description !== 'undefined') prop.description = data.description ?? null;
    if (typeof data.images !== 'undefined') prop.images = Array.isArray(data.images) ? data.images : null;

    if ((this.propertyRepo as any).save) {
      return (this.propertyRepo as any).save(prop);
    }
    if ((this.propertyRepo as any).update) {
      await (this.propertyRepo as any).update({ id: prop.id } as any, prop);
      return this.getOwned(userId, propertyId);
    }
    return (this.propertyRepo as any).create(prop as Property);
  }

  async deleteOwned(userId: string | number, propertyId: string | number) {
    const prop = await this.getOwned(userId, propertyId);
    if ((this.propertyRepo as any).delete) {
      await (this.propertyRepo as any).delete({ id: prop.id } as any);
      return { ok: true };
    }
    if ((this.propertyRepo as any).remove) {
      await (this.propertyRepo as any).remove(prop);
      return { ok: true };
    }
    throw new Error('Repository does not support delete/remove');
  }

  async recalcUnitValueForProperty(userId: string | number, propertyId: string | number) {
    const prop = await this.getOwned(userId, propertyId);
    prop.unitValue = this.recalcUnitValue(prop.totalValue, prop.totalArea);
    if ((this.propertyRepo as any).save) return (this.propertyRepo as any).save(prop);
    if ((this.propertyRepo as any).update) {
      await (this.propertyRepo as any).update({ id: prop.id } as any, { unitValue: prop.unitValue });
      return this.getOwned(userId, propertyId);
    }
    return (this.propertyRepo as any).create(prop as Property);
  }

  async recalcUnitValuesForEvaluation(
    userId: string | number,
    evaluationId: string,
  ): Promise<{ updated: number }> {
    const { items } = await this.listByEvaluation(userId, evaluationId, { page: 1, limit: 1000 });
    let updated = 0;
    for (const p of items) {
      const newUv = this.recalcUnitValue(p.totalValue, p.totalArea);
      if (newUv !== p.unitValue) {
        p.unitValue = newUv;
        if ((this.propertyRepo as any).save) await (this.propertyRepo as any).save(p);
        else if ((this.propertyRepo as any).update)
          await (this.propertyRepo as any).update({ id: p.id } as any, { unitValue: p.unitValue });
        updated++;
      }
    }
    return { updated };
  }
}
