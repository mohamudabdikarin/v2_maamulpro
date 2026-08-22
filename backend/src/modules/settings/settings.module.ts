import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { OperationalAlertsService } from './operational-alerts.service';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, OperationalAlertsService],
  exports: [OperationalAlertsService],
})
export class SettingsModule {}
