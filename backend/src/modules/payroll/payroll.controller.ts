import { Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode, HttpStatus, Patch, Delete, ForbiddenException } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { GetTenantDb } from '../../common/decorators/tenant-context.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PayrollTransitionDto, SavePayrollDto } from './dto/payroll.dto';

@Controller('api/payroll')
@UseGuards(TenantAccessGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  @RequirePermissions('payroll.read')
  async getPayrolls(@GetTenantDb() tenantDb: any, @Query('status') status?: string) {
    return this.payrollService.getPayrolls(tenantDb, status);
  }

  @Get(':id')
  @RequirePermissions('payroll.read')
  async getPayrollById(@GetTenantDb() tenantDb: any, @Param('id') id: string) {
    return this.payrollService.getPayrollById(tenantDb, id);
  }

  @Get('options/staff')
  @RequirePermissions('payroll.read')
  getEligibleStaff(@GetTenantDb() db: any) { return this.payrollService.getEligibleStaff(db); }

  @Get('options/accounts')
  @RequirePermissions('payroll.read')
  getExpenseAccounts(@GetTenantDb() db: any) { return this.payrollService.getExpenseAccounts(db); }

  @Get('validate/period')
  @RequirePermissions('payroll.read')
  validatePeriod(
    @GetTenantDb() db: any,
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.payrollService.validatePeriod(db, Number(year), Number(month), excludeId);
  }

  @Post()
  @RequirePermissions('payroll.manage')
  createPayroll(@GetTenantDb() db: any, @CurrentUser('id') userId: string, @Body() body: SavePayrollDto) {
    return this.payrollService.createPayroll(db, body, userId);
  }

  @Patch(':id')
  @RequirePermissions('payroll.manage')
  updatePayroll(@GetTenantDb() db: any, @Param('id') id: string, @Body() body: SavePayrollDto) {
    return this.payrollService.updatePayroll(db, id, body);
  }

  @Post(':id/transition')
  @RequirePermissions('payroll.manage')
  transition(
    @GetTenantDb() db: any,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: PayrollTransitionDto,
  ) {
    this.assertTransitionAuthorized(user, body.action);
    return this.payrollService.transition(db, id, body, user?.id);
  }

  /**
   * The transition endpoint is a convenience gate for manage-level users,
   * but approve/pay actions must still be guarded by their dedicated
   * permission keys (payroll.approve / payroll.pay) exactly as if they
   * were called on the dedicated /approve and /pay endpoints.
   */
  private assertTransitionAuthorized(user: any, action: string) {
    const required: Record<string, string | undefined> = {
      approve: 'payroll.approve',
      pay: 'payroll.pay',
    };
    const permission = required[action];
    if (!permission) return;
    if (user?.isSuperAdmin || user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_OWNER') return;
    const granted: string[] = user?.permissions ?? [];
    if (!granted.includes(permission)) {
      throw new ForbiddenException(`Missing required permission: ${permission}`);
    }
  }

  @Delete(':id')
  @RequirePermissions('payroll.manage')
  deletePayroll(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.payrollService.deletePayroll(db, id);
  }

  @Get('payslips/list')
  @RequirePermissions('payroll.read')
  getPayslips(
    @GetTenantDb() db: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('staffId') staffId?: string,
    @Query('search') search?: string,
  ) {
    return this.payrollService.getPayslips(db, {
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      staffId,
      search,
    });
  }

  @Post(':id/approve')
  @RequirePermissions('payroll.approve')
  @HttpCode(HttpStatus.OK)
  async approvePayroll(
    @GetTenantDb() tenantDb: any,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.payrollService.approvePayroll(tenantDb, id, userId);
  }

  @Post(':id/pay')
  @RequirePermissions('payroll.pay')
  @HttpCode(HttpStatus.OK)
  async processPayrollPayment(
    @GetTenantDb() tenantDb: any,
    @Param('id') id: string,
    @Body() body: { accountId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.payrollService.processPayrollPayment(tenantDb, id, body.accountId, userId);
  }
}
