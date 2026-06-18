import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

import { RealEstateRepository } from './real-estate.repository';
import {
  ColigadasClient,
  type ColigadasListRef,
} from './providers/coligadas/coligadas.client';
import { ColigadasMapper } from './providers/coligadas/coligadas.mapper';
import { CacheService } from '../cache/cache.service';

export type LocationGroup = {
  city: string;
  uf: string;
  neighborhoods: string[];
};

const LOCATIONS_CACHE_KEY = 'real-estate:locations:v1';
const LOCATIONS_CACHE_TTL_SECONDS = 6 * 3600; // 6h

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[^\x00-\x7f]/g, '')
    .toLowerCase()
    .trim();
}

@Injectable()
export class RealEstateService {
  private readonly logger = new Logger(RealEstateService.name);
  private readonly CONCURRENCY: number;

  constructor(
    private readonly repository: RealEstateRepository,
    private readonly coligadas: ColigadasClient,
    private readonly mapper: ColigadasMapper,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {
    this.CONCURRENCY = Number(
      this.config.get('API_COLIGADAS_CONCURRENCY') ?? 6,
    );
  }

  /**
   * Lista de cidades (com UF) e seus bairros, para popular os filtros do front.
   * Resultado cacheado (Redis ou memória) por algumas horas.
   */
  async getLocations(): Promise<LocationGroup[]> {
    return this.cache.wrap<LocationGroup[]>(
      LOCATIONS_CACHE_KEY,
      LOCATIONS_CACHE_TTL_SECONDS,
      () => this.buildLocations(),
    );
  }

  /** Recalcula e regrava o cache de localizações (chamar após sync). */
  async refreshLocationsCache(): Promise<LocationGroup[]> {
    const groups = await this.buildLocations();
    await this.cache.set(LOCATIONS_CACHE_KEY, groups, LOCATIONS_CACHE_TTL_SECONDS);
    return groups;
  }

  private async buildLocations(): Promise<LocationGroup[]> {
    const raw = await this.repository.aggregateLocations();
    return raw
      .filter((r) => r.city)
      .map((r) => {
        // dedupe de bairros case-insensitive, mantendo a primeira grafia
        const seen = new Map<string, string>();
        for (const b of r.bairros) {
          const name = String(b ?? '').trim();
          if (!name) continue;
          const key = normalize(name);
          if (!seen.has(key)) seen.set(key, name);
        }
        const neighborhoods = Array.from(seen.values()).sort((a, b) =>
          a.localeCompare(b, 'pt-BR'),
        );
        return { city: r.city, uf: r.uf, neighborhoods };
      })
      .sort((a, b) => a.city.localeCompare(b.city, 'pt-BR'));
  }

  @Cron('0 4 * * *')
  async syncColigadasDaily() {
    this.logger.log('Iniciando sync diário da Coligadas…');
    const result = await this.syncColigadas();
    this.logger.log(
      `Sync diário concluído: upserts=${result.upserts} deleted=${result.deleted} errors=${result.errors}`,
    );
    await this.refreshLocationsCache().catch((err) =>
      this.logger.warn(`Falha ao atualizar cache de localizações: ${err?.message ?? err}`),
    );
  }

  async syncColigadas(): Promise<{
    upserts: number;
    deleted: number;
    errors: number;
  }> {
    this.logger.log('Sincronização Coligadas: iniciando');

    let refs: ColigadasListRef[] = [];
    let ids: number[] = [];
    try {
      refs = await this.coligadas.fetchAllRefs();
      ids = refs.map((ref) => ref.id);
      this.logger.log(`Coligadas: ${ids.length} IDs encontrados`);
    } catch (err) {
      this.logger.error(
        'Falha ao buscar lista de IDs da Coligadas',
        err as any,
      );
      return { upserts: 0, deleted: 0, errors: 1 };
    }

    let upserts = 0;
    let errors = 0;

    for (let i = 0; i < refs.length; i += this.CONCURRENCY) {
      const slice = refs.slice(i, i + this.CONCURRENCY);

      const results = await Promise.allSettled(
        slice.map((ref) => this.coligadas.fetchDetail(ref.id, ref.link)),
      );

      const fulfilled = results
        .map((r, idx) => ({ r, ref: slice[idx] }))
        .filter(
          (x) =>
            x.r.status === 'fulfilled' &&
            (x.r as PromiseFulfilledResult<any>).value,
        );

      const rejected = results
        .map((r, idx) => ({ r, id: slice[idx].id }))
        .filter((x) => x.r.status === 'rejected');

      errors += rejected.length;
      for (const fail of rejected.slice(0, 3)) {
        this.logger.warn(
          `Falha ao buscar detalhe ID=${fail.id}: ${this.describeSyncError(
            (fail.r as PromiseRejectedResult).reason,
          )}`,
        );
      }

      await Promise.all(
        fulfilled.map(async ({ r, ref }) => {
          const raw = (r as PromiseFulfilledResult<any>).value;
          if (!raw.Link && ref.link) raw.Link = ref.link;

          const doc = this.mapper.toRealEstateDoc(raw);
          try {
            await this.repository.findOneAndUpsert(
              { ID: doc.ID, source: 'coligadas' } as any,
              { $set: doc } as any,
            );
            upserts += 1;
          } catch (e) {
            errors += 1;
            this.logger.warn(`Falha no upsert ID=${doc.ID}: ${e}`);
          }
        }),
      );
    }

    const deleted = await this.purgeMissingFromColigadas(ids);

    const summary = { upserts, deleted, errors };
    this.logger.log(
      `Sincronização Coligadas: concluída => upserts=${upserts} deleted=${deleted} errors=${errors}`,
    );
    return summary;
  }

  async syncColigadasOne(id: number, link?: string | null): Promise<{
    id: number;
    upserted: boolean;
    fotos: number;
    link: string | null;
  }> {
    let effectiveLink = link?.trim() || null;

    if (!effectiveLink) {
      try {
        const existing: any = await this.repository.findOne({
          ID: id,
          source: 'coligadas',
        } as any);
        effectiveLink = existing?.Link ?? null;
      } catch {
        effectiveLink = null;
      }
    }

    const raw = await this.coligadas.fetchDetail(id, effectiveLink);
    if (!raw.Link && effectiveLink) raw.Link = effectiveLink;

    const doc = this.mapper.toRealEstateDoc(raw);
    await this.repository.findOneAndUpsert(
      { ID: doc.ID, source: 'coligadas' } as any,
      { $set: doc } as any,
    );

    return {
      id: doc.ID,
      upserted: true,
      fotos: Array.isArray(doc.Fotos) ? doc.Fotos.length : 0,
      link: doc.Link ?? effectiveLink ?? null,
    };
  }

  private async purgeMissingFromColigadas(validIds: number[]): Promise<number> {
    try {
      const res: any = await this.repository.deleteMany({
        source: 'coligadas',
        ID: { $nin: validIds },
      } as any);
      return res?.deletedCount ?? 0;
    } catch (e) {
      this.logger.warn(`Falha ao remover itens obsoletos da Coligadas: ${e}`);
      return 0;
    }
  }

  private describeSyncError(err: any): string {
    const status = err?.response?.status;
    const statusText = err?.response?.statusText;
    const url = err?.config?.url;
    if (status) {
      return `HTTP ${status}${statusText ? ` ${statusText}` : ''}${url ? ` (${url})` : ''}`;
    }
    return err?.message ?? String(err);
  }
}
