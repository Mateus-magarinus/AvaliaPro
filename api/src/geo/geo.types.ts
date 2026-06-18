export type PoiCategory = 'school' | 'hospital' | 'transport' | 'park';

export type Poi = {
  id: string;
  category: PoiCategory;
  name: string | null;
  lat: number;
  lng: number;
};

export type BBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

/** Filtros Overpass por categoria (cada item vira um node/way no bloco da query). */
export const OVERPASS_FILTERS: Record<PoiCategory, string[]> = {
  school: ['"amenity"="school"', '"amenity"="kindergarten"', '"amenity"="university"', '"amenity"="college"'],
  hospital: ['"amenity"="hospital"', '"amenity"="clinic"', '"healthcare"="hospital"'],
  transport: ['"highway"="bus_stop"', '"railway"="station"', '"public_transport"="station"'],
  park: ['"leisure"="park"', '"leisure"="garden"', '"boundary"="national_park"'],
};

export const ALL_CATEGORIES: PoiCategory[] = ['school', 'hospital', 'transport', 'park'];
