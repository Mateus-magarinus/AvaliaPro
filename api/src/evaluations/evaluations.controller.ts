import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EvaluationsService } from './services/evaluations.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { CurrentUser, JwtAuthGuard } from '@common';

@UseGuards(JwtAuthGuard)
@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly service: EvaluationsService) { }

  @Post()
  async createWithPreview(
    @Body() dto: CreateEvaluationDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    return this.service.createWithPreview(dto, userId);
  }

  @Post('preview')
  async preview(
    @Body('filters') filters: CreateEvaluationDto['filters'],
    @Query('limit') limit?: string,
  ) {
    const n = Number(limit);
    const parsed = Number.isFinite(n) ? n : 10;
    return this.service.preview(filters, parsed);
  }

  @Get()
  async listMy(
    @CurrentUser() user: any,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: 'draft' | 'confirmed' | 'archived',
    @Query('q') q?: string,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    return this.service.listMy(userId, { page, limit, status, q });
  }

  @Get(':id')
  async getMyById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Query('withProperties', new ParseBoolPipe({ optional: true }))
    withProperties?: boolean,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    return this.service.getMyById(userId, id, !!withProperties);
  }

  @Patch(':id')
  async updateMy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEvaluationDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    return this.service.updateMy(userId, id, dto);
  }

  @Post(':id/confirm')
  async confirmMy(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    return this.service.confirmMy(userId, id);
  }

  @Delete(':id')
  async archiveMy(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    return this.service.archiveMy(userId, id);
  }
}
