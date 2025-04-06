import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from '../interfaces/token-payload.interface';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) =>
          request?.cookies?.Authentication ||
          request?.Authentication ||
          request?.headers.Authentication ||
          request?.headers?.authorization?.replace('Bearer ', ''),
      ]),
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: TokenPayload) {
    this.logger.log(`Validating token payload: ${JSON.stringify(payload)}`);

    const { email } = payload;
    if (!email) {
      this.logger.error('Token payload does not contain email');
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.usersService.getUser({ email });
    if (!user) {
      this.logger.warn(`User not found with email: ${email}`);
      throw new UnauthorizedException('User not found');
    }

    this.logger.log(`Token validated for user: ${user.email}`);
    return user;
  }
}
