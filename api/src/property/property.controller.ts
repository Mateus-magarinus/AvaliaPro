import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyService } from './services/property.service';

@UseGuards(AuthGuard('jwt'))
@Controller('properties')
export class PropertyController {
  constructor(private readonly service: PropertyService) {}

  @Post()
  async create(@Req() req: Request, @Body() dto: CreatePropertyDto) {
    const userId = (req as any).user?.id;
    return this.service.createOne(String(userId), dto);
  }

  @Get(':id')
  async getOne(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user?.id;
    return this.service.getOne(id, String(userId));
  }

  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    const userId = (req as any).user?.id;
    return this.service.updateOne(id, String(userId), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user?.id;
    await this.service.deleteOne(id, String(userId));
  }

  // LISTA (evaluationId obrigatório; filtros opcionais)
  @Get()
  async list(
    @Req() req: Request,
    @Query('evaluationId') evaluationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort')
    sort?: 'totalValue' | 'totalArea' | 'unitValue' | 'bedrooms' | 'bathrooms',
    @Query('order') order?: 'asc' | 'desc',
    @Query('city') city?: string,
    @Query('neighborhood') neighborhood?: string,
    @Query('bedrooms') bedrooms?: string,
    @Query('bathrooms') bathrooms?: string,
    @Query('garageSpots') garageSpots?: string,
    @Query('totalValueMin') totalValueMin?: string,
    @Query('totalValueMax') totalValueMax?: string,
    @Query('totalAreaMin') totalAreaMin?: string,
    @Query('totalAreaMax') totalAreaMax?: string,
    @Query('unitValueMin') unitValueMin?: string,
    @Query('unitValueMax') unitValueMax?: string,
  ) {
    const userId = (req as any).user?.id;
    return this.service.list(String(userId), {
      evaluationId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort,
      order,
      city,
      neighborhood,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      garageSpots: garageSpots ? Number(garageSpots) : undefined,
      totalValueMin: totalValueMin ? Number(totalValueMin) : undefined,
      totalValueMax: totalValueMax ? Number(totalValueMax) : undefined,
      totalAreaMin: totalAreaMin ? Number(totalAreaMin) : undefined,
      totalAreaMax: totalAreaMax ? Number(totalAreaMax) : undefined,
      unitValueMin: unitValueMin ? Number(unitValueMin) : undefined,
      unitValueMax: unitValueMax ? Number(unitValueMax) : undefined,
    });
  }

  // util: recalcular unitValue ausente
  @Post('recalc')
  async recalc(
    @Req() req: Request,
    @Query('evaluationId') evaluationId: string,
  ) {
    const userId = (req as any).user?.id;
    return this.service.recalcUnitValuesForEvaluation(
      evaluationId,
      String(userId),
    );
  }
}
