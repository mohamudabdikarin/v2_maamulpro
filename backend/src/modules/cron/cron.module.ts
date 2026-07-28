import { Module } from '@nestjs/common';
import { ScheduledJobsService } from './cron.service';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [ReportsModule],
  providers: [ScheduledJobsService],
  exports: [ScheduledJobsService],
})
export class CronModule {}
