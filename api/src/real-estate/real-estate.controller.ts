import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { RealEstateService } from './real-estate.service';

@Controller('real-estate')
export class RealEstateController {
  constructor(private readonly realEstateService: RealEstateService) {}

  /** Cidades (com UF) e respectivos bairros do catálogo, para os filtros. */
  @Get('locations')
  async locations() {
    const cities = await this.realEstateService.getLocations();
    return { count: cities.length, cities };
  }

  @Post('locations/refresh')
  async refreshLocations() {
    const cities = await this.realEstateService.refreshLocationsCache();
    return { count: cities.length, cities };
  }

  @Post('sync/coligadas')
  async syncColigadas() {
    return this.realEstateService.syncColigadas();
  }

  @Post('sync/coligadas/:id')
  async syncColigadasOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('link') queryLink?: string,
    @Body('link') bodyLink?: string,
  ) {
    return this.realEstateService.syncColigadasOne(
      id,
      bodyLink ?? queryLink ?? null,
    );
  }
}
