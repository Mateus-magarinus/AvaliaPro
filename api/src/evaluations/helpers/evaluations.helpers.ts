import { BadRequestException } from '@nestjs/common';
import { BasicStats, RealEstateItem } from '../interfaces/evaluations.ports';
import { Property } from '@common';

export function isFiniteNumber(v: any): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
export function toNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
export function toInt(v: any): number | null {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export function percentile(sortedAsc: number[], p: number): number {
  if (!sortedAsc.length) return NaN;
  if (p <= 0) return sortedAsc[0];
  if (p >= 1) return sortedAsc[sortedAsc.length - 1];
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

export function computeBasicStats(
  values: number[],
): BasicStats & { outliersLow?: number; outliersHigh?: number } {
  if (!values?.length) return { avg: null, median: null, min: null, max: null };

  const arr = [...values].sort((a, b) => a - b);
  const sum = arr.reduce((a, b) => a + b, 0);
  const avg = sum / arr.length;
  const min = arr[0];
  const max = arr[arr.length - 1];
  const median =
    arr.length % 2
      ? arr[(arr.length - 1) / 2]
      : (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;

  // IQR (somente contagem de outliers)
  const q1 = percentile(arr, 0.25);
  const q3 = percentile(arr, 0.75);
  const iqr = q3 - q1;
  const lowFence = q1 - 1.5 * iqr;
  const highFence = q3 + 1.5 * iqr;
  const outliersLow = arr.filter((v) => v < lowFence).length;
  const outliersHigh = arr.filter((v) => v > highFence).length;

  return { avg, median, min, max, outliersLow, outliersHigh };
}

/** Mapeia um item da origem para a entidade Property (comparável) */
export function mapExternalToProperty(
  raw: RealEstateItem,
  evaluationId: string,
): Partial<Property> {
  const area = toNum(raw.area);
  const price = toNum(raw.price);
  const pricePerSqm =
    isFiniteNumber(area) && area! > 0 && isFiniteNumber(price)
      ? price! / area!
      : null;

  return {
    evaluationId,
    externalId: raw.externalId ?? (raw as any).id,
    source: raw.source ?? 'external',
    title: raw.title ?? null,
    address: raw.address ?? null,
    city: raw.city,
    state: raw.state ?? null,
    neighborhood: raw.neighborhood ?? null,
    lat: toNum(raw.lat),
    lng: toNum(raw.lng),
    type: raw.type ?? null,
    bedrooms: toInt(raw.bedrooms),
    bathrooms: toInt(raw.bathrooms),
    garage: toInt(raw.garage),
    area,
    price,
    pricePerSqm,
    url: raw.url ?? null,
    images: Array.isArray(raw.images) ? raw.images : [],
    metadata: raw.raw ?? raw,
  } as Partial<Property>;
}

export function toIdNumber(v: string | number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException('Invalid id');
  return n;
}

export function money(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  // aceita "1.234.567,89" ou "1234567.89"
  const s = String(v).replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? round2(n) : null;
}

export function firstMoney(
  arr?: (string | number | undefined)[],
): number | null {
  if (!arr?.length) return null;
  for (const v of arr) {
    const n = typeof v === 'number' ? v : money(v);
    if (Number.isFinite(n)) return round2(Number(n));
  }
  return null;
}

export function firstNum(arr?: (number | undefined)[]): number | null {
  if (!arr?.length) return null;
  for (const v of arr) if (Number.isFinite(v as number)) return Number(v);
  return null;
}

export function coord(v?: string): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Number(n.toFixed(6)) : null;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function toFixed2(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? round2(n) : null;
}

export function numKey(v: any): string {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : 'null';
}

export function basicStats(values: number[]) {
  if (!values.length) return { avg: null, median: null, min: null, max: null };
  const arr = [...values].sort((a, b) => a - b);
  const sum = arr.reduce((a, b) => a + b, 0);
  const avg = sum / arr.length;
  const min = arr[0];
  const max = arr[arr.length - 1];
  const median =
    arr.length % 2
      ? arr[(arr.length - 1) / 2]
      : (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;

  // IQR
  const q1 = percentile(arr, 0.25);
  const q3 = percentile(arr, 0.75);
  const iqr = q3 - q1;
  const lowFence = q1 - 1.5 * iqr;
  const highFence = q3 + 1.5 * iqr;
  const outliersLow = arr.filter((v) => v < lowFence).length;
  const outliersHigh = arr.filter((v) => v > highFence).length;

  return { avg, median, min, max, outliersLow, outliersHigh };
}

export function pickStats(s: any) {
  return {
    avg: s.avg ?? null,
    median: s.median ?? null,
    min: s.min ?? null,
    max: s.max ?? null,
  };
}
