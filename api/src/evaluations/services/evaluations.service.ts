import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EvaluationsRepository } from '../evaluations.repository';
import { Evaluation, Property } from '@common';
import { CreateEvaluationDto } from '../dto/create-evaluation.dto';
import { UpdateEvaluationDto } from '../dto/update-evaluation.dto';
import {
  basicStats,
  coord,
  firstMoney,
  firstNum,
  isFiniteNumber,
  money,
  numKey,
  pickStats,
  toFixed2,
  toIdNumber,
  toInt,
  toNum,
} from '../helpers';

// Se tiver o tipo exportado do módulo Mongo, importe-o.
// Aqui deixo uma interface mínima com os campos usados.
type RealEstateDoc = {
  ID: number;
  Cidade?: string;
  UF?: string;
  Bairro?: string;
  Endereco?: string;
  Numero?: string;
  Latitude?: string;
  Longitude?: string;
  Garagem?: string;
  Banheiros?: string;
  Suites?: string;
  Tipo?: { Dormitorios?: number; Valor?: string }[];
  ValorDe?: string;
  URL?: string;
  Link?: string;
  CelularImob?: string;
  Descricao?: { Titulo?: string; Texto?: string }[];
  Fotos?: {
    Foto_Grande?: string;
    Foto_Media?: string;
    Foto_Pequena?: string;
  }[];
};

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);

  constructor(
    private readonly repo: EvaluationsRepository,
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
  ) {}

  /** Cria uma Evaluation “enxuta”, conforme tuas colunas atuais. */
  async create(userId: string, dto: CreateEvaluationDto): Promise<Evaluation> {
    const ev = new Evaluation({
      user: { id: toIdNumber(userId) } as any,
      name: dto.name.trim(),
      propertyType: dto.propertyType ?? null,
      city: dto.city.trim(),
      state: (dto.state ?? 'RS').trim().toUpperCase(),
      neighborhood: dto.neighborhood ?? null,
      bedrooms: toInt(dto.bedrooms),
      garage: toInt(dto.garage),
      bathrooms: toInt(dto.bathrooms),
      priceMin: toFixed2(dto.priceMin),
      priceMax: toFixed2(dto.priceMax),
      areaMin: toFixed2(dto.areaMin),
      areaMax: toFixed2(dto.areaMax),
      adType: dto.adType ?? null,
    } as Partial<Evaluation>);

    return this.repo.create(ev);
  }

  /** Atualiza parcialmente; restringe por ownership. */
  async update(
    evaluationId: string,
    userId: string,
    dto: UpdateEvaluationDto,
  ): Promise<Evaluation> {
    const patch: any = {};
    if (dto.name) patch.name = dto.name.trim();
    if (dto.propertyType !== undefined)
      patch.propertyType = dto.propertyType ?? null;
    if (dto.city) patch.city = dto.city.trim();
    if (dto.state !== undefined)
      patch.state = (dto.state ?? 'RS').trim().toUpperCase();
    if (dto.neighborhood !== undefined)
      patch.neighborhood = dto.neighborhood ?? null;
    if (dto.bedrooms !== undefined) patch.bedrooms = toInt(dto.bedrooms);
    if (dto.garage !== undefined) patch.garage = toInt(dto.garage);
    if (dto.bathrooms !== undefined) patch.bathrooms = toInt(dto.bathrooms);
    if (dto.priceMin !== undefined) patch.priceMin = toFixed2(dto.priceMin);
    if (dto.priceMax !== undefined) patch.priceMax = toFixed2(dto.priceMax);
    if (dto.areaMin !== undefined) patch.areaMin = toFixed2(dto.areaMin);
    if (dto.areaMax !== undefined) patch.areaMax = toFixed2(dto.areaMax);
    if (dto.adType !== undefined) patch.adType = dto.adType ?? null;

    // usa o AbstractRepository.findOneAndUpdate com filtro de ownership
    const updated = await this.repo.findOneAndUpdate(
      { id: evaluationId, user: { id: toIdNumber(userId) } } as any,
      patch,
    );
    return updated;
  }

  /** Retorna a evaluation garantindo ownership. */
  async getById(evaluationId: string, userId: string): Promise<Evaluation> {
    return this.repo.findOne({
      id: evaluationId,
      user: { id: toIdNumber(userId) },
    } as any);
  }

  /** Remove a evaluation (e, por cascade, as properties se configurado) garantindo ownership. */
  async delete(evaluationId: string, userId: string) {
    await this.repo.findOneAndDelete({
      id: evaluationId,
      user: { id: toIdNumber(userId) },
    } as any);
    return { deleted: true };
  }

  /**
   * Anexa comparáveis vindos do Mongo (RealEstateDocument) à avaliação.
   * Dedup simples por (address + totalValue) dentro da mesma avaliação.
   */
  async attachComparablesFromDocs(
    evaluationId: string,
    userId: string,
    docs: RealEstateDoc[],
    opts: { enrichIBGE?: (prop: Property) => Promise<number | null> } = {},
  ): Promise<{ added: number; skipped: number; total: number }> {
    if (!docs?.length) throw new BadRequestException('No documents provided.');

    // garante ownership (e existe)
    const ev = await this.getById(evaluationId, userId);

    // carrega já existentes para dedupe
    const existing = await this.propertyRepo.find({
      where: { evaluation: { id: ev.id } as any },
      select: ['id', 'address', 'totalValue'],
    });
    const keyset = new Set(
      existing.map(
        (e) => `${(e.address ?? '').toLowerCase()}::${numKey(e.totalValue)}`,
      ),
    );

    let added = 0;
    for (const doc of docs) {
      const mapped = this.mapDocToProperty(doc);
      // relation
      (mapped as any).evaluation = { id: ev.id } as unknown as Evaluation;

      const key = `${(mapped.address ?? '').toLowerCase()}::${numKey(mapped.totalValue)}`;
      if (keyset.has(key)) continue;

      // enriquecimento opcional (IBGE)
      if (opts.enrichIBGE) {
        try {
          const income = await opts.enrichIBGE(mapped as Property);
          if (income != null) (mapped as any).ibgeIncome = toFixed2(income);
        } catch (e) {
          this.logger.warn(`IBGE enrich failed: ${e}`);
        }
      }

      await this.propertyRepo.save(mapped as any);
      keyset.add(key);
      added++;
    }

    const total = await this.propertyRepo.count({
      where: { evaluation: { id: ev.id } as any },
    });
    return { added, skipped: docs.length - added, total };
  }

  /** Remove um comparável garantindo ownership. */
  async removeComparable(propertyId: string, userId: string) {
    const propId = toIdNumber(propertyId);
    const ownerId = toIdNumber(userId);

    const prop = await this.propertyRepo.findOne({
      where: {
        id: propId as any,
        evaluation: { user: { id: ownerId } } as any,
      },
    });

    if (!prop) throw new NotFoundException('Property not found or not owned.');

    await this.propertyRepo.delete({ id: propId as any });
    return { deleted: true };
  }

  /** Calcula estatísticas (preço, área, R$/m²) para os comparáveis anexados. */
  async computeStats(evaluationId: string, userId: string) {
    const ev = await this.getById(evaluationId, userId);
    const comps = await this.propertyRepo.find({
      where: { evaluation: { id: ev.id } as any },
    });

    const prices = comps.map((c) => toNum(c.totalValue)).filter(isFiniteNumber);
    const areas = comps.map((c) => toNum(c.totalArea)).filter(isFiniteNumber);
    const pps = comps
      .map((c) => {
        const uv = toNum(c.unitValue);
        if (isFiniteNumber(uv)) return uv!;
        const p = toNum(c.totalValue);
        const a = toNum(c.totalArea);
        return isFiniteNumber(p) && isFiniteNumber(a) && a! > 0
          ? p! / a!
          : null;
      })
      .filter(isFiniteNumber);

    const priceStats = basicStats(prices);
    const areaStats = basicStats(areas);
    const ppsStats = basicStats(pps);

    return {
      count: comps.length,
      price: pickStats(priceStats),
      area: pickStats(areaStats),
      pricePerSqm: pickStats(ppsStats),
      outliers: {
        low: priceStats.outliersLow ?? 0,
        high: priceStats.outliersHigh ?? 0,
        method: 'IQR' as const,
      },
    };
  }

  // ----------------- helpers -----------------

  private mapDocToProperty(doc: RealEstateDoc): Partial<Property> {
    const bedroomsFromTipo = firstNum(doc.Tipo?.map((t) => t.Dormitorios));
    const priceFromTipo = firstMoney(doc.Tipo?.map((t) => t.Valor));
    const totalValue = money(doc.ValorDe) ?? priceFromTipo ?? null;

    const address = [(doc.Endereco ?? '').trim(), (doc.Numero ?? '').trim()]
      .filter(Boolean)
      .join(', ');

    const imgs =
      doc.Fotos?.map(
        (f) => f.Foto_Grande || f.Foto_Media || f.Foto_Pequena,
      ).filter(Boolean) ?? [];

    const description =
      doc.Descricao?.map((d) => d.Texto?.trim())
        .filter(Boolean)
        .join('\n\n') ?? null;

    return {
      city: (doc.Cidade ?? '').trim(),
      neighborhood: (doc.Bairro ?? '').trim(),
      address: address || doc.URL || doc.Link || 'N/D',
      latitude: coord(doc.Latitude),
      longitude: coord(doc.Longitude),
      ibgeIncome: null,
      bedrooms: bedroomsFromTipo ?? toInt(doc.Suites),
      bathrooms: toInt(doc.Banheiros),
      garageSpots: toInt(doc.Garagem),
      totalArea: null, // origem não fornece área total de forma consistente
      unitValue: null, // calculado na computeStats se possível
      totalValue: totalValue,
      contactLink: (doc.URL || doc.Link) ?? null,
      contactPhone: doc.CelularImob ?? null,
      description,
      images: imgs.length ? imgs : null,
    } as Partial<Property>;
  }
  // LISTAGEM
  async list(userId: string, q?: { page?: number; limit?: number }) {
    const ownerId = toIdNumber(userId);
    const page = Math.max(1, Number(q?.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(q?.limit ?? 20)));

    const [items, total] = await this.repo.findAndCount({
      where: { user: { id: ownerId } as any },
      order: { createdAt: 'DESC' as const },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  // CONFIRMAR
  async confirm(evaluationId: string, userId: string) {
    const ev = await this.getById(evaluationId, userId);

    // precisa ter pelo menos 3 comparáveis
    const total = await this.propertyRepo.count({
      where: { evaluation: { id: ev.id } as any },
    });
    if (total < 3) {
      throw new BadRequestException(
        'Selecione ao menos 3 comparáveis antes de confirmar.',
      );
    }

    // calcula stats e retorna (por ora não persiste snapshot pois a entidade não tem campo p/ isso)
    const stats = await this.computeStats(evaluationId, userId);
    return { confirmed: true, comparableCount: total, stats };
  }
}
