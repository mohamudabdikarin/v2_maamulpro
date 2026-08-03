import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { AccountMappingsService } from './account-mappings.service';

@Module({
  controllers: [AccountingController],
  providers: [AccountingService, AccountMappingsService],
  exports: [AccountingService, AccountMappingsService],
})
export class AccountingModule {}
