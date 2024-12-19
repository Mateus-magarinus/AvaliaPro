import { Column, Entity, OneToMany, Unique } from 'typeorm';
import { AbstractEntity } from '../database';
import { Evaluation } from './evaluation.entity';

@Entity()
@Unique(['email'])
export class User extends AbstractEntity<User> {
  @Column({ length: 255 })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: ['Admin', 'User'],
    default: 'User',
  })
  role: 'Admin' | 'User';

  @OneToMany(() => Evaluation, (evaluation) => evaluation.user, {
    cascade: true,
  })
  evaluations?: Evaluation[];

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 5 })
  credits: number;
}
