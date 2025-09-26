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
  if (v == null || v === '') return null;
  let n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n)) return null;

  const scales = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8];
  for (const s of scales) {
    const t = n / s;
    if (Math.abs(t) <= 180) {
      return Number(t.toFixed(6));
    }
  }
  return null;
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
    source: doc.source ?? 'coligadas',
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

const TYPE_SYNONYMS: Record<string, RegExp[]> = {
  Apartamento: [/apart/i, /\bapto?\b/i, /flat/i, /loft/i],
  Casa: [/^casa/i, /casas?/i, /sobrado/i, /condom[ií]nio/i],
  Studio: [/studio/i, /st[úu]dio/i, /kitin?et/i, /\bkitnet\b/i, /\bjk\b/i, /loft/i],
  Terreno: [/terreno/i, /lote/i, /loteamento/i],
  Cobertura: [/cobertura/i],
  Pavilhão: [/pavilh[aã]o/i, /galp[aã]o/i, /dep[óo]sito/i],
  Sala: [/sala(?!\s*de jantar)/i, /conjunto/i, /comercial/i],
  Loja: [/loja/i, /ponto comercial/i],
};

function uniqueRegexOf(types: string[], ciEq: (s: string) => RegExp) {
  const regs: RegExp[] = [];
  for (const raw of types) {
    const t = (raw ?? '').toString().trim();
    if (!t) continue;
    const known = TYPE_SYNONYMS[t] || [];
    if (known.length) regs.push(...known);
    else regs.push(ciEq(t));
  }
  const seen = new Set<string>();
  return regs.filter((r) => {
    const k = r.toString();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function strNumEq(n: number) {
  return new RegExp(`^\\s*${n}\\s*$`, 'i');
}

@Injectable()
export class MongoRealEstateSearchAdapter implements RealEstateSearchPort {
  private readonly logger = new Logger(MongoRealEstateSearchAdapter.name);

  constructor(
    @InjectModel(RealEstateDocument.name)
    private readonly model: Model<RealEstateDocument>,
  ) { }

  private ciEq(value?: string) {
    if (!value) return undefined;
    return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }
  private ciContains(value?: string) {
    if (!value) return undefined;
    return new RegExp(`${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
  }

  private buildNeighborhoodClause(filters: RealEstateSearchFilters, q: FilterQuery<any>) {
    const one = (filters as any).neighborhood as string | undefined;
    const many = (filters as any).neighborhoods as string[] | undefined;

    if (Array.isArray(many) && many.length) {
      const regs = many
        .map((n) => (typeof n === 'string' && n.trim() ? this.ciEq(n.trim()) : null))
        .filter(Boolean) as RegExp[];
      if (regs.length) q.Bairro = { $in: regs };
      return;
    }
    if (typeof one === 'string' && one.trim()) q.Bairro = this.ciEq(one.trim());
  }

  private buildTypeClause(filters: RealEstateSearchFilters, q: FilterQuery<any>) {
    const typesArr = Array.isArray((filters as any).types)
      ? ((filters as any).types as string[]).filter((s) => typeof s === 'string' && s.trim())
      : [];
    const single =
      (filters as any).propertyType ??
      (filters as any).type ??
      undefined;

    const chosen = typesArr.length ? typesArr : (typeof single === 'string' && single.trim() ? [single] : []);
    if (!chosen.length) return;

    const regs = uniqueRegexOf(chosen, this.ciEq.bind(this));
    if (!regs.length) return;

    const orBlock = [
      { 'Tipo.Tipo': { $in: regs } },
      { Perfil: { $in: regs } },
      { Anuncio: { $in: regs } },
      { Categoria: { $in: regs } },
    ];
    (q as any).$or = (q as any).$or ? (q as any).$or.concat(orBlock) : orBlock;
  }

  private baseQuery(filters: RealEstateSearchFilters): FilterQuery<any> {
    const q: FilterQuery<any> = {};
    if (filters.city) q.Cidade = this.ciEq(filters.city);
    if (filters.state) q.UF = this.ciEq(filters.state);
    this.buildNeighborhoodClause(filters, q);
    this.buildTypeClause(filters, q);

    if (Number.isFinite(filters.bedrooms as any)) {
      q['Tipo.Dormitorios'] = Number(filters.bedrooms);
    }

    const min = Number(filters.minPrice ?? NaN);
    const max = Number(filters.maxPrice ?? NaN);
    if (Number.isFinite(min) || Number.isFinite(max)) {
      q.Preco = {};
      if (Number.isFinite(min)) (q.Preco as any).$gte = min;
      if (Number.isFinite(max)) (q.Preco as any).$lte = max;
    }

    if ((filters as any).source) q.source = this.ciEq((filters as any).source);

    if (Number.isFinite((filters as any).garage as any)) {
      const g = Number((filters as any).garage);
      (q as any).Garagem = strNumEq(g);
    }

    const qStr = (filters as any).q as string | undefined;
    if (qStr && qStr.trim()) {
      const kw = qStr.trim();
      const kwRx = this.ciContains(kw)!;
      const orKw = [
        { Anuncio: kwRx },
        { Nome: kwRx },
        { 'Descricao.Texto': kwRx },
        { Endereco: kwRx },
        { Bairro: kwRx },
      ];
      (q as any).$or = (q as any).$or ? (q as any).$or.concat(orKw) : orKw;
    }

    return q;
  }

  private applyKeywordTextSearchIfAvailable(
    base: FilterQuery<any>,
    keyword?: string,
  ): { query: FilterQuery<any>; projection?: any; textSort?: any; usedText: boolean } {
    const k = (keyword ?? '').trim();
    if (!k) return { query: base, usedText: false };
    const textQuery: FilterQuery<any> = { $and: [base, { $text: { $search: k } }] };
    const projection = { score: { $meta: 'textScore' } };
    const textSort = { score: { $meta: 'textScore' } };
    return { query: textQuery, projection, textSort, usedText: true };
  }

  private fallbackRegexQuery(base: FilterQuery<any>, keyword: string): FilterQuery<any> {
    const rx = this.ciContains(keyword)!;
    return {
      $and: [
        base,
        {
          $or: [
            { Nome: rx },
            { Anuncio: rx },
            { 'Descricao.Texto': rx },
            { Bairro: rx },
            { Endereco: rx },
            { Cidade: rx },
            { Perfil: rx },
            { Categoria: rx },
            { Codigo: rx },
            { SEODescricao: rx },
          ],
        },
      ],
    };
  }

  async search(
    filters: RealEstateSearchFilters,
    opts: { page?: number; limit?: number; sort?: SortKey } = {},
  ) {
    const page = Math.max(1, Number(opts.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(opts.limit ?? 20)));

    const base = this.baseQuery(filters);
    const { query, projection, textSort, usedText } = this.applyKeywordTextSearchIfAvailable(base, (filters as any).q);

    const sort: any = {};
    switch (opts?.sort) {
      case 'price_asc':
        sort.Preco = 1;
        break;
      case 'price_desc':
        sort.Preco = -1;
        break;
      case 'recent':
      default:
        sort.DataPublicacaoISO = -1;
        sort.DataPublicacao = -1;
        break;
    }
    const finalSort = textSort ? { ...textSort, ...sort } : sort;

    let docs: any[] = [];
    let total = 0;

    try {
      const [d, t] = await Promise.all([
        this.model
          .find(query, projection)
          .sort(finalSort)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
          .exec(),
        this.model.countDocuments(query),
      ]);
      docs = d;
      total = t;
    } catch (err) {
      if (usedText) {
        const regexQuery = this.fallbackRegexQuery(base, String((filters as any).q));
        const [d, t] = await Promise.all([
          this.model
            .find(regexQuery)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean()
            .exec(),
          this.model.countDocuments(regexQuery),
        ]);
        docs = d;
        total = t;
      } else {
        throw err;
      }
    }

    const items = docs.map(mapDocToItem);
    return { items, total, page, limit };
  }

  async count(filters: RealEstateSearchFilters) {
    const base = this.baseQuery(filters);
    const qStr = (filters as any).q as string | undefined;
    if (qStr && qStr.trim()) {
      try {
        const q = { $and: [base, { $text: { $search: qStr.trim() } }] };
        const total = await this.model.countDocuments(q);
        return { total };
      } catch {
        const q = this.fallbackRegexQuery(base, qStr.trim());
        const total = await this.model.countDocuments(q);
        return { total };
      }
    }
    const total = await this.model.countDocuments(base);
    return { total };
  }

  async getByExternalId(externalId: string, source?: string) {
    const idNum = Number(externalId);
    if (!Number.isFinite(idNum)) return null;
    const q: FilterQuery<any> = { ID: idNum };
    if (source) q.source = this.ciEq(source);
    const doc = await this.model.findOne(q).lean().exec();
    if (!doc) return null;
    const item = mapDocToItem(doc);
    return source ? { ...item, source } : item;
  }

  async countByFilters(filters: RealEstateSearchFilters): Promise<number> {
    const { total } = await this.count(filters);
    return total;
  }

  async findMany(
    filters: RealEstateSearchFilters,
    options?: { limit?: number; offset?: number; sort?: SortKey },
  ): Promise<RealEstateItem[]> {
    const limit = Math.max(1, Number(options?.limit ?? 10));
    const offset = Math.max(0, Number(options?.offset ?? 0));
    const page = Math.floor(offset / limit) + 1;
    const sort = options?.sort ?? 'recent';
    const { items } = await this.search(filters, { page, limit, sort });
    return items;
  }

  async findManyByIds(
    ids: (string | number)[],
    source?: string,
  ): Promise<RealEstateItem[]> {
    const out: RealEstateItem[] = [];
    const seen = new Set<string>();
    for (const raw of ids || []) {
      const idStr = String(raw);
      if (seen.has(idStr)) continue;
      seen.add(idStr);
      const item = await this.getByExternalId(idStr, source);
      if (item) out.push(item);
    }
    return out;
  }
}
