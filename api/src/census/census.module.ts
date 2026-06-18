import { Global, Module } from '@nestjs/common';
import { CensusService } from './census.service';

@Global()
@Module({
  providers: [CensusService],
  exports: [CensusService],
})
export class CensusModule {}
