import { BeforeInsert, Column, Entity, OneToMany, Unique } from 'typeorm';
import { AbstractEntity } from '../database';
import { Evaluation } from './evaluation.entity';
import * as bcrypt from 'bcrypt';

@Entity()
@Unique(['email'])
export class User extends AbstractEntity<User> {
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'user'],
    default: 'user',
  })
  role: 'admin' | 'user';

  @OneToMany(() => Evaluation, (evaluation) => evaluation.user, {
    cascade: true,
  })
  evaluations?: Evaluation[];

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 5 })
  credits: number;

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
