import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import {
  RealEstateItem,
  RealEstateSearchFilters,
  RealEstateSearchPort,
} from '../../evaluations/interfaces/evaluations.ports';
import { RealEstateDocument } from '@common';

function num(v: any): number | null {
  if (v == null || v === '') return null;
  const s = String(v).replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function int(v: any): number | null {
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : null;
}
function coord(v?: string | number): number | null {
  const n = typeof v === 'number' ? v : v ? Number(v) : NaN;
  return Number.isFinite(n) ? Number(n.toFixed(6)) : null;
}

function mapDocToItem(doc: any): RealEstateItem {
  const bedroomsFromTipos = Array.isArray(doc.Tipo)
    ? (doc.Tipo.map((t: any) => int(t?.Dormitorios)).find((n: number | null) =>
        Number.isFinite(n as any),
      ) ?? null)
    : null;

  const priceFromTipos = Array.isArray(doc.Tipo)
    ? (doc.Tipo.map((t: any) => num(t?.Valor)).find((n: number | null) =>
        Number.isFinite(n as any),
      ) ?? null)
    : null;

  // preferir campo normalizado
  const price =
    (typeof doc.Preco === 'number' ? doc.Preco : null) ??
    num(doc.ValorDe) ??
    priceFromTipos ??
    null;

  const address = [doc.Endereco?.trim(), doc.Numero?.trim()]
    .filter(Boolean)
    .join(', ');

  const images = Array.isArray(doc.Fotos)
    ? doc.Fotos.map(
        (f: any) => f.Foto_Grande || f.Foto_Media || f.Foto_Pequena,
      ).filter(Boolean)
    : [];

  const area =
    (typeof doc.AreaEscolhida === 'number' ? doc.AreaEscolhida : null) ??
    (typeof doc.AreaPrivativa === 'number' ? doc.AreaPrivativa : null) ??
    (typeof doc.AreaTotal === 'number' ? doc.AreaTotal : null) ??
    null;

  return {
    externalId: String(doc.ID),
    source: doc.Fonte ?? 'coligadas', // vem do mapeador; evita "mongo"
    title: doc.Nome ?? doc.Anuncio ?? null,
    address: address || null,
    city: doc.Cidade ?? '',
    state: doc.UF ?? null,
    neighborhood: doc.Bairro ?? null,
    lat: coord(doc.Latitude),
    lng: coord(doc.Longitude),
    type: doc.Categoria ?? doc.Perfil ?? null,
    bedrooms: bedroomsFromTipos,
    bathrooms: int(doc.Banheiros),
    garage: int(doc.Garagem),
    area,
    price,
    url: doc.URL ?? doc.Link ?? null,
    images,
    raw: { ID: doc.ID },
  };
}

type SortKey = 'recent' | 'price_asc' | 'price_desc';

@Injectable()
export class MongoRealEstateSearchAdapter implements RealEstateSearchPort {
  private readonly logger = new Logger(MongoRealEstateSearchAdapter.name);

  constructor(
    @InjectModel(RealEstateDocument.name)
    private readonly model: Model<RealEstateDocument>,
  ) {}

  private ciEq(value?: string) {
    if (!value) return undefined;
    return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }

  private buildQuery(filters: RealEstateSearchFilters): FilterQuery<any> {
    const q: FilterQuery<any> = {};

    if (filters.city) q.Cidade = this.ciEq(filters.city);
    if (filters.state) q.UF = this.ciEq(filters.state);
    if (filters.neighborhood) q.Bairro = this.ciEq(filters.neighborhood);
    if (filters.propertyType) q.Categoria = this.ciEq(filters.propertyType);
    if (Number.isFinite(filters.bedrooms as any))
      q['Tipo.Dormitorios'] = Number(filters.bedrooms);

    // preço normalizado
    const min = Number(filters.minPrice ?? NaN);
    const max = Number(filters.maxPrice ?? NaN);
    if (Number.isFinite(min) || Number.isFinite(max)) {
      q.Preco = {};
      if (Number.isFinite(min)) (q.Preco as any).$gte = min;
      if (Number.isFinite(max)) (q.Preco as any).$lte = max;
    }

    // filtro por fonte (se vier)
    if ((filters as any).source) q.Fonte = this.ciEq((filters as any).source);

    return q;
  }

  async search(
    filters: RealEstateSearchFilters,
    opts: { page?: number; limit?: number; sort?: SortKey } = {},
  ) {
    const page = Math.max(1, Number(opts.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(opts.limit ?? 20)));

    const q = this.buildQuery(filters);
    const sort: any = {};
    switch (opts?.sort) {
      case 'price_asc':
        // OBS: se ValorDe for string, esta ordenação é “lexicográfica”.
        // Para 100% correto, normalize preço em um campo numérico na gravação (ex.: PrecoNum).
        sort.ValorDe = 1;
        break;
      case 'price_desc':
        sort.ValorDe = -1;
        break;
      case 'recent':
      default:
        // use o campo que você tiver: DataPublicacaoISO, DataPublicacao, etc.
        sort.DataPublicacao = -1;
        break;
    }

    const [docs, total] = await Promise.all([
      this.model
        .find(q)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.model.countDocuments(q),
    ]);

    const items = docs.map(mapDocToItem);
    return { items, total, page, limit };
  }

  async count(filters: RealEstateSearchFilters) {
    const q = this.buildQuery(filters);
    const total = await this.model.countDocuments(q);
    return { total };
  }

  async getByExternalId(externalId: string, source?: string) {
    const idNum = Number(externalId);
    if (!Number.isFinite(idNum)) return null;

    const q: FilterQuery<any> = { ID: idNum };
    if (source) q.Fonte = this.ciEq(source);

    const doc = await this.model.findOne(q).lean().exec();
    if (!doc) return null;

    const item = mapDocToItem(doc);
    // força a fonte quando explicitamente pedida
    return source ? { ...item, source } : item;
  }
}
