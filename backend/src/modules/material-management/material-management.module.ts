import { Module } from '@nestjs/common';
import { MaterialManagementService } from './material-management.service';
import { MaterialManagementController } from './material-management.controller';

@Module({
  controllers: [MaterialManagementController],
  providers: [MaterialManagementService],
  exports: [MaterialManagementService],
})
export class MaterialManagementModule {}
