import { Body, Controller, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { RealEstateService } from './real-estate.service';

@Controller('real-estate')
export class RealEstateController {
  constructor(private readonly realEstateService: RealEstateService) {}

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
