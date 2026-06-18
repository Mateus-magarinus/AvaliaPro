import { CensusService } from './census.service';

const cacheMock = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn(),
  wrap: jest.fn((_k: string, _ttl: number, factory: () => any) => factory()),
} as any;

const configMock = { get: () => undefined } as any;

function withDataset() {
  const service = new CensusService(configMock, cacheMock);
  (service as any).dataset = {
    municipios: {
      '4314100': [
        { lat: -28.26, lng: -52.4, income: 3000 },
        { lat: -28.3, lng: -52.5, income: 1000 },
      ],
    },
  };
  return service;
}

describe('CensusService.getIncomeForPoint', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna a renda do setor mais próximo da coordenada', async () => {
    const service = withDataset();
    const income = await service.getIncomeForPoint(-28.261, -52.401, 4314100);
    expect(income).toBe(3000);
  });

  it('retorna a renda do outro setor quando a coordenada está mais perto dele', async () => {
    const service = withDataset();
    const income = await service.getIncomeForPoint(-28.299, -52.499, 4314100);
    expect(income).toBe(1000);
  });

  it('retorna null quando o município não está no dataset', async () => {
    const service = withDataset();
    const income = await service.getIncomeForPoint(-28.26, -52.4, 9999999);
    expect(income).toBeNull();
  });

  it('retorna null quando não há dataset carregado', async () => {
    const service = new CensusService(configMock, cacheMock);
    const income = await service.getIncomeForPoint(-28.26, -52.4, 4314100);
    expect(income).toBeNull();
  });

  it('retorna null para coordenada inválida', async () => {
    const service = withDataset();
    const income = await service.getIncomeForPoint(null, null, 4314100);
    expect(income).toBeNull();
  });
});
