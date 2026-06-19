import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common';
import { IbgeService } from './ibge.service';

@UseGuards(JwtAuthGuard)
@Controller('ibge')
export class IbgeController {
  constructor(private readonly ibgeService: IbgeService) {}

  /** Salário médio mensal de um município (consulta direta, com cache). */
  @Get('income')
  async income(@Query('city') city: string, @Query('uf') uf: string) {
    const income = await this.ibgeService.getAverageIncome(city, uf ?? 'RS');
    return { city, uf: uf ?? 'RS', averageIncome: income };
  }

  /** Centróide (lat/lng) do município — usado para centralizar o mapa. */
  @Get('centroid')
  async centroid(@Query('city') city: string, @Query('uf') uf: string) {
    const centroid = await this.ibgeService.getMunicipalityCentroid(city, uf ?? 'RS');
    return { city, uf: uf ?? 'RS', centroid };
  }
}
