import { Module } from '@nestjs/common';
import { MaterialManagementService } from './material-management.service';
import { MaterialManagementController } from './material-management.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [MaterialManagementController],
  providers: [MaterialManagementService],
  exports: [MaterialManagementService],
})
export class MaterialManagementModule {}
