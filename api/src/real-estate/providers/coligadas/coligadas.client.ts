import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ColigadasClient {
  private readonly logger = new Logger(ColigadasClient.name);
  private readonly listUrl = this.cfg.get<string>('API_IMOVEIS_LIST')!;
  private readonly detailUrl = this.cfg.get<string>('API_IMOVEL_DETAIL')!;

  constructor(
    private http: HttpService,
    private cfg: ConfigService,
  ) {}

  private buildPagedUrl(base: string, page: number, limit = 40): string {
    try {
      const u = new URL(base);
      u.searchParams.set('page', String(page));
      if (!u.searchParams.get('limite'))
        u.searchParams.set('limite', String(limit));
      return u.toString();
    } catch {
      const hasQ = base.includes('?');
      const sep = hasQ ? '&' : '?';
      const hasLimite = /[?&]limite=/.test(base);
      return `${base}${sep}page=${page}${hasLimite ? '' : `&limite=${limit}`}`;
    }
  }

  private buildDetailUrl(id: number): string {
    if (this.detailUrl.includes('{id}'))
      return this.detailUrl.replace('{id}', String(id));
    const u = new URL(this.detailUrl);
    if (u.searchParams.has('codigo') && !u.searchParams.has('id')) {
      u.searchParams.set('codigo', String(id));
    } else {
      u.searchParams.set('id', String(id));
    }
    return u.toString();
  }

  async fetchAllIds(): Promise<number[]> {
    const ids: number[] = [];
    let nextPage = 1;

    // guarda-chuva anti-loop infinito
    for (let i = 0; i < 10000; i++) {
      const url = this.buildPagedUrl(this.listUrl, nextPage);
      const resp = await firstValueFrom(this.http.get(url));
      const payload = resp.data;

      const pageItems: any[] = payload?.data ?? payload?.items ?? [];
      for (const it of pageItems) {
        const id = Number(it?.ID ?? it?.Id ?? it?.id);
        if (Number.isFinite(id)) ids.push(id);
      }

      const hasNext = payload?.links?.next || payload?.nextPage;
      if (!hasNext) break;
      nextPage += 1;
    }

    return ids;
  }

  async fetchDetail(id: number): Promise<any> {
    const url = this.buildDetailUrl(id);
    const resp = await firstValueFrom(this.http.get(url));
    // alguns endpoints retornam { data: {...} }, outros já retornam o objeto
    return resp.data?.data ?? resp.data;
  }
}
