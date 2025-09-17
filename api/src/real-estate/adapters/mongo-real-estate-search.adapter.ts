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
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : null;
}
function coord(v?: string): number | null {
  const n = v ? Number(v) : NaN;
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

  const price = num(doc.ValorDe) ?? priceFromTipos ?? null;

  const address = [doc.Endereco?.trim(), doc.Numero?.trim()]
    .filter(Boolean)
    .join(', ');
  const images = Array.isArray(doc.Fotos)
    ? doc.Fotos.map(
        (f: any) => f.Foto_Grande || f.Foto_Media || f.Foto_Pequena,
      ).filter(Boolean)
    : [];

  return {
    externalId: String(doc.ID),
    source: 'mongo',
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
    area: null, // origem inconsistente
    price,
    url: doc.URL ?? doc.Link ?? null,
    images,
    raw: { ID: doc.ID }, // enxuto (podemos expandir depois)
  };
}

@Injectable()
export class MongoRealEstateSearchAdapter implements RealEstateSearchPort {
  private readonly logger = new Logger(MongoRealEstateSearchAdapter.name);

  constructor(
    @InjectModel(RealEstateDocument.name)
    private readonly model: Model<RealEstateDocument>,
  ) {}

  async search(
    filters: RealEstateSearchFilters,
    opts: { page: number; limit: number; sort?: string },
  ) {
    const page = Math.max(1, Number(opts?.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(opts?.limit ?? 20)));

    const q: FilterQuery<any> = {};
    if (filters.city) q.Cidade = filters.city;
    if (filters.state) q.UF = filters.state;
    if (filters.neighborhood) q.Bairro = filters.neighborhood;
    if (filters.propertyType) q.Categoria = filters.propertyType;
    if (Number.isFinite(filters.bedrooms as any))
      q['Tipo.Dormitorios'] = filters.bedrooms;

    // sort — priorizar data de publicação desc como padrão
    const sort: any = {};
    switch ((opts?.sort ?? '').toLowerCase()) {
      case 'price':
        // OBS: preço é string na origem; ordenação numérica real exigiria campo normalizado.
        sort.ValorDe = -1;
        break;
      case 'recency':
      default:
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

  async getByExternalId(externalId: string, source: string) {
    const idNum = Number(externalId);
    const doc = await this.model.findOne({ ID: idNum }).lean().exec();
    if (!doc) return null;
    const item = mapDocToItem(doc);
    return { ...item, source: source || item.source };
  }
}
