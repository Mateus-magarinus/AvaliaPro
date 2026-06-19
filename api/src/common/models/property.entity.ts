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

  /** Renda média do MUNICÍPIO (IBGE/agregados). Baseline sempre disponível. */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  ibgeIncome: number;

  /** Renda média do SETOR CENSITÁRIO (Censo 2022) pela coordenada. Pode ser nulo. */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  sectorIncome: number;

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

  // ===== Metadados de origem (rastreabilidade da amostra) =====
  @Column({ type: 'varchar', length: 50, nullable: true })
  source: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  externalId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  code: string | null; // código/referência do anúncio

  @Column({ type: 'varchar', length: 2, nullable: true })
  state: string | null; // UF

  @Column({ type: 'varchar', length: 100, nullable: true })
  propertyType: string | null; // categoria/perfil

  // ===== Características =====
  @Column({ type: 'int', nullable: true })
  suites: number | null;

  @Column({ type: 'boolean', nullable: true })
  pool: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  balcony: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  elevator: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  leisureArea: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  barbecue: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  petFriendly: boolean | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  furniture: string | null; // mobília (texto)

  @Column({ type: 'boolean', nullable: true })
  highStandard: boolean | null;
}
