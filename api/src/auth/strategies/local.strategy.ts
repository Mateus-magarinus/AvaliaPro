import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UsersService } from '../users/users.service';
import { Strategy } from 'passport-local';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private readonly usersService: UsersService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    this.logger.log(`Attempting login for email: ${email}`);
    try {
      const user = await this.usersService.verifyUser(email, password);
      if (!user) {
        this.logger.warn(`Invalid credentials for email: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }
      this.logger.log(`User validated: ${email}`);
      return user;
    } catch (err) {
      this.logger.error(
        `Error during user validation for email: ${email}`,
        err.stack,
      );
      throw new UnauthorizedException(err.message || 'Unauthorized');
    }
  }
}
