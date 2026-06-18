import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CacheService } from '../cache/cache.service';

const IBGE_BASE = 'https://servicodados.ibge.gov.br';

type MunicipioRef = { id: number; nome: string };

function normalizeName(value: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[^\x00-\x7f]/g, '') // remove acentos (combining marks pos-NFD)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

@Injectable()
export class IbgeService {
  private readonly logger = new Logger(IbgeService.name);
  private readonly agregado: number;
  private readonly variavel: number;
  private readonly timeoutMs: number;
  private readonly ttlSeconds: number;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {
    this.agregado = Number(this.config.get('IBGE_AGREGADO') ?? 1685);
    this.variavel = Number(this.config.get('IBGE_VARIAVEL') ?? 10143);
    this.timeoutMs = Number(this.config.get('IBGE_TIMEOUT_MS') ?? 8000);
    this.ttlSeconds =
      Number(this.config.get('IBGE_CACHE_TTL_DAYS') ?? 30) * 86400;
  }

  /** Resolve o codigo IBGE do municipio a partir do nome + UF. */
  async resolveMunicipalityCode(
    city: string,
    uf: string,
  ): Promise<number | null> {
    const ufNorm = (uf ?? '').trim().toUpperCase();
    const cityNorm = normalizeName(city);
    if (!ufNorm || !cityNorm) return null;

    const municipios = await this.getMunicipiosByUf(ufNorm);
    if (!municipios.length) return null;

    const exact = municipios.find((m) => normalizeName(m.nome) === cityNorm);
    if (exact) return exact.id;

    // fallback: municipio cujo nome comeca com o texto informado
    const partial = municipios.find((m) =>
      normalizeName(m.nome).startsWith(cityNorm),
    );
    return partial?.id ?? null;
  }

  /** Salario medio mensal (R$) do municipio, com cache. Retorna null se indisponivel. */
  async getAverageIncome(city: string, uf: string): Promise<number | null> {
    const code = await this.resolveMunicipalityCode(city, uf);
    if (!code) {
      this.logger.debug(`Municipio nao resolvido: ${city}/${uf}`);
      return null;
    }

    const cacheKey = `ibge:income:${this.agregado}:${this.variavel}:${code}`;
    return this.cache.wrap<number | null>(
      cacheKey,
      this.ttlSeconds,
      async () => {
        try {
          const url = `${IBGE_BASE}/api/v3/agregados/${this.agregado}/periodos/-1/variaveis/${this.variavel}?localidades=N6[${code}]`;
          const resp = await firstValueFrom(
            this.http.get(url, { timeout: this.timeoutMs }),
          );
          return this.extractLatestValue(resp.data);
        } catch (err) {
          this.logger.warn(
            `Falha ao consultar IBGE para municipio ${code}: ${(err as Error).message}`,
          );
          return null;
        }
      },
    );
  }

  private async getMunicipiosByUf(uf: string): Promise<MunicipioRef[]> {
    const cacheKey = `ibge:municipios:${uf}`;
    return this.cache.wrap<MunicipioRef[]>(
      cacheKey,
      this.ttlSeconds,
      async () => {
        try {
          const url = `${IBGE_BASE}/api/v1/localidades/estados/${uf}/municipios`;
          const resp = await firstValueFrom(
            this.http.get(url, { timeout: this.timeoutMs }),
          );
          const data: any[] = Array.isArray(resp.data) ? resp.data : [];
          return data
            .map((m) => ({ id: Number(m?.id), nome: String(m?.nome ?? '') }))
            .filter((m) => Number.isFinite(m.id) && m.nome);
        } catch (err) {
          this.logger.warn(
            `Falha ao listar municipios da UF ${uf}: ${(err as Error).message}`,
          );
          return [];
        }
      },
    );
  }

  /** Extrai o valor mais recente da serie retornada pela API v3 de agregados. */
  private extractLatestValue(payload: any): number | null {
    try {
      const serie = payload?.[0]?.resultados?.[0]?.series?.[0]?.serie;
      if (!serie || typeof serie !== 'object') return null;

      const periods = Object.keys(serie).sort(); // anos em ordem crescente
      for (let i = periods.length - 1; i >= 0; i--) {
        const raw = serie[periods[i]];
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) return n;
      }
      return null;
    } catch {
      return null;
    }
  }
}
