import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { SubscriptionService } from '../subscription.service';

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userId = user?.id ?? user?.userId ?? user?.sub;

    if (!userId) return false;

    const quota = await this.subscriptionService.checkQuota(Number(userId));

    if (!quota.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: `Limite de ${quota.searchesLimit} buscas/mês atingido. Faça upgrade do seu plano.`,
          quota,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
