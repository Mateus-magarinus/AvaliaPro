import { Column, Entity, ManyToOne } from 'typeorm';
import { AbstractEntity } from '../database';
import { User } from './user.entity';
import { Plan } from './plan.entity';

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due';

@Entity('subscriptions')
export class Subscription extends AbstractEntity<Subscription> {
  @ManyToOne(() => User, (user) => user.subscriptions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Plan, (plan) => plan.subscriptions, {
    nullable: false,
    eager: true,
  })
  plan: Plan;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: SubscriptionStatus;

  @Column({ type: 'timestamp' })
  periodStart: Date;

  @Column({ type: 'timestamp' })
  periodEnd: Date;
}
