import { Entity, ManyToOne, Column, OneToMany } from 'typeorm';
import { AbstractEntity } from '../database';
import { User } from './user.entity';
import { Property } from './property.entity';

export enum AdType {
  SALE = 'Venda',
  RENT = 'Aluguel',
}

@Entity()
export class Evaluation extends AbstractEntity<Evaluation> {
  @ManyToOne(() => User, (user) => user.evaluations, { eager: true })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  propertyType: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  neighborhood: string;

  @Column({ type: 'int', nullable: true })
  bedrooms: number;

  @Column({ type: 'int', nullable: true })
  garage: number;

  @Column({ type: 'int', nullable: true })
  bathrooms: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceMin: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceMax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  areaMin: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  areaMax: number;

  @Column({
    type: 'enum',
    enum: AdType,
    nullable: true,
  })
  adType: AdType;

  @OneToMany(() => Property, (property) => property.evaluation)
  properties: Property[];
}
