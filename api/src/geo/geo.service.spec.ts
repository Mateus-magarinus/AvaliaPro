import { GeoService } from './geo.service';

const cacheMock = { get: jest.fn(), set: jest.fn(), wrap: jest.fn() } as any;
const configMock = { get: () => undefined } as any;
const httpMock = { post: jest.fn() } as any;

describe('GeoService', () => {
  const service = new GeoService(httpMock, configMock, cacheMock);

  it('valida bounding box inválido (sul >= norte)', () => {
    expect(() =>
      (service as any).validateBBox({
        south: -28.2,
        west: -52.5,
        north: -28.3,
        east: -52.4,
      }),
    ).toThrow();
  });

  it('valida área excessivamente grande', () => {
    expect(() =>
      (service as any).validateBBox({
        south: -29,
        west: -53,
        north: -27,
        east: -51,
      }),
    ).toThrow();
  });

  it('monta a query Overpass com os filtros da categoria', () => {
    const q = (service as any).buildQuery(
      { south: -28.3, west: -52.5, north: -28.2, east: -52.4 },
      ['hospital'],
    );
    expect(q).toContain('[out:json]');
    expect(q).toContain('node["amenity"="hospital"]');
  });

  it('classifica elementos por categoria a partir das tags', () => {
    expect(
      (service as any).classify({ amenity: 'hospital' }, ['hospital']),
    ).toBe('hospital');
    expect(
      (service as any).classify({ amenity: 'school' }, ['hospital']),
    ).toBeNull();
  });

  it('faz parse da resposta do Overpass (node e way com center)', () => {
    const data = {
      elements: [
        {
          type: 'node',
          id: 1,
          lat: -28.27,
          lon: -52.41,
          tags: { amenity: 'hospital', name: 'Hosp A' },
        },
        {
          type: 'way',
          id: 2,
          center: { lat: -28.28, lon: -52.38 },
          tags: { amenity: 'school' },
        },
        { type: 'node', id: 3, tags: { amenity: 'hospital' } }, // sem coordenada -> ignorado
      ],
    };
    const pois = (service as any).parseResponse(data, ['hospital', 'school']);
    expect(pois).toHaveLength(2);
    expect(pois[0]).toMatchObject({ category: 'hospital', name: 'Hosp A' });
    expect(pois[1]).toMatchObject({ category: 'school', name: null });
  });
});
