import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users/users.service';
import { TokenPayload } from './interfaces/token-payload.interface';
import { User } from '@common';
import { Response } from 'express';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async login(user: User, response: Response): Promise<string> {
    this.logger.log(`User login attempt: ${user.email}`);

    const tokenPayload: TokenPayload = {
      email: user.email,
    };

    const expires = new Date();
    expires.setSeconds(
      expires.getSeconds() + this.configService.get<number>('JWT_EXPIRATION'),
    );
    this.logger.log(`Token will expire at: ${expires.toISOString()}`);

    const token = this.jwtService.sign(tokenPayload);
    this.logger.log(`Generated token for user: ${user.email}`);

    // Set the token as an HTTP cookie in the response
    response.cookie('Authentication', token, {
      httpOnly: false, // Consider setting to true in production for security
      sameSite: 'none',
      secure: false, // Set to true if using HTTPS in production
      expires,
    });

    return token;
  }

  async validateToken(token: string): Promise<User> {
    try {
      this.logger.log('Validating token');
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      this.logger.log(`Token payload: ${JSON.stringify(payload)}`);

      const user = await this.usersService.getUser({ email: payload.email });
      if (!user) {
        this.logger.warn(
          `User not found for token with email: ${payload.email}`,
        );
        throw new UnauthorizedException('User not found');
      }
      this.logger.log(`Token validated for user: ${user.email}`);
      return user;
    } catch (error) {
      this.logger.error('Token validation failed', error.stack);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
