import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../common/models/plan.entity';

const SEED_PLANS: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'subscriptions'>[] = [
  {
    slug: 'basic',
    name: 'Básico',
    price: 0,
    searchesPerMonth: 5,
    features: { export_excel: true, map_view: true },
    active: true,
  },
  {
    slug: 'standard',
    name: 'Padrão',
    price: 49.9,
    searchesPerMonth: 30,
    features: { export_excel: true, map_view: true, ibge_data: true },
    active: true,
  },
  {
    slug: 'premium',
    name: 'Premium',
    price: 99.9,
    searchesPerMonth: -1,
    features: { export_excel: true, map_view: true, ibge_data: true, priority_support: true },
    active: true,
  },
];

@Injectable()
export class PlansService implements OnModuleInit {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
  ) {}

  async onModuleInit() {
    for (const seed of SEED_PLANS) {
      const existing = await this.planRepo.findOne({ where: { slug: seed.slug } });
      if (!existing) {
        await this.planRepo.save(this.planRepo.create(seed as Plan));
        this.logger.log(`Seeded plan: ${seed.slug}`);
      }
    }
  }

  findAll() {
    return this.planRepo.find({ where: { active: true }, order: { price: 'ASC' } });
  }

  findBySlug(slug: string) {
    return this.planRepo.findOne({ where: { slug, active: true } });
  }
}
