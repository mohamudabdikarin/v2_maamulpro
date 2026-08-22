import { Module } from '@nestjs/common';
import { ScheduledJobsService } from './cron.service';
import { ReportsModule } from '../reports/reports.module';
import { SettingsModule } from '../settings/settings.module';
import { RealEstateModule } from '../real-estate/real-estate.module';
import { PayrollModule } from '../payroll/payroll.module';

@Module({
  imports: [ReportsModule, SettingsModule, RealEstateModule, PayrollModule],
  providers: [ScheduledJobsService],
  exports: [ScheduledJobsService],
})
export class CronModule {}
