import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../common/models/user.entity';
import { Subscription } from '../common/models/subscription.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User, Subscription]), forwardRef(() => AuthModule)],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard],
})
export class AdminModule {}
