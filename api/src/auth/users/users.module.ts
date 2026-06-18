import { forwardRef, Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { DatabaseModule, Evaluation, Property, User } from '@common';
import { EvaluationsModule } from '../../evaluations/evaluations.module';
import { PlansModule } from '../../plans/plans.module';

@Module({
  imports: [
    DatabaseModule,
    DatabaseModule.forFeature([User, Evaluation, Property]),
    forwardRef(() => EvaluationsModule),
    PlansModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule { }
