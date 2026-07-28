import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ExecutiveHubService } from './executive-hub.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { GetTenantContext, GetTenantDb } from '../../common/decorators/tenant-context.decorator';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';

@Controller('api/dashboard')
@UseGuards(TenantAccessGuard)
export class ExecutiveHubController {
  constructor(private readonly executiveHubService: ExecutiveHubService) {}

  @Get('summary')
  @RequirePermissions('analytics.read')
  async getDashboardSummary(@GetTenantDb() tenantDb: any, @GetTenantContext() tenant: any) {
    return this.executiveHubService.getDashboardSummary(tenantDb, tenant.entitlements);
  }

  @Get('analytics')
  @RequirePermissions('analytics.read')
  getAnalytics(
    @GetTenantDb() tenantDb: any,
    @GetTenantContext() tenant: any,
    @Query('period') period?: string,
    @Query('workspace') workspace?: string,
  ) {
    return this.executiveHubService.getAnalytics(tenantDb, tenant.entitlements, period, workspace);
  }
}
