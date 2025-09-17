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
import { EvaluationsService } from './services/evaluations.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';

class AttachFromDocsDto {
  docs!: any[];
}

@UseGuards(AuthGuard('jwt'))
@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly service: EvaluationsService) {}

  // LISTAR (paginado)
  @Get()
  async list(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = (req as any).user?.id;
    return this.service.list(String(userId), {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // CRIAR
  @Post()
  async create(@Req() req: Request, @Body() dto: CreateEvaluationDto) {
    const userId = (req as any).user?.id;
    return this.service.create(String(userId), dto);
  }

  // DETALHE
  @Get(':id')
  async getById(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user?.id;
    return this.service.getById(id, String(userId));
  }

  // ATUALIZAR
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateEvaluationDto,
  ) {
    const userId = (req as any).user?.id;
    return this.service.update(id, String(userId), dto);
  }

  // REMOVER
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user?.id;
    await this.service.delete(id, String(userId));
  }

  // ANEXAR COMPARÁVEIS (docs Mongo)
  @Post(':id/properties/from-docs')
  async attachFromDocs(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: AttachFromDocsDto,
    @Query('enrichIBGE') enrichIBGE?: string,
  ) {
    const userId = (req as any).user?.id;
    const useIBGE = ['1', 'true', 'yes', 'on'].includes(
      String(enrichIBGE ?? '').toLowerCase(),
    );

    return this.service.attachComparablesFromDocs(
      id,
      String(userId),
      body?.docs ?? [],
      {
        enrichIBGE: useIBGE ? async () => null : undefined,
      },
    );
  }

  // REMOVER UM COMPARÁVEL
  @Delete(':id/properties/:propertyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeComparable(
    @Req() req: Request,
    @Param('id') _id: string,
    @Param('propertyId') propertyId: string,
  ) {
    const userId = (req as any).user?.id;
    await this.service.removeComparable(propertyId, String(userId));
  }

  // ESTATÍSTICAS
  @Get(':id/stats')
  async computeStats(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user?.id;
    return this.service.computeStats(id, String(userId));
  }

  // CONFIRMAR AVALIAÇÃO
  @Post(':id/confirm')
  async confirm(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user?.id;
    return this.service.confirm(id, String(userId));
  }

  @Get(':id/search')
  async preview(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: 'recency' | 'price',
  ) {
    const userId = (req as any).user?.id;
    return this.service.previewComparables(id, String(userId), {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort,
    });
  }

  // Anexar por IDs externos
  @Post(':id/properties/by-ids')
  async attachByIds(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { ids: string[]; source?: string },
  ) {
    const userId = (req as any).user?.id;
    return this.service.attachComparablesByIds(id, String(userId), body);
  }
}
