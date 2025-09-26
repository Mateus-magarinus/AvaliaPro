import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

import { RealEstateRepository } from './real-estate.repository';
import { ColigadasClient } from './providers/coligadas/coligadas.client';
import { ColigadasMapper } from './providers/coligadas/coligadas.mapper';

@Injectable()
export class RealEstateService {
  private readonly logger = new Logger(RealEstateService.name);
  private readonly CONCURRENCY: number;

  constructor(
    private readonly repository: RealEstateRepository,
    private readonly coligadas: ColigadasClient,
    private readonly mapper: ColigadasMapper,
    private readonly config: ConfigService,
  ) {
    this.CONCURRENCY = Number(
      this.config.get('API_COLIGADAS_CONCURRENCY') ?? 6,
    );
  }

  @Cron('0 4 * * *')
  async syncColigadasDaily() {
    this.logger.log('Iniciando sync diário da Coligadas…');
    const result = await this.syncColigadas();
    this.logger.log(
      `Sync diário concluído: upserts=${result.upserts} deleted=${result.deleted} errors=${result.errors}`,
    );
  }

  async syncColigadas(): Promise<{
    upserts: number;
    deleted: number;
    errors: number;
  }> {
    this.logger.log('Sincronização Coligadas: iniciando');

    let ids: number[] = [];
    try {
      ids = await this.coligadas.fetchAllIds();
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

    for (let i = 0; i < ids.length; i += this.CONCURRENCY) {
      const slice = ids.slice(i, i + this.CONCURRENCY);

      const results = await Promise.allSettled(
        slice.map((id) => this.coligadas.fetchDetail(id)),
      );

      const fulfilled = results
        .map((r, idx) => ({ r, id: slice[idx] }))
        .filter(
          (x) =>
            x.r.status === 'fulfilled' &&
            (x.r as PromiseFulfilledResult<any>).value,
        );

      errors += results.filter((x) => x.status === 'rejected').length;

      await Promise.all(
        fulfilled.map(async ({ r }) => {
          const raw = (r as PromiseFulfilledResult<any>).value;
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
}
