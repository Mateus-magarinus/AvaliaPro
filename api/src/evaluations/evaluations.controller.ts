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
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { EvaluationsService } from './services/evaluations.service';
import { EvaluationExportService } from './services/evaluation-export.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { CurrentUser, JwtAuthGuard } from '@common';
import { QuotaGuard } from '../plans/guards/quota.guard';
import { SubscriptionService } from '../plans/subscription.service';

@UseGuards(JwtAuthGuard)
@Controller('evaluations')
export class EvaluationsController {
  constructor(
    private readonly service: EvaluationsService,
    private readonly exportService: EvaluationExportService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @UseGuards(QuotaGuard)
  @Post()
  async createWithPreview(
    @Body() dto: CreateEvaluationDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    const result = await this.service.createWithPreview(dto, userId);
    await this.subscriptionService.incrementUsage(Number(userId));
    return result;
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
    @Query('withProperties', new ParseBoolPipe({ optional: true }))
    withProperties?: boolean,
    @Query('withPropertyCount', new ParseBoolPipe({ optional: true }))
    withPropertyCount?: boolean,
    @Query('status') status?: 'draft' | 'confirmed' | 'archived',
    @Query('q') q?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'name' | 'status',
    @Query('sortDir') sortDir?: 'ASC' | 'DESC' | 'asc' | 'desc',
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    return this.service.listMy(userId, {
      page,
      limit,
      status,
      q,
      withProperties,
      withPropertyCount,
      sortBy,
      sortDir,
    });
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

  @Post(':id/reopen')
  async reopenMy(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    return this.service.reopenMy(userId, id);
  }

  @Post(':id/enrich-ibge')
  async enrichIbge(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Query('force', new ParseBoolPipe({ optional: true })) force?: boolean,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    return this.service.enrichIbge(userId, id, !!force);
  }

  @Get(':id/export')
  async exportXlsx(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    const buffer = await this.exportService.buildXlsx(Number(userId), id);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="avaliapro-avaliacao-${id}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
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
