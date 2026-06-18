import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserColumnPreference } from '../common/models/user-column-preference.entity';
import { ColumnPreferencesService } from './column-preferences.service';
import { ColumnPreferencesController } from './column-preferences.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserColumnPreference]),
    forwardRef(() => AuthModule),
  ],
  providers: [ColumnPreferencesService],
  controllers: [ColumnPreferencesController],
  exports: [ColumnPreferencesService],
})
export class ColumnPreferencesModule {}
