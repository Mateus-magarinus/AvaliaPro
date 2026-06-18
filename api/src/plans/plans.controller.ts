import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard, CurrentUser } from '@common';

@Controller('plans')
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Get()
  findAll() {
    return this.plansService.findAll();
  }
}

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('me')
  getMyStatus(@CurrentUser() user: any) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    return this.subscriptionService.getMyStatus(Number(userId));
  }

  @Post('upgrade')
  upgrade(
    @Body('planSlug') planSlug: string,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.userId ?? user?.sub;
    return this.subscriptionService.upgrade(Number(userId), planSlug);
  }
}
