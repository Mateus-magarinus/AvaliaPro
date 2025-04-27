import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { RealEstateRepository } from './real-estate.repository';
import { RealEstateDocument } from '@common/models';

@Injectable()
export class RealEstateService {
  private readonly logger = new Logger(RealEstateService.name);
  private readonly baseListUrl: string;
  private readonly baseDetailUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly repository: RealEstateRepository,
  ) {
    // Configurable endpoints via environment variables
    this.baseListUrl = this.config.get<string>('API_IMOVEIS_LIST');
    this.baseDetailUrl = this.config.get<string>('API_IMOVEL_DETAIL');
  }

  /**
   * Fetch all pages from the listing endpoint and gather IDs
   */
  private async fetchAllIds(): Promise<number[]> {
    const ids: number[] = [];
    let nextPage: number | null = 1;

    while (nextPage) {
      const url = `${this.baseListUrl}&page=${nextPage}`;
      this.logger.log(`Fetching property list page ${nextPage}`);
      const response = await firstValueFrom(this.http.get(url));
      const payload = response.data;

      // Extract IDs from current page
      payload.data.forEach((item: any) => ids.push(item.ID));

      // Determine next page or end
      nextPage = payload.links.next
        ? parseInt(new URL(payload.links.next).searchParams.get('page'), 10)
        : null;
    }

    return ids;
  }

  /**
   * Fetch detail for a specific property and map to repository schema
   */
  private async fetchDetail(id: number): Promise<Partial<RealEstateDocument>> {
    const url = `${this.baseDetailUrl}/${id}?pgimovel=1&interno=0&idimob=1&rede=1`;
    this.logger.debug(`Fetching details for property ID ${id}`);
    const response = await firstValueFrom(this.http.get(url));
    const raw = response.data.data;

    // Map raw response fields to RealEstateDocument schema
    const mapped: Partial<RealEstateDocument> = {
      ID: raw.ID,
      Idimob: raw.Idimob,
      Imobiliaria: raw.Imobiliaria,
      CelularImob: raw.CelularImob,
      CelularImob2: raw.CelularImob2,
      IdCondominio: raw.IdCondominio,
      Categoria: raw.Categoria,
      Codigo: raw.Codigo,
      Agenciador: raw.Agenciador,
      Nome: raw.Nome,
      Anuncio: raw.Anuncio,
      URL: raw.URL,
      SEOTitulo: raw.SEOTitulo,
      SEODescricao: raw.SEODescricao,
      SEOKeywords: raw.SEOKeywords,
      Status: raw.Status,
      Link: raw.Link,
      Endereco: raw.Endereco,
      Numero: raw.Numero,
      Unidade: raw.Unidade,
      Complemento: raw.Complemento,
      PontoReferencia: raw.PontoReferencia,
      Bairro: raw.Bairro,
      Cidade: raw.Cidade,
      UF: raw.UF,
      Latitude: raw.Latitude,
      Longitude: raw.Longitude,
      MostrarMapa: raw.MostrarMapa,
      EnderecoRestrito: raw.EnderecoRestrito,
      Perfil: raw.Perfil,
      Mobilia: raw.Mobilia,
      PalavraDestaque: raw.PalavraDestaque,
      ValorDe: raw.ValorDe,
      ValorRestrito: raw.ValorRestrito,
      ValorCondominio: raw.ValorCondominio,
      ValorIPTU: raw.ValorIPTU,
      ValorIPTUTipo: raw.ValorIPTUTipo,
      Financiamento: raw.Financiamento,
      Exclusividade: raw.Exclusividade,
      DataCadastro: raw.DataCadastro,
      DataPublicacao: raw.DataPublicacao,
      DataEntrega: raw.DataEntrega,
      AnoConclusao: raw.AnoConclusao,
      Situacao: raw.Situacao,
      Especial: raw.Especial,
      AceitaPet: raw.AceitaPet === 'Aceita Pet',
      AltoPadrao: raw.AltoPadrao,
      Investidor: raw.Investidor,
      Garagem: raw.Garagem,
      Suites: raw.Suites,
      DemiSuite: raw.DemiSuite,
      SuiteMaster: raw.SuiteMaster,
      Banheiros: raw.Banheiros,
      Lavabos: raw.Lavabos,
      Tipo: raw.Tipo,
      Video: this.parseVideo(raw.Video),
      TourVirtual: this.parseVideo(raw.TourVirtual),
      Showroom: raw.Showroom,
      DependenciaEmpregada: raw.DependenciaEmpregada,
      AreaLazer: raw.AreaLazer,
      Piscina: raw.Piscina,
      Churrasqueira: raw.Churrasqueira,
      Sacada: raw.Sacada,
      Terraco: raw.Terraco,
      Elevador: raw.Elevador,
      Capacidade: raw.Capacidade,
      DistanciaMar: raw.DistanciaMar,
      ItensTemporada: raw.ItensTemporada,
      ReservasTemporada: raw.ReservasTemporada,
      Descricao: raw.Descricao,
      Fotos: raw.Fotos?.Apresentacao ?? [],
      Caracteristicas: raw.Caracteristicas,
    };

    return mapped;
  }

  /**
   * Synchronize all properties: fetch IDs, fetch details, and upsert into DB
   */
  async syncAll(): Promise<void> {
    this.logger.log('Starting properties synchronization');

    const ids = await this.fetchAllIds();
    this.logger.log(`Found ${ids.length} property IDs`);

    for (const id of ids) {
      try {
        const data = await this.fetchDetail(id);
        await this.repository.findOneAndUpsert({ ID: id }, { $set: data });
        this.logger.debug(`Synchronized property ID ${id}`);
      } catch (error) {
        this.logger.error(
          `Failed to synchronize property ID ${id}`,
          error.stack,
        );
      }
    }

    this.logger.log('Properties synchronization completed');
  }

  private parseVideo(rawVideo: any): string {
    if (Array.isArray(rawVideo) && rawVideo.length > 0) {
      const first = rawVideo[0];
      return typeof first.Video === 'string' ? first.Video : '';
    }
    if (typeof rawVideo === 'string') {
      return rawVideo;
    }
    return '';
  }
}
