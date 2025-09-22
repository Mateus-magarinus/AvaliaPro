import { Controller, Post } from '@nestjs/common';
import { RealEstateService } from './real-estate.service';

@Controller('real-estate')
export class RealEstateController {
  constructor(private readonly realEstateService: RealEstateService) {}

  @Post('sync/coligadas')
  async syncColigadas() {
    return this.realEstateService.syncColigadas();
  }
}
