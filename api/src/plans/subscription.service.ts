import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../common/models/subscription.entity';
import { User } from '../common/models/user.entity';
import { PlansService } from './plans.service';

export type QuotaStatus = {
  allowed: boolean;
  searchesUsed: number;
  searchesLimit: number;
  remaining: number;
  planName: string;
  periodEnd: Date;
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly plansService: PlansService,
  ) {}

  async createFreeForUser(userId: number): Promise<Subscription> {
    const plan = await this.plansService.findBySlug('basic');
    const now = new Date();
    const sub = this.subRepo.create({
      user: { id: userId } as User,
      plan,
      status: 'active',
      periodStart: now,
      periodEnd: addDays(now, 30),
    });
    return this.subRepo.save(sub);
  }

  async getActiveForUser(userId: number): Promise<Subscription | null> {
    return this.subRepo.findOne({
      where: { user: { id: userId }, status: 'active' },
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Verifica (e renova o período se expirado) e retorna status de quota.
   * Cria assinatura Básica automaticamente se o usuário não tiver nenhuma.
   */
  async checkQuota(userId: number): Promise<QuotaStatus> {
    let sub = await this.getActiveForUser(userId);

    if (!sub) {
      sub = await this.createFreeForUser(userId);
      this.logger.warn(`Auto-created free subscription for user ${userId}`);
    }

    const now = new Date();
    if (sub.periodEnd < now) {
      sub = await this.rolloverPeriod(sub, userId);
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    const searchesUsed = user?.searchesUsed ?? 0;
    const limit = sub.plan.searchesPerMonth;
    const unlimited = limit === -1;
    const allowed = unlimited || searchesUsed < limit;

    return {
      allowed,
      searchesUsed,
      searchesLimit: limit,
      remaining: unlimited ? -1 : Math.max(0, limit - searchesUsed),
      planName: sub.plan.name,
      periodEnd: sub.periodEnd,
    };
  }

  async incrementUsage(userId: number): Promise<void> {
    await this.userRepo.increment({ id: userId }, 'searchesUsed', 1);
  }

  async getMyStatus(userId: number) {
    return this.checkQuota(userId);
  }

  async upgrade(userId: number, planSlug: string): Promise<QuotaStatus> {
    const plan = await this.plansService.findBySlug(planSlug);
    if (!plan) {
      throw new NotFoundException(`Plano '${planSlug}' não encontrado`);
    }

    const now = new Date();
    const sub = await this.getActiveForUser(userId);

    if (sub) {
      sub.plan = plan;
      sub.periodStart = now;
      sub.periodEnd = addDays(now, 30);
      await this.subRepo.save(sub);
    } else {
      const newSub = this.subRepo.create({
        user: { id: userId } as User,
        plan,
        status: 'active',
        periodStart: now,
        periodEnd: addDays(now, 30),
      });
      await this.subRepo.save(newSub);
    }

    await this.userRepo.update({ id: userId }, { searchesUsed: 0 });
    this.logger.log(`User ${userId} upgraded to plan '${planSlug}'`);
    return this.checkQuota(userId);
  }

  private async rolloverPeriod(sub: Subscription, userId: number): Promise<Subscription> {
    this.logger.log(`Rolling over subscription period for user ${userId}`);
    const now = new Date();
    sub.periodStart = now;
    sub.periodEnd = addDays(now, 30);
    await this.subRepo.save(sub);
    await this.userRepo.update({ id: userId }, { searchesUsed: 0 });
    return sub;
  }
}
