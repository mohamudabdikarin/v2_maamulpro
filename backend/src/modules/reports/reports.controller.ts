import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GetTenantDb } from '../../common/decorators/tenant-context.decorator';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireAnyPermission, RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ReportScheduleDto } from './reports.dto';

// Workspace → required permission to view/run reports in that workspace.
// A user must hold the specific workspace permission to see or run those reports.
const REPORT_WORKSPACE_PERMISSION: Record<string, string> = {
  core: 'reports.read',
  payroll: 'reports.read',
  construction: 'reports.construction.read',
  real_estate: 'reports.real_estate.read',
  material_management: 'reports.material.read',
};

const ANY_REPORT_PERMISSION = Object.values(REPORT_WORKSPACE_PERMISSION);

function isOwner(user: any): boolean {
  return user?.isSuperAdmin || user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_OWNER';
}

function userHas(user: any, key: string): boolean {
  if (isOwner(user)) return true;
  return Array.isArray(user?.permissions) && user.permissions.includes(key);
}

function requireAnyReportPermission(user: any) {
  if (isOwner(user)) return;
  const permissions: string[] = user?.permissions || [];
  const hasAny = ANY_REPORT_PERMISSION.some((key) => permissions.includes(key));
  if (!hasAny) {
    throw new ForbiddenException('Missing required reports permission');
  }
}

function requireReportPermission(user: any, workspace: string) {
  if (isOwner(user)) return;
  const required = REPORT_WORKSPACE_PERMISSION[workspace] || 'reports.read';
  if (!userHas(user, required)) {
    throw new ForbiddenException(`Missing required permission: ${required}`);
  }
}

@Controller('api/reports')
@UseGuards(TenantAccessGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('financial')
  @RequirePermissions('reports.read')
  async getFinancialReport(
    @GetTenantDb() tenantDb: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getFinancialReport(tenantDb, startDate, endDate);
  }

  @Get('construction')
  @RequirePermissions('reports.construction.read')
  async getConstructionReport(@GetTenantDb() tenantDb: any) {
    return this.reportsService.getConstructionReport(tenantDb);
  }

  // The registry is scoped to what the user can actually see. We require any
  // reports.* permission to hit the endpoint; the service filters the payload.
  @Get('registry')
  @RequireAnyPermission('reports.read', 'reports.construction.read', 'reports.real_estate.read', 'reports.material.read')
  getRegistry(@CurrentUser() user: any) {
    requireAnyReportPermission(user);
    const registry = this.reportsService.getRegistry();
    if (isOwner(user)) return registry;
    return registry.filter((report) => userHas(user, REPORT_WORKSPACE_PERMISSION[report.workspace] || 'reports.read'));
  }

  @Get('run/:reportId')
  @RequireAnyPermission('reports.read', 'reports.construction.read', 'reports.real_estate.read', 'reports.material.read')
  runReport(
    @GetTenantDb() db: any,
    @CurrentUser() user: any,
    @Param('reportId') reportId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('entityId') entityId?: string,
    @Query('projectId') projectId?: string,
  ) {
    const report = this.reportsService.getRegistry().find((row) => row.id === reportId);
    if (!report) throw new ForbiddenException('Report not found');
    requireReportPermission(user, report.workspace);
    return this.reportsService.runReport(db, reportId, { startDate, endDate, entityId, projectId });
  }

  @Get('schedules')
  @RequirePermissions('reports.admin')
  listSchedules(@GetTenantDb() db: any) {
    return this.reportsService.listSchedules(db);
  }

  @Post('schedules')
  @RequirePermissions('reports.admin')
  createSchedule(@GetTenantDb() db: any, @Body() body: ReportScheduleDto) {
    return this.reportsService.createSchedule(db, body);
  }

  @Patch('schedules/:id')
  @RequirePermissions('reports.admin')
  updateSchedule(@GetTenantDb() db: any, @Param('id') id: string, @Body() body: ReportScheduleDto) {
    return this.reportsService.updateSchedule(db, id, body);
  }

  @Delete('schedules/:id')
  @RequirePermissions('reports.admin')
  deleteSchedule(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.reportsService.deleteSchedule(db, id);
  }
}
