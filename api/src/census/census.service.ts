import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import * as fs from 'fs';
import * as path from 'path';

type Setor = { lat: number; lng: number; income: number };

type CensusDataset = {
  version?: string;
  incomeVariable?: string;
  /** chave = código IBGE do município (7 dígitos); valor = centróides de setores com renda */
  municipios: Record<string, Setor[]>;
};

/**
 * Renda média por SETOR CENSITÁRIO (granularidade ~quarteirão).
 *
 * Os dados do IBGE para setor só existem em downloads (malha de setores +
 * "Agregados por Setores Censitários"); não há API ao vivo. Este serviço
 * consome um dataset JSON pré-gerado pelo script `scripts/build-census-renda.mjs`
 * e casa a coordenada do imóvel ao setor mais próximo (centróide).
 *
 * Se o dataset não existir, getIncomeForPoint retorna null e o chamador deve
 * cair para a renda por município.
 */
@Injectable()
export class CensusService implements OnModuleInit {
  private readonly logger = new Logger(CensusService.name);
  private dataset: CensusDataset | null = null;
  private readonly dataPath: string;
  private readonly cacheTtl: number;

  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {
    this.dataPath =
      this.config.get<string>('CENSUS_DATA_PATH') ||
      path.join(process.cwd(), 'data', 'census-renda.json');
    this.cacheTtl =
      Number(this.config.get('IBGE_CACHE_TTL_DAYS') ?? 30) * 86400;
  }

  onModuleInit() {
    this.load();
  }

  /** Indica se há dados de setor carregados (para a UI/diagnóstico). */
  get available(): boolean {
    return !!this.dataset && Object.keys(this.dataset.municipios).length > 0;
  }

  private load() {
    try {
      if (!fs.existsSync(this.dataPath)) {
        this.logger.warn(
          `Dataset de setores não encontrado em ${this.dataPath} — usando renda por município. ` +
            `Gere com scripts/build-census-renda.mjs.`,
        );
        return;
      }
      const raw = fs.readFileSync(this.dataPath, 'utf-8');
      const parsed = JSON.parse(raw) as CensusDataset;
      if (!parsed?.municipios)
        throw new Error('formato inválido (sem "municipios")');
      this.dataset = parsed;
      const totalSetores = Object.values(parsed.municipios).reduce(
        (acc, arr) => acc + arr.length,
        0,
      );
      this.logger.log(
        `Dataset de setores carregado: ${Object.keys(parsed.municipios).length} municípios, ${totalSetores} setores (${parsed.version ?? 'sem versão'}).`,
      );
    } catch (err) {
      this.logger.error(
        `Falha ao carregar dataset de setores: ${(err as Error).message}`,
      );
      this.dataset = null;
    }
  }

  /**
   * Renda do setor mais próximo da coordenada, dentro do município informado.
   * Retorna null se não houver dados para o município ou coordenada inválida.
   */
  async getIncomeForPoint(
    lat: number | null | undefined,
    lng: number | null | undefined,
    municipioCode: number | string,
  ): Promise<number | null> {
    if (!this.dataset) return null;
    if (
      lat == null ||
      lng == null ||
      lat === ('' as any) ||
      lng === ('' as any)
    )
      return null;
    const la = Number(lat);
    const lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
    if (la === 0 && lo === 0) return null; // coordenada inválida (imóvel sem geo)

    const setores = this.dataset.municipios[String(municipioCode)];
    if (!setores?.length) return null;

    const cacheKey = `census:income:${municipioCode}:${la.toFixed(4)}:${lo.toFixed(4)}`;
    return this.cache.wrap<number | null>(cacheKey, this.cacheTtl, async () => {
      const nearest = this.nearestSetor(la, lo, setores);
      return nearest ? nearest.income : null;
    });
  }

  private nearestSetor(
    lat: number,
    lng: number,
    setores: Setor[],
  ): Setor | null {
    const cosLat = Math.cos((lat * Math.PI) / 180);
    let best: Setor | null = null;
    let bestDist = Infinity;
    for (const s of setores) {
      const dLat = s.lat - lat;
      const dLng = (s.lng - lng) * cosLat;
      const dist = dLat * dLat + dLng * dLng;
      if (dist < bestDist) {
        bestDist = dist;
        best = s;
      }
    }
    return best;
  }
}
