import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../common/models/user.entity';
import { Subscription } from '../common/models/subscription.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
  ) {}

  async findAllUsers() {
    const users = await this.userRepo.find({
      order: { createdAt: 'DESC' },
      take: 200,
    });

    const subs = await this.subRepo.find({
      where: { status: 'active' },
      relations: { plan: true, user: true },
    });

    const subByUser = new Map<number, Subscription>();
    for (const sub of subs) {
      const uid = sub.user?.id;
      if (!uid) continue;
      const existing = subByUser.get(uid);
      if (!existing || sub.createdAt > existing.createdAt) {
        subByUser.set(uid, sub);
      }
    }

    return users.map((user) => {
      const sub = subByUser.get(user.id) ?? null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        searchesUsed: user.searchesUsed ?? 0,
        createdAt: user.createdAt,
        plan: sub?.plan?.name ?? 'Sem plano',
        planSlug: sub?.plan?.slug ?? null,
        periodEnd: sub?.periodEnd ?? null,
      };
    });
  }
}
