import { Module } from '@nestjs/common';
import { ConstructionService } from './construction.service';
import { ConstructionController } from './construction.controller';
import { AccountingModule } from '../accounting/accounting.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [AccountingModule, StaffModule],
  controllers: [ConstructionController],
  providers: [ConstructionService],
  exports: [ConstructionService],
})
export class ConstructionModule {}
