import { Entity, ManyToOne, Column } from 'typeorm';
import { AbstractEntity } from '../database';
import { Evaluation } from './evaluation.entity';

@Entity('properties')
export class Property extends AbstractEntity<Property> {
  @ManyToOne(() => Evaluation, (evaluation) => evaluation.properties, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  evaluation: Evaluation;

  @Column({ type: 'varchar', length: 255 })
  city: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  neighborhood: string | null;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  ibgeIncome: number;

  @Column({ type: 'int', nullable: true })
  bedrooms: number;

  @Column({ type: 'int', nullable: true })
  bathrooms: number;

  @Column({ type: 'int', nullable: true })
  garageSpots: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalArea: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalValue: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactLink: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contactPhone: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-array', nullable: true })
  images: string[];
}
