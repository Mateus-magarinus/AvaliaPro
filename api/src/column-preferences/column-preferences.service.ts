import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserColumnPreference } from '../common/models/user-column-preference.entity';
import {
  COLUMN_CATALOG,
  DEFAULT_VISIBLE_KEYS,
  VALID_COLUMN_KEYS,
} from './column-catalog';

export type ColumnPrefInput = {
  columnKey: string;
  visible: boolean;
  order: number;
};

export type ColumnPrefView = {
  columnKey: string;
  label: string;
  visible: boolean;
  order: number;
};

@Injectable()
export class ColumnPreferencesService {
  constructor(
    @InjectRepository(UserColumnPreference)
    private readonly repo: Repository<UserColumnPreference>,
  ) {}

  /** Retorna as preferências do usuário; se nunca personalizou, devolve o padrão. */
  async getForUser(userId: number): Promise<ColumnPrefView[]> {
    const rows = await this.repo.find({
      where: { userId },
      order: { order: 'ASC' },
    });

    if (!rows.length) return this.defaults();

    const labelByKey = new Map(COLUMN_CATALOG.map((c) => [c.key, c.label]));
    const known = rows
      .filter((r) => VALID_COLUMN_KEYS.has(r.columnKey as any))
      .map((r) => ({
        columnKey: r.columnKey,
        label: labelByKey.get(r.columnKey as any) ?? r.columnKey,
        visible: r.visible,
        order: r.order,
      }));

    // garante que colunas novas do catálogo apareçam (ocultas) ao final
    const present = new Set(known.map((k) => k.columnKey));
    let nextOrder = known.length;
    for (const c of COLUMN_CATALOG) {
      if (!present.has(c.key)) {
        known.push({
          columnKey: c.key,
          label: c.label,
          visible: false,
          order: nextOrder++,
        });
      }
    }

    return known.sort((a, b) => a.order - b.order);
  }

  /** Substitui todas as preferências do usuário (replace-all). */
  async replaceForUser(
    userId: number,
    items: ColumnPrefInput[],
  ): Promise<ColumnPrefView[]> {
    const valid = (items ?? [])
      .filter((i) => i && VALID_COLUMN_KEYS.has(i.columnKey as any))
      .map((i, idx) => ({
        userId,
        columnKey: i.columnKey,
        visible: Boolean(i.visible),
        order: Number.isFinite(i.order) ? Number(i.order) : idx,
      }));

    await this.repo.delete({ userId });
    if (valid.length) {
      await this.repo.save(valid.map((v) => this.repo.create(v)));
    }
    return this.getForUser(userId);
  }

  private defaults(): ColumnPrefView[] {
    return COLUMN_CATALOG.map((c, idx) => ({
      columnKey: c.key,
      label: c.label,
      visible: DEFAULT_VISIBLE_KEYS.has(c.key),
      order: idx,
    }));
  }
}
