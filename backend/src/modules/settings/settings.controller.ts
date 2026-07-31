import { Body, Controller, Delete, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { GetTenantContext, GetTenantDb } from '../../common/decorators/tenant-context.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import {
  ChangePasswordDto,
  UpdateCompanySettingsDto,
  UpdateLanguageDto,
  UpdateProfileDto,
  UpdateSubdomainDto,
} from './dto/settings.dto';
import { SettingsService } from './settings.service';

@Controller('api/settings')
@UseGuards(TenantAccessGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @RequirePermissions('settings.read')
  getSettings(@GetTenantDb() db: any, @GetTenantContext() tenant: any) {
    return this.settings.getSettings(db, tenant);
  }

  @Patch()
  @RequirePermissions('settings.update')
  updateSettings(@GetTenantDb() db: any, @Body() body: UpdateCompanySettingsDto) {
    return this.settings.updateSettings(db, body);
  }

  @Patch('subdomain')
  @RequirePermissions('settings.update')
  updateSubdomain(@GetTenantContext() tenant: any, @Body() body: UpdateSubdomainDto) {
    return this.settings.updateSubdomain(tenant, body.subdomain);
  }


  @Get('profile')
  getProfile(@GetTenantDb() db: any, @CurrentUser('id') userId: string) {
    return this.settings.getProfile(db, userId);
  }

  @Patch('profile')
  updateProfile(
    @GetTenantDb() db: any,
    @CurrentUser('id') userId: string,
    @Body() body: UpdateProfileDto,
  ) {
    return this.settings.updateProfile(db, userId, body);
  }

  @Patch('password')
  changePassword(
    @GetTenantDb() db: any,
    @CurrentUser('id') userId: string,
    @Body() body: ChangePasswordDto,
  ) {
    return this.settings.changePassword(db, userId, body);
  }

  @Patch('language')
  updateLanguage(
    @GetTenantDb() db: any,
    @CurrentUser('id') userId: string,
    @Body() body: UpdateLanguageDto,
  ) {
    return this.settings.updateLanguage(db, userId, body);
  }

  @Get('activity-logs')
  @RequirePermissions('activity_logs.read')
  getActivityLogs(
    @GetTenantDb() db: any,
    @Query() query: PaginationQueryDto,
    @Query('entity') entity?: string,
    @Query('userId') userId?: string,
  ) {
    return this.settings.getActivityLogs(db, { ...query, entity, userId });
  }

  @Delete('activity-logs')
  @RequirePermissions('activity_logs.read')
  clearActivityLogs(@GetTenantDb() db: any) {
    return this.settings.clearActivityLogs(db);
  }

  @Get('notifications')
  @RequirePermissions('activity_logs.read')
  getNotifications(@GetTenantDb() db: any, @CurrentUser('id') userId: string) {
    return this.settings.getNotifications(db, userId);
  }

  @Post('notifications/read')
  @RequirePermissions('activity_logs.read')
  markNotificationsRead(@GetTenantDb() db: any, @CurrentUser('id') userId: string) {
    return this.settings.markNotificationsRead(db, userId);
  }
}
