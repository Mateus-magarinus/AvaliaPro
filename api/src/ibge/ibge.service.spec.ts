import { of } from 'rxjs';
import { IbgeService } from './ibge.service';

const cacheMock = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn(),
  wrap: jest.fn((_k: string, _ttl: number, factory: () => any) => factory()),
} as any;

const configMock = {
  get: (k: string) =>
    (
      ({
        IBGE_AGREGADO: 1685,
        IBGE_VARIAVEL: 10143,
        IBGE_TIMEOUT_MS: 8000,
        IBGE_CACHE_TTL_DAYS: 30,
      }) as any
    )[k],
} as any;

function httpMock(municipios: any[], serie: Record<string, string>) {
  return {
    get: jest.fn((url: string) => {
      if (url.includes('/localidades/')) return of({ data: municipios });
      if (url.includes('/agregados/')) {
        return of({ data: [{ resultados: [{ series: [{ serie }] }] }] });
      }
      return of({ data: null });
    }),
  } as any;
}

describe('IbgeService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolve o código do município por nome + UF (ignorando acentos/caixa)', async () => {
    const http = httpMock([{ id: 4314100, nome: 'Passo Fundo' }], {});
    const service = new IbgeService(http, configMock, cacheMock);
    const code = await service.resolveMunicipalityCode('passo fundo', 'rs');
    expect(code).toBe(4314100);
  });

  it('retorna null quando o município não existe na UF', async () => {
    const http = httpMock([{ id: 4314100, nome: 'Passo Fundo' }], {});
    const service = new IbgeService(http, configMock, cacheMock);
    const code = await service.resolveMunicipalityCode(
      'Cidade Inexistente',
      'RS',
    );
    expect(code).toBeNull();
  });

  it('extrai o valor de renda mais recente da série do IBGE', async () => {
    const http = httpMock([{ id: 4314100, nome: 'Passo Fundo' }], {
      '2019': '2500.00',
      '2021': '3009.00',
    });
    const service = new IbgeService(http, configMock, cacheMock);
    const income = await service.getAverageIncome('Passo Fundo', 'RS');
    expect(income).toBe(3009);
  });

  it('retorna null quando a série está vazia', async () => {
    const http = httpMock([{ id: 4314100, nome: 'Passo Fundo' }], {});
    const service = new IbgeService(http, configMock, cacheMock);
    const income = await service.getAverageIncome('Passo Fundo', 'RS');
    expect(income).toBeNull();
  });
});
