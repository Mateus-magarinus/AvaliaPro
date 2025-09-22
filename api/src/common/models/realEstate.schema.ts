import { MongoAbstractDocument } from '@common/database';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ versionKey: false, timestamps: true })
export class RealEstateDocument extends MongoAbstractDocument {
  @Prop({ required: true })
  ID: number;

  @Prop({ required: true, enum: ['coligadas'] })
  source: 'coligadas';

  @Prop()
  Idimob: number;

  @Prop()
  Imobiliaria: string;

  @Prop()
  CelularImob: string;

  @Prop()
  CelularImob2: string;

  @Prop()
  IdCondominio: string;

  @Prop()
  Categoria: string;

  @Prop()
  Codigo: string;

  @Prop({ type: Object })
  Agenciador: Record<string, any>;

  @Prop()
  Nome: string;

  @Prop()
  Anuncio: string;

  @Prop()
  URL: string;

  @Prop()
  SEOTitulo: string;

  @Prop()
  SEODescricao: string;

  @Prop()
  SEOKeywords: string;

  @Prop()
  Status: number;

  @Prop()
  Link: string;

  @Prop()
  Endereco: string;

  @Prop()
  Numero: string;

  @Prop()
  Unidade: string;

  @Prop()
  Complemento: string;

  @Prop()
  PontoReferencia: string;

  @Prop()
  Bairro: string;

  @Prop()
  Cidade: string;

  @Prop()
  UF: string;

  @Prop()
  Latitude: string;

  @Prop()
  Longitude: string;

  @Prop()
  MostrarMapa: boolean;

  @Prop()
  EnderecoRestrito: boolean;

  @Prop()
  Perfil: string;

  @Prop()
  Mobilia: string;

  @Prop()
  PalavraDestaque: string;

  @Prop()
  ValorDe: string;

  @Prop()
  ValorRestrito: boolean;

  @Prop()
  ValorCondominio: string;

  @Prop()
  ValorIPTU: string;

  @Prop()
  ValorIPTUTipo: string;

  @Prop()
  Financiamento: boolean;

  @Prop()
  Exclusividade: boolean;

  @Prop()
  DataCadastro: string;

  @Prop()
  DataPublicacao: string;

  @Prop()
  DataEntrega: string;

  @Prop()
  AnoConclusao: number;

  @Prop()
  Situacao: string;

  @Prop()
  Especial: boolean;

  @Prop()
  AceitaPet: boolean;

  @Prop()
  AltoPadrao: boolean;

  @Prop()
  Investidor: boolean;

  @Prop()
  Garagem: string;

  @Prop()
  Suites: string;

  @Prop()
  DemiSuite: string;

  @Prop()
  SuiteMaster: string;

  @Prop()
  Banheiros: string;

  @Prop()
  Lavabos: string;

  @Prop({
    type: [{ Id: Number, Tipo: String, Dormitorios: Number, Valor: String }],
  })
  Tipo: { Id: number; Tipo: string; Dormitorios: number; Valor: string }[];

  @Prop()
  Video: string;

  @Prop()
  TourVirtual: string;

  @Prop()
  Showroom: boolean;

  @Prop()
  DependenciaEmpregada: boolean;

  @Prop()
  AreaLazer: boolean;

  @Prop()
  Piscina: boolean;

  @Prop()
  Churrasqueira: string;

  @Prop()
  Sacada: boolean;

  @Prop()
  Terraco: boolean;

  @Prop()
  Elevador: number;

  @Prop()
  Capacidade: number;

  @Prop()
  DistanciaMar: string;

  @Prop()
  ItensTemporada: string;

  @Prop()
  ReservasTemporada: string;

  @Prop({ type: [{ ID: Number, Titulo: String, Texto: String }] })
  Descricao: { Titulo: string; Texto: string }[];

  @Prop({
    type: [
      {
        ID: Number,
        Titulo: String,
        Foto_Grande: String,
        Foto_Media: String,
        Foto_Pequena: String,
        Posicao: Number,
        Pasta: String,
        Status: String,
        Data: String,
      },
    ],
  })
  Fotos: {
    ID: number;
    Titulo: string;
    Foto_Grande: string;
    Foto_Media: string;
    Foto_Pequena: string;
    Posicao: number;
    Pasta: string;
    Status: string;
    Data: string;
  }[];

  @Prop({ type: Map, of: [{ Nome: String, Categoria: String }] })
  Caracteristicas: Record<string, { Nome: string; Categoria: string }[]>;
}

export const RealEstateSchema =
  SchemaFactory.createForClass(RealEstateDocument);

RealEstateSchema.index({ ID: 1, source: 1 }, { unique: true });
RealEstateSchema.index({ Cidade: 1 });
RealEstateSchema.index({ Bairro: 1 });
RealEstateSchema.index({ 'Tipo.Dormitorios': 1 });
RealEstateSchema.index({ Preco: 1 });
RealEstateSchema.index({ DataPublicacaoISO: -1 });
