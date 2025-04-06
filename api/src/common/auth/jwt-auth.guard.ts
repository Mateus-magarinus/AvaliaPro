import {
  CanActivate,
  ExecutionContext,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/auth/users/users.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    let token =
      request.cookies?.Authentication || request.headers?.authorization;
    if (token && token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '');
    }

    if (!token) {
      this.logger.warn('No JWT token provided');
      throw new UnauthorizedException('No JWT token provided');
    }

    try {
      this.logger.log('Validating JWT token (SharedJwtAuthGuard)');
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      this.logger.log(`Token payload: ${JSON.stringify(payload)}`);

      const roles = this.reflector.get<string[]>('roles', context.getHandler());
      const user = await this.usersService.getUser({ email: payload.email });
      if (!user) {
        this.logger.warn(`User not found for email: ${payload.email}`);
        throw new UnauthorizedException('User not found');
      }

      if (roles && roles.length > 0) {
        const userRole = user.role;

        if (!roles.includes(userRole)) {
          this.logger.error(
            `User ${user.email} does not have required role: ${userRole}`,
          );
          throw new UnauthorizedException('User does not have valid roles');
        }
      }

      request.user = user;
      this.logger.log(`JWT validated for user: ${user.email}`);
      return true;
    } catch (error) {
      this.logger.error('Token validation failed', error.stack);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
