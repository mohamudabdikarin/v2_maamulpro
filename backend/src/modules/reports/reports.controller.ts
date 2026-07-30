import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GetTenantDb } from '../../common/decorators/tenant-context.decorator';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ReportScheduleDto } from './reports.dto';

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
  @RequirePermissions('reports.read')
  async getConstructionReport(@GetTenantDb() tenantDb: any) {
    return this.reportsService.getConstructionReport(tenantDb);
  }

  @Get('registry')
  @RequirePermissions('reports.read')
  getRegistry() {
    return this.reportsService.getRegistry();
  }

  @Get('run/:reportId')
  @RequirePermissions('reports.read')
  runReport(
    @GetTenantDb() db: any,
    @Param('reportId') reportId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('entityId') entityId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.reportsService.runReport(db, reportId, { startDate, endDate, entityId, projectId });
  }

  @Get('schedules')
  @RequirePermissions('reports.read')
  listSchedules(@GetTenantDb() db: any) {
    return this.reportsService.listSchedules(db);
  }

  @Post('schedules')
  @RequirePermissions('reports.create')
  createSchedule(@GetTenantDb() db: any, @Body() body: ReportScheduleDto) {
    return this.reportsService.createSchedule(db, body);
  }

  @Patch('schedules/:id')
  @RequirePermissions('reports.update')
  updateSchedule(@GetTenantDb() db: any, @Param('id') id: string, @Body() body: ReportScheduleDto) {
    return this.reportsService.updateSchedule(db, id, body);
  }

  @Delete('schedules/:id')
  @RequirePermissions('reports.delete')
  deleteSchedule(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.reportsService.deleteSchedule(db, id);
  }
}
