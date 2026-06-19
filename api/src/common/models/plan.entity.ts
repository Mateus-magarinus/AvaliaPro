import { Column, Entity, OneToMany } from 'typeorm';
import { AbstractEntity } from '../database';
import { Subscription } from './subscription.entity';

@Entity('plans')
export class Plan extends AbstractEntity<Plan> {
  @Column({ unique: true, length: 50 })
  slug: string; // 'basic' | 'standard' | 'premium'

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  /** Número de buscas por período. -1 = ilimitado. */
  @Column({ type: 'int' })
  searchesPerMonth: number;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  features: Record<string, boolean>;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @OneToMany(() => Subscription, (sub) => sub.plan)
  subscriptions: Subscription[];
}
