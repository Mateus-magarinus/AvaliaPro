import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  private readonly logger = new Logger(LocalAuthGuard.name);

  canActivate(context: ExecutionContext) {
    this.logger.log('LocalAuthGuard: Checking local credentials...');
    return super.canActivate(context);
  }
}
