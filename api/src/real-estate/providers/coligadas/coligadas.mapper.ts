import { Injectable } from '@nestjs/common';

// helpers
const toBRNumber = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const toInt = (v: any) =>
  v === null || v === undefined || v === ''
    ? undefined
    : parseInt(String(v), 10);
const toBool = (v: any) =>
  v === true ||
  v === 1 ||
  v === '1' ||
  (typeof v === 'string' &&
    v.length > 0 &&
    v.toLowerCase() !== 'false' &&
    v !== '0');
const brDateToISO = (d?: string) => {
  if (!d) return undefined;
  const [dd, mm, yyyy] = d.split('/');
  return yyyy && mm && dd ? `${yyyy}-${mm}-${dd}` : undefined;
};

function normalizeYoutubeUrl(url: string): string {
  if (!url) return '';
  const s = url.trim();

  // conserta casos "https://www.youtube.com/embed/https://youtu.be/XYZ"
  const fixed = s.replace(
    /^https:\/\/www\.youtube\.com\/embed\/https:\/\/youtu\.be\//i,
    'https://www.youtube.com/embed/',
  );

  // extrai ID em formatos comuns
  const mShort = /youtu\.be\/([A-Za-z0-9_-]{6,})/i.exec(fixed);
  const mQuery = /[?&]v=([A-Za-z0-9_-]{6,})/i.exec(fixed);
  const mEmbed = /\/embed\/([A-Za-z0-9_-]{6,})/i.exec(fixed);
  const id = mShort?.[1] || mQuery?.[1] || mEmbed?.[1];

  return id ? `https://www.youtube.com/embed/${id}` : fixed;
}

function pickFirstVideo(v: any): string | null {
  // aceita array, objeto { Video }, ou string
  if (Array.isArray(v)) {
    const first = v.find((x) => typeof x?.Video === 'string')?.Video;
    return first ? normalizeYoutubeUrl(first) : null;
  }
  if (v && typeof v === 'object' && typeof v.Video === 'string') {
    return normalizeYoutubeUrl(v.Video);
  }
  if (typeof v === 'string') {
    return normalizeYoutubeUrl(v);
  }
  return null;
}

@Injectable()
export class ColigadasMapper {
  toRealEstateDoc(raw: any) {
    const firstType = raw?.Tipo?.[0] || {};
    const asking = firstType?.Valor ? toBRNumber(firstType.Valor) : null;

    // Monte apenas os campos que seu schema tem hoje.
    // Campos ausentes serão ignorados pelo Mongoose se não existirem no schema.
    const doc: any = {
      source: 'coligadas',
      ID: Number(raw.ID),
      Codigo: String(raw.Codigo ?? raw.ID),
      URL: raw.URL,
      Link: raw.Link,
      Categoria: raw.Categoria, // Vendas/Locações/...
      Anuncio: raw.Anuncio ?? raw.Nome ?? null,
      Cidade: raw.Cidade,
      Bairro: raw.Bairro,
      UF: raw.UF,
      Endereco: raw.Endereco,
      Latitude: toBRNumber(raw.Latitude),
      Longitude: toBRNumber(raw.Longitude),
      Perfil: raw.Perfil,
      ValorDe: raw.ValorDe,
      ValorRestrito: !!raw.ValorRestrito,
      DataCadastro: brDateToISO(raw.DataCadastro),
      DataPublicacao: brDateToISO(raw.DataPublicacao),
      Garagem: toInt(raw.Garagem) ?? 0,
      Suites: toInt(raw.Suites) ?? 0,
      Banheiros: toInt(raw.Banheiros) ?? 0,
      AreaPrivativa: toBRNumber(raw.AreaPrivativa),
      AreaTotal: toBRNumber(raw.AreaTotal),
      Tipo: raw?.Tipo ?? [],
      Preco: asking, // caso você tenha um campo numérico consolidado
      Fotos: Array.isArray(raw.Fotos)
        ? raw.Fotos.filter((f: any) => toBool(f.Status)).sort(
            (a: any, b: any) => (a.Posicao ?? 0) - (b.Posicao ?? 0),
          )
        : [],
      Video: pickFirstVideo(raw.Video),
      TourVirtual: pickFirstVideo(raw.TourVirtual),
      Agenciador: raw.Agenciador || undefined,
      Exclusividade: !!raw.Exclusividade,
      Especial: !!raw.Especial,
      AltoPadrao: !!raw.AltoPadrao,
    };
    return doc;
  }
}
