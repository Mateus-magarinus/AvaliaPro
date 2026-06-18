import { Column, Entity, Index, Unique } from 'typeorm';
import { AbstractEntity } from '../database';

/**
 * Preferência de exibição de coluna na tabela de resultados, por usuário.
 * Uma linha por (usuário, coluna).
 */
@Entity('user_column_preferences')
@Unique(['userId', 'columnKey'])
export class UserColumnPreference extends AbstractEntity<UserColumnPreference> {
  @Index()
  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 50 })
  columnKey: string;

  @Column({ type: 'boolean', default: true })
  visible: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;
}
