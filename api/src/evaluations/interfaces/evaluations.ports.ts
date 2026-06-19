import { AdType } from '@common';

export const REAL_ESTATE_SEARCH_PORT = 'REAL_ESTATE_SEARCH_PORT';
export const IBGE_PORT = 'IBGE_PORT';

export type EvaluationStatus =
  | 'draft'
  | 'in_progress'
  | 'completed'
  | 'archived';

export type RealEstateSort = 'recent' | 'price_asc' | 'price_desc';

export interface SearchOptions {
  page?: number; // default 1
  limit?: number; // default 20 (cap 100)
  sort?: RealEstateSort; // default 'recent'
}

export interface RealEstateSearchPort {
  search(
    filters: RealEstateSearchFilters,
    opts?: SearchOptions,
  ): Promise<{
    items: RealEstateItem[];
    total: number;
    page: number;
    limit: number;
  }>;

  // 'source' opcional: quando não informado, retorna da fonte do doc
  getByExternalId(
    externalId: string,
    source?: string,
  ): Promise<RealEstateItem | null>;

  // opcional: útil para endpoints de contagem sem listar itens
  count?(filters: RealEstateSearchFilters): Promise<{ total: number }>;
}

export interface RealEstateSearchFilters {
  city?: string;
  state?: string;
  neighborhood?: string;
  propertyType?: string;
  type?: string;
  types?: string[];
  bedrooms?: number;
  bathrooms?: number;
  garage?: number;
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  adType?: AdType;

  q?: string;

  [key: string]: any;
}

export interface RealEstateItem {
  externalId: string;
  source: string;
  code?: string | null; // código/referência do anúncio
  title?: string | null;
  address?: string | null;
  city: string;
  state?: string | null;
  neighborhood?: string | null;
  lat?: number | null;
  lng?: number | null;
  type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  garage?: number | null;
  suites?: number | null;
  area?: number | null;
  price?: number | null;
  url?: string | null;
  images?: string[];
  // características
  pool?: boolean | null;
  balcony?: boolean | null;
  elevator?: boolean | null;
  leisureArea?: boolean | null;
  barbecue?: boolean | null;
  petFriendly?: boolean | null;
  furniture?: string | null; // Mobília (texto)
  highStandard?: boolean | null;
  raw?: any; // payload original para auditoria
}

export interface IbgePort {
  getIncome(
    city: string,
    state?: string,
    neighborhood?: string,
  ): Promise<number | null>;
}

export interface StatsSnapshot {
  count: number;
  price: BasicStats;
  area: BasicStats;
  pricePerSqm: BasicStats;
  outliers: { low: number; high: number; method: 'IQR' };
}

export interface BasicStats {
  avg: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
}
