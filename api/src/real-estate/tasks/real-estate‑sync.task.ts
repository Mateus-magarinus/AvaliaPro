import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RealEstateService } from '../real-estate.service';

@Injectable()
export class RealEstateSyncTask {
  private readonly logger = new Logger(RealEstateSyncTask.name);

  constructor(private readonly realEstateService: RealEstateService) {}

  /**
   * Runs every hour to synchronize all real estate entries
   */
  @Cron(CronExpression.EVERY_12_HOURS)
  async handleCron() {
    this.logger.log('Starting scheduled real-estate synchronization');
    try {
      await this.realEstateService.syncAll();
      this.logger.log('Scheduled real-estate synchronization completed');
    } catch (error) {
      this.logger.error(
        'Error during scheduled real-estate synchronization',
        error.stack,
      );
    }
  }
}
