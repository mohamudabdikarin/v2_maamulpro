import { Controller, Get, Post, Body, Query, UseGuards, Param, Patch, Delete } from '@nestjs/common';
import { StaffService } from './staff.service';
import { GetTenantDb, GetTenantContext } from '../../common/decorators/tenant-context.decorator';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  AccountStatusDto,
  CreateStaffDto,
  StaffAccountDto,
  StaffEmailDto,
  StaffPasswordDto,
  UpdateStaffDto,
} from './dto/staff.dto';

@Controller('api/staff')
@UseGuards(TenantAccessGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @RequirePermissions('users.read')
  async getStaff(
    @GetTenantDb() tenantDb: any,
    @Query() query: PaginationQueryDto,
    @Query('department') department?: string,
    @Query('status') status?: string,
  ) {
    return this.staffService.getStaff(tenantDb, { ...query, department, status });
  }

  @Get(':id')
  @RequirePermissions('users.read')
  getStaffById(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.staffService.getStaffById(db, id);
  }

  @Post()
  @RequirePermissions('users.create')
  async createStaff(
    @GetTenantDb() tenantDb: any,
    @GetTenantContext('companyId') companyId: string,
    @Body() body: CreateStaffDto,
  ) {
    return this.staffService.createStaff(tenantDb, companyId, body);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  updateStaff(@GetTenantDb() db: any, @Param('id') id: string, @Body() body: UpdateStaffDto) {
    return this.staffService.updateStaff(db, id, body);
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  deleteStaff(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.staffService.deleteStaff(db, id);
  }

  @Post(':id/account')
  @RequirePermissions('users.create')
  createAccount(
    @GetTenantDb() db: any,
    @GetTenantContext('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: StaffAccountDto,
  ) {
    return this.staffService.createAccount(db, companyId, id, body);
  }

  @Patch(':id/account/status')
  @RequirePermissions('users.update')
  setAccountStatus(
    @GetTenantDb() db: any,
    @GetTenantContext('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: AccountStatusDto,
  ) {
    return this.staffService.setAccountStatus(db, companyId, id, body.isActive);
  }

  @Patch(':id/account/email')
  @RequirePermissions('users.update')
  updateEmail(@GetTenantDb() db: any, @Param('id') id: string, @Body() body: StaffEmailDto) {
    return this.staffService.updateAccountEmail(db, id, body.email);
  }

  @Post(':id/account/reset-password')
  @RequirePermissions('users.update')
  resetPassword(@GetTenantDb() db: any, @Param('id') id: string, @Body() body: StaffPasswordDto) {
    return this.staffService.resetPassword(db, id, body.temporaryPassword);
  }

  @Get(':id/activity')
  @RequirePermissions('activity_logs.read')
  getActivity(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.staffService.getStaffActivity(db, id);
  }
}
