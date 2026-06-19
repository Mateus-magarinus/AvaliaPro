import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../common/models/user.entity';
import { Subscription } from '../common/models/subscription.entity';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Promove a admin os e-mails listados em ADMIN_EMAIL (separados por vírgula),
   * de forma idempotente, na inicialização. Comparação case-insensitive.
   */
  async onModuleInit() {
    const raw = this.config.get<string>('ADMIN_EMAIL');
    if (!raw) return;
    const emails = raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!emails.length) return;

    try {
      const res = await this.userRepo
        .createQueryBuilder()
        .update(User)
        .set({ role: 'admin' })
        .where('LOWER(email) IN (:...emails) AND role <> :role', {
          emails,
          role: 'admin',
        })
        .execute();
      if (res.affected) {
        this.logger.log(`Bootstrap admin: ${res.affected} usuário(s) promovido(s) (${emails.join(', ')}).`);
      }
    } catch (err) {
      this.logger.warn(`Falha no bootstrap de admin: ${(err as Error).message}`);
    }
  }

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
