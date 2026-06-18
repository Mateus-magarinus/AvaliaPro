import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CacheService } from '../cache/cache.service';
import {
  ALL_CATEGORIES,
  BBox,
  OVERPASS_FILTERS,
  Poi,
  PoiCategory,
} from './geo.types';

const MAX_BBOX_SPAN = 0.6; // ~60km — evita consultas gigantes ao Overpass
const MAX_RESULTS_PER_CATEGORY = 120;

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly overpassUrl: string;
  private readonly timeoutMs: number;
  private readonly ttlSeconds: number;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {
    this.overpassUrl =
      this.config.get<string>('OVERPASS_URL') ?? 'https://overpass-api.de/api/interpreter';
    this.timeoutMs = Number(this.config.get('OVERPASS_TIMEOUT_MS') ?? 15000);
    this.ttlSeconds = Number(this.config.get('GEO_CACHE_TTL_HOURS') ?? 24) * 3600;
  }

  async fetchPois(bbox: BBox, categories: PoiCategory[]): Promise<Poi[]> {
    this.validateBBox(bbox);
    const cats = (categories?.length ? categories : ALL_CATEGORIES).filter((c) =>
      ALL_CATEGORIES.includes(c),
    );
    if (!cats.length) return [];

    const rounded = this.roundBBox(bbox);
    const cacheKey = `geo:pois:${cats.slice().sort().join(',')}:${rounded.south},${rounded.west},${rounded.north},${rounded.east}`;

    // Cache manual: só usamos/gravamos resultados NÃO vazios — assim falhas ou
    // áreas sem POI nunca poluem o cache e podem ser reconsultadas.
    const cached = await this.cache.get<Poi[]>(cacheKey);
    if (cached && cached.length) return cached;

    try {
      const query = this.buildQuery(rounded, cats);
      const resp = await firstValueFrom(
        this.http.post(this.overpassUrl, `data=${encodeURIComponent(query)}`, {
          timeout: this.timeoutMs,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            // O WAF do overpass-api.de bloqueia (HTTP 406) o User-Agent padrão do axios.
            'User-Agent': 'Mozilla/5.0 (compatible; AvaliaPro/1.0; +https://avaliapro.local)',
            Accept: 'application/json',
          },
        }),
      );
      const pois = this.parseResponse(resp.data, cats);
      if (pois.length) await this.cache.set(cacheKey, pois, this.ttlSeconds);
      return pois;
    } catch (err) {
      this.logger.warn(`Falha ao consultar Overpass: ${(err as Error).message}`);
      return [];
    }
  }

  private buildQuery(bbox: BBox, categories: PoiCategory[]): string {
    const { south, west, north, east } = bbox;
    const area = `(${south},${west},${north},${east})`;

    const blocks: string[] = [];
    for (const cat of categories) {
      for (const filter of OVERPASS_FILTERS[cat]) {
        blocks.push(`node[${filter}]${area};`);
        blocks.push(`way[${filter}]${area};`);
      }
    }

    return `[out:json][timeout:25];(${blocks.join('')});out center ${MAX_RESULTS_PER_CATEGORY * categories.length};`;
  }

  private parseResponse(data: any, categories: PoiCategory[]): Poi[] {
    const elements: any[] = Array.isArray(data?.elements) ? data.elements : [];
    const pois: Poi[] = [];
    const perCategoryCount: Record<string, number> = {};

    for (const el of elements) {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (typeof lat !== 'number' || typeof lng !== 'number') continue;

      const category = this.classify(el.tags ?? {}, categories);
      if (!category) continue;

      perCategoryCount[category] = (perCategoryCount[category] ?? 0) + 1;
      if (perCategoryCount[category] > MAX_RESULTS_PER_CATEGORY) continue;

      pois.push({
        id: `${el.type}/${el.id}`,
        category,
        name: el.tags?.name ?? null,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
      });
    }

    return pois;
  }

  private classify(tags: Record<string, string>, categories: PoiCategory[]): PoiCategory | null {
    for (const cat of categories) {
      for (const filter of OVERPASS_FILTERS[cat]) {
        // filter no formato "chave"="valor"
        const match = filter.match(/^"([^"]+)"="([^"]+)"$/);
        if (match && tags[match[1]] === match[2]) return cat;
      }
    }
    return null;
  }

  private roundBBox(bbox: BBox): BBox {
    // arredonda para ~0.05° (~5km) para aumentar acerto de cache
    const r = (v: number) => Math.round(v * 20) / 20;
    return {
      south: r(bbox.south),
      west: r(bbox.west),
      north: r(bbox.north),
      east: r(bbox.east),
    };
  }

  private validateBBox(bbox: BBox): void {
    const { south, west, north, east } = bbox;
    if (
      [south, west, north, east].some((v) => typeof v !== 'number' || !Number.isFinite(v))
    ) {
      throw new BadRequestException('Bounding box inválido.');
    }
    if (south >= north || west >= east) {
      throw new BadRequestException('Bounding box inválido (sul/oeste devem ser menores).');
    }
    if (north - south > MAX_BBOX_SPAN || east - west > MAX_BBOX_SPAN) {
      throw new BadRequestException('Área muito grande — aproxime o zoom do mapa.');
    }
  }
}
