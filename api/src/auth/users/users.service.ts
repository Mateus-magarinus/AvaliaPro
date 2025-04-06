import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { GetUserDto } from './dto/get-user.dto';
import { UsersRepository } from './users.repository';
import { User } from '@common';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto) {
    this.logger.log(`Creating user with email: ${createUserDto.email}`);
    await this.validateCreateUserDto(createUserDto);

    const user = new User({
      ...createUserDto,
      role: 'user',
    });

    this.logger.log(`Saving user with email: ${user.email}`);
    const createdUser = await this.usersRepository.create(user);
    delete createdUser.password;
    return createdUser;
  }

  async verifyUser(email: string, password: string) {
    this.logger.log(`Verifying user credentials for email: ${email}`);
    const user = await this.usersRepository.findOne({ email });
    if (!user) {
      this.logger.warn(`User not found with email: ${email}`);
      throw new UnauthorizedException('Credentials are not valid.');
    }
    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) {
      this.logger.warn(`Invalid password for email: ${email}`);
      throw new UnauthorizedException('Credentials are not valid.');
    }
    this.logger.log(`User verified: ${email}`);
    return user;
  }

  async getUser(getUserDto: GetUserDto) {
    this.logger.log(
      `Fetching user with criteria: ${JSON.stringify(getUserDto)}`,
    );
    return this.usersRepository.findOne(getUserDto);
  }

  private async validateCreateUserDto(createUserDto: CreateUserDto) {
    this.logger.log(`Validating new user with email: ${createUserDto.email}`);
    try {
      await this.usersRepository.findOne({ email: createUserDto.email });
      this.logger.warn(`Email already exists: ${createUserDto.email}`);
    } catch (err) {
      if (err instanceof NotFoundException) {
        this.logger.log(`Email available: ${createUserDto.email}`);
        return;
      }
    }
    throw new UnprocessableEntityException('Email already exists.');
  }
}
