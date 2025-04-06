import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { DatabaseModule, Evaluation, Property, User } from '@common';

@Module({
  imports: [
    DatabaseModule,
    DatabaseModule.forFeature([User, Evaluation, Property]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
