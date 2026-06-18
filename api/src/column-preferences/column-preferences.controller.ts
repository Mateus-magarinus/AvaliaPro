import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '@common';
import { ColumnPrefInput, ColumnPreferencesService } from './column-preferences.service';
import { COLUMN_CATALOG } from './column-catalog';

@UseGuards(JwtAuthGuard)
@Controller('column-preferences')
export class ColumnPreferencesController {
  constructor(private readonly service: ColumnPreferencesService) {}

  @Get()
  async getMine(@CurrentUser() user: any) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    const columns = await this.service.getForUser(Number(userId));
    return { catalog: COLUMN_CATALOG, columns };
  }

  @Put()
  async updateMine(
    @CurrentUser() user: any,
    @Body('columns') columns: ColumnPrefInput[],
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    const updated = await this.service.replaceForUser(Number(userId), columns ?? []);
    return { catalog: COLUMN_CATALOG, columns: updated };
  }
}
