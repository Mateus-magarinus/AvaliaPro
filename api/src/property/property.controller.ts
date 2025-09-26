import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@common';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyService } from './services/property.service';

@UseGuards(JwtAuthGuard)
@Controller('properties')
export class PropertyController {
  constructor(private readonly service: PropertyService) { }

  @Post()
  async create(
    @Body() dto: CreatePropertyDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    const { evaluationId, ...data } = dto as any;
    return this.service.createManual(String(userId), String(evaluationId), data);
  }

  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    return this.service.getOwned(String(userId), id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    return this.service.updateOwned(String(userId), id, dto as any);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    await this.service.deleteOwned(String(userId), id);
    return { ok: true };
  }

  @Get()
  async list(
    @CurrentUser() user: any,
    @Query('evaluationId') evaluationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    return this.service.listByEvaluation(String(userId), String(evaluationId), {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post(':id/recalc')
  async recalcOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    return this.service.recalcUnitValueForProperty(String(userId), id);
  }

  @Post('recalc')
  async recalcAll(
    @Query('evaluationId') evaluationId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    return this.service.recalcUnitValuesForEvaluation(String(userId), String(evaluationId));
  }
}
