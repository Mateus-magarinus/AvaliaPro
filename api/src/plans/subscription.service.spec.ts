import { SubscriptionService } from './subscription.service';

function futureDate(days = 10) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function makeService(opts: {
  plan: { name: string; searchesPerMonth: number };
  searchesUsed: number;
  periodEnd?: Date;
}) {
  const sub = {
    id: 1,
    status: 'active',
    plan: opts.plan,
    periodStart: new Date(),
    periodEnd: opts.periodEnd ?? futureDate(),
  };
  const subRepo = {
    findOne: jest.fn().mockResolvedValue(sub),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => x),
  } as any;
  const userRepo = {
    findOne: jest
      .fn()
      .mockResolvedValue({ id: 1, searchesUsed: opts.searchesUsed }),
    increment: jest.fn(),
    update: jest.fn(),
  } as any;
  const plansService = { findBySlug: jest.fn() } as any;
  return {
    service: new SubscriptionService(subRepo, userRepo, plansService),
    subRepo,
    userRepo,
  };
}

describe('SubscriptionService.checkQuota', () => {
  it('permite quando uso < limite e calcula o restante', async () => {
    const { service } = makeService({
      plan: { name: 'Básico', searchesPerMonth: 5 },
      searchesUsed: 2,
    });
    const q = await service.checkQuota(1);
    expect(q.allowed).toBe(true);
    expect(q.remaining).toBe(3);
    expect(q.searchesLimit).toBe(5);
    expect(q.planName).toBe('Básico');
  });

  it('bloqueia quando uso atingiu o limite', async () => {
    const { service } = makeService({
      plan: { name: 'Básico', searchesPerMonth: 5 },
      searchesUsed: 5,
    });
    const q = await service.checkQuota(1);
    expect(q.allowed).toBe(false);
    expect(q.remaining).toBe(0);
  });

  it('trata plano ilimitado (-1)', async () => {
    const { service } = makeService({
      plan: { name: 'Premium', searchesPerMonth: -1 },
      searchesUsed: 999,
    });
    const q = await service.checkQuota(1);
    expect(q.allowed).toBe(true);
    expect(q.remaining).toBe(-1);
  });

  it('faz rollover do período quando expirado (zera uso)', async () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    const { service, userRepo } = makeService({
      plan: { name: 'Básico', searchesPerMonth: 5 },
      searchesUsed: 5,
      periodEnd: past,
    });
    await service.checkQuota(1);
    // rollover deve zerar searchesUsed do usuário
    expect(userRepo.update).toHaveBeenCalledWith(
      { id: 1 },
      { searchesUsed: 0 },
    );
  });
});
