import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export type ColigadasListRef = {
  id: number;
  link?: string | null;
};

const COLIGADAS_BASE_URL = 'https://www.coligadas.com.br';
const COLIGADAS_LIST_REFERER =
  'https://www.coligadas.com.br/comprar-imoveis/todos/?operacao=vendas&uf=rs,pr&ordem=1';

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

  private withReferer(referer: string) {
    return { headers: { Referer: referer } };
  }

  private listParam(name: string, fallback: string) {
    try {
      return new URL(this.listUrl).searchParams.get(name) ?? fallback;
    } catch {
      return fallback;
    }
  }

  private normalizeLink(link?: string | null): string | null {
    if (typeof link !== 'string') return null;
    const normalized = link.trim().replace(/\\\//g, '/');
    return normalized || null;
  }

  private buildDetailReferer(link?: string | null, id?: number): string {
    const normalized = this.normalizeLink(link);
    try {
      if (normalized) {
        return new URL(normalized, COLIGADAS_BASE_URL).toString();
      }
      if (Number.isFinite(id)) {
        return new URL(`/imovel/${id}`, COLIGADAS_BASE_URL).toString();
      }
    } catch {
      this.logger.warn(`Link inválido recebido da Coligadas: ${link}`);
    }
    return COLIGADAS_BASE_URL;
  }

  private buildDetailUrl(id: number): string {
    if (this.detailUrl.includes('{id}'))
      return this.detailUrl.replace('{id}', String(id));

    const u = new URL(this.detailUrl);
    const path = u.pathname.replace(/\/$/, '');

    if (path.endsWith('/api/imovel') || path.endsWith('/imovel')) {
      u.pathname = `${path}/${id}`;
      u.searchParams.delete('id');
      u.searchParams.delete('codigo');

      if (!u.searchParams.has('idimob')) {
        u.searchParams.set('idimob', this.listParam('idimob', '1'));
      }
      if (!u.searchParams.has('rede')) {
        u.searchParams.set('rede', this.listParam('rede', '1'));
      }
      if (!u.searchParams.has('')) {
        u.searchParams.set('', 'null');
      }

      return u.toString();
    }

    if (u.searchParams.has('codigo') && !u.searchParams.has('id')) {
      u.searchParams.set('codigo', String(id));
    } else {
      u.searchParams.set('id', String(id));
    }
    return u.toString();
  }

  async fetchAllRefs(): Promise<ColigadasListRef[]> {
    const refs: ColigadasListRef[] = [];
    let nextPage = 1;

    // guarda-chuva anti-loop infinito
    for (let i = 0; i < 10000; i++) {
      const url = this.buildPagedUrl(this.listUrl, nextPage);
      const resp = await firstValueFrom(
        this.http.get(url, this.withReferer(COLIGADAS_LIST_REFERER)),
      );
      const payload = resp.data;

      const pageItems: any[] = payload?.data ?? payload?.items ?? [];
      for (const it of pageItems) {
        const id = Number(it?.ID ?? it?.Id ?? it?.id);
        if (Number.isFinite(id)) {
          refs.push({
            id,
            link: it?.Link ?? it?.link ?? it?.URL ?? it?.url ?? null,
          });
        }
      }

      const hasNext = payload?.links?.next || payload?.nextPage;
      if (!hasNext) break;
      nextPage += 1;
    }

    return refs;
  }

  async fetchAllIds(): Promise<number[]> {
    const refs = await this.fetchAllRefs();
    return refs.map((ref) => ref.id);
  }

  async fetchDetail(id: number, link?: string | null): Promise<any> {
    const url = this.buildDetailUrl(id);
    const resp = await firstValueFrom(
      this.http.get(url, this.withReferer(this.buildDetailReferer(link, id))),
    );
    return resp.data?.data ?? resp.data;
  }
}
