/**
 * Catálogo canônico de colunas disponíveis na tabela de resultados.
 * O backend valida as preferências do usuário contra esta lista.
 */
export const COLUMN_CATALOG = [
  { key: 'city', label: 'Município' },
  { key: 'neighborhood', label: 'Bairro' },
  { key: 'address', label: 'Endereço' },
  { key: 'totalValue', label: 'Valor total' },
  { key: 'unitValue', label: 'Valor/m²' },
  { key: 'totalArea', label: 'Área' },
  { key: 'bedrooms', label: 'Quartos' },
  { key: 'bathrooms', label: 'Banheiros' },
  { key: 'garageSpots', label: 'Garagem' },
  { key: 'ibgeIncome', label: 'Renda IBGE' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
  { key: 'contactLink', label: 'Link' },
] as const;

export const VALID_COLUMN_KEYS = new Set(COLUMN_CATALOG.map((c) => c.key));

/** Colunas exibidas por padrão (quando o usuário ainda não personalizou). */
export const DEFAULT_VISIBLE_KEYS = new Set([
  'city',
  'neighborhood',
  'address',
  'totalValue',
  'totalArea',
  'bedrooms',
  'ibgeIncome',
  'contactLink',
]);
