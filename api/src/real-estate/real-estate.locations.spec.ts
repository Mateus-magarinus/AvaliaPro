import { RealEstateService } from './real-estate.service';

const cacheMock = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn(),
  wrap: jest.fn((_k: string, _ttl: number, factory: () => any) => factory()),
} as any;

const configMock = { get: () => 6 } as any;

describe('RealEstateService.getLocations (limpeza de bairros)', () => {
  it('remove bairros inválidos e unifica duplicatas por caixa', async () => {
    const repository = {
      aggregateLocations: jest.fn().mockResolvedValue([
        {
          uf: 'RS',
          city: 'Passo Fundo',
          bairros: [
            'CENTRO',
            'Centro',
            '-',
            '0',
            '99009',
            '',
            'Boqueirão',
            'boqueirao',
          ],
        },
      ]),
    } as any;

    const service = new RealEstateService(
      repository,
      {} as any,
      {} as any,
      configMock,
      cacheMock,
    );
    const cities = await service.getLocations();

    expect(cities).toHaveLength(1);
    const bairros = cities[0].neighborhoods;

    // lixo removido
    expect(bairros).not.toContain('-');
    expect(bairros).not.toContain('0');
    expect(bairros).not.toContain('99009');
    expect(bairros).not.toContain('');

    // "CENTRO" + "Centro" viram um só, com grafia bonita
    expect(bairros.filter((b) => b.toLowerCase() === 'centro')).toEqual([
      'Centro',
    ]);

    // "Boqueirão"/"boqueirao" deduplicados (acento-insensível)
    expect(
      bairros.filter((b) => b.toLowerCase().startsWith('boqueir')),
    ).toHaveLength(1);
  });
});
