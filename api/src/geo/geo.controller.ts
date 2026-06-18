import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common';
import { GeoService } from './geo.service';
import { ALL_CATEGORIES, PoiCategory } from './geo.types';

@UseGuards(JwtAuthGuard)
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  /**
   * POIs (escolas, hospitais, transporte, parques) dentro de um bounding box.
   * Ex.: GET /geo/pois?south=-28.30&west=-52.45&north=-28.20&east=-52.35&categories=school,hospital
   */
  @Get('pois')
  async pois(
    @Query('south') south: string,
    @Query('west') west: string,
    @Query('north') north: string,
    @Query('east') east: string,
    @Query('categories') categories?: string,
  ) {
    const bbox = {
      south: Number(south),
      west: Number(west),
      north: Number(north),
      east: Number(east),
    };

    const cats = (categories
      ? categories.split(',').map((c) => c.trim())
      : ALL_CATEGORIES
    ).filter((c): c is PoiCategory => ALL_CATEGORIES.includes(c as PoiCategory));

    const pois = await this.geoService.fetchPois(bbox, cats);
    return { count: pois.length, pois };
  }
}
