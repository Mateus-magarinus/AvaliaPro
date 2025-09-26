import { forwardRef, Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { DatabaseModule, Evaluation, Property, User } from '@common';
import { EvaluationsModule } from 'src/evaluations/evaluations.module';

@Module({
  imports: [
    DatabaseModule,
    DatabaseModule.forFeature([User, Evaluation, Property]),
    forwardRef(() => EvaluationsModule),

  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule { }
