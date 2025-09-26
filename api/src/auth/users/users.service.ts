import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { GetUserDto } from './dto/get-user.dto';
import { UsersRepository } from './users.repository';
import { User } from '@common';
import { UpdateUserDto } from './dto/update-user.dto';
import { EvaluationsRepository } from 'src/evaluations/evaluations.repository';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepository: UsersRepository, private readonly evaluationsRepository: EvaluationsRepository) { }

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

  async updateMe(userId: number | string, dto: UpdateUserDto) {
    const id = Number(userId);

    const patch: Partial<User> = {};
    if (typeof dto.name === 'string') {
      patch.name = dto.name;
    }

    if (typeof dto.email === 'string') {
      const current = await this.usersRepository.findOne({ id });
      if (dto.email !== current.email) {
        try {
          await this.usersRepository.findOne({ email: dto.email });
          throw new UnprocessableEntityException('Email already exists.');
        } catch (err) {
          if (!(err instanceof NotFoundException)) throw err; // erro real
        }
      }
      patch.email = dto.email;
    }

    if (typeof dto.password === 'string' && dto.password.length > 0) {
      const salt = await bcrypt.genSalt(10);
      patch.password = await bcrypt.hash(dto.password, salt);
    }

    const updated = await this.usersRepository.findOneAndUpdate(
      { id } as any,
      patch as any,
    );

    if (updated && (updated as any).password) {
      delete (updated as any).password;
    }
    return updated;
  }

  async deleteMe(userId: number | string) {
    const has = await this.evaluationsRepository.count(
      { user: { id: Number(userId) } } as any
    );
    if (has > 0) {
      throw new BadRequestException('Account deletion blocked: evaluations are linked to this account.');
    }
    return this.usersRepository.findOneAndDelete({ id: Number(userId) } as any);
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
