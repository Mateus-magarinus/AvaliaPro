import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Plan } from '../common/models/plan.entity';
import { Subscription } from '../common/models/subscription.entity';
import { User } from '../common/models/user.entity';
import { PlansService } from './plans.service';
import { SubscriptionService } from './subscription.service';
import { PlansController, SubscriptionsController } from './plans.controller';
import { QuotaGuard } from './guards/quota.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Subscription, User]),
    forwardRef(() => AuthModule),
  ],
  controllers: [PlansController, SubscriptionsController],
  providers: [PlansService, SubscriptionService, QuotaGuard],
  exports: [PlansService, SubscriptionService, QuotaGuard],
})
export class PlansModule {}
