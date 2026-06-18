export type EvaluationStatus = "draft" | "confirmed" | "archived";

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type PropertyRecord = {
  id: number;
  city: string;
  neighborhood?: string | null;
  address: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  ibgeIncome?: number | string | null;
  sectorIncome?: number | string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  garageSpots?: number | null;
  totalArea?: number | string | null;
  unitValue?: number | string | null;
  totalValue?: number | string | null;
  contactLink?: string | null;
  contactPhone?: string | null;
  description?: string | null;
  images?: string[] | string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type EvaluationRecord = {
  id: number;
  name: string;
  description?: string | null;
  status: EvaluationStatus;
  filters?: Record<string, unknown>;
  propertyType?: string | null;
  city: string;
  state: string;
  neighborhood?: string | null;
  bedrooms?: number | null;
  garage?: number | null;
  bathrooms?: number | null;
  priceMin?: number | string | null;
  priceMax?: number | string | null;
  areaMin?: number | string | null;
  areaMax?: number | string | null;
  propertyCount?: number;
  properties?: PropertyRecord[];
  createdAt?: string;
  updatedAt?: string;
};

export type EvaluationPreview = {
  total: number;
  sample?: unknown[];
  sampleLimit: number;
};

export type CreateEvaluationResponse = {
  evaluationId: number;
  preview: EvaluationPreview;
  attached: number;
};

export type QuotaStatus = {
  allowed: boolean;
  searchesUsed: number;
  searchesLimit: number;
  remaining: number;
  planName: string;
  periodEnd: string;
};

export type PlanRecord = {
  id: number;
  slug: string;
  name: string;
  price: number;
  searchesPerMonth: number;
  features: Record<string, boolean>;
  active: boolean;
};

export type UserRecord = {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  searchesUsed: number;
  createdAt: string;
};

export type LocationGroup = {
  city: string;
  uf: string;
  neighborhoods: string[];
};

export type LocationsResponse = {
  count: number;
  cities: LocationGroup[];
};

export type ColumnPref = {
  columnKey: string;
  label: string;
  visible: boolean;
  order: number;
};

export type ColumnPreferencesResponse = {
  catalog: Array<{ key: string; label: string }>;
  columns: ColumnPref[];
};

export type AdminUserView = {
  id: number;
  name: string;
  email: string;
  role: string;
  searchesUsed: number;
  createdAt: string;
  plan: string;
  planSlug: string | null;
  periodEnd: string | null;
};
