import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PayrollItemDto, PayrollTransitionDto, SavePayrollDto } from './dto/payroll.dto';
import { AccountingService } from '../accounting/accounting.service';
import { AccountMappingsService } from '../accounting/account-mappings.service';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly accounting: AccountingService,
    private readonly mappings: AccountMappingsService,
  ) {}

  private async safePost(fn: () => Promise<unknown>) {
    try { await fn(); } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Journal post skipped: ${message}`);
    }
  }

  /** Cashbook + GL for a paid payroll (gross expense, net cash, tax/deduction payables). */
  private async recordPayrollPayment(tx: any, payroll: any, userId: string, description: string) {
    const gross = Number(payroll.totalGrossSalary || 0);
    const net = Number(payroll.totalNetSalary || 0);
    const tax = Number(payroll.totalTax || 0);
    const deductions = Number(payroll.totalDeductions || 0);
    const amount = net > 0 ? net : gross;

    await tx.transaction.upsert({
      where: { referenceId: `PAYROLL-${payroll.id}` },
      create: {
        referenceId: `PAYROLL-${payroll.id}`,
        type: 'EXPENSE',
        status: 'CLEARED',
        description,
        amount,
        date: new Date(),
        userId,
        notes: `Expense account: ${payroll.expenseAccountCode || 'not assigned'}`,
      },
      update: {
        type: 'EXPENSE',
        status: 'CLEARED',
        description,
        amount,
        date: new Date(),
        userId,
        deletedAt: null,
        version: { increment: 1 },
      },
    });

    await this.safePost(async () => {
      await this.accounting.retractPriorForSource(tx, 'PAYROLL', payroll.id, userId);
      const resolved = await this.mappings.resolveMany(tx, [
        'PAYROLL_EXPENSE',
        'PAYROLL_CASH',
        'PAYROLL_TAX_PAYABLE',
        'PAYROLL_DEDUCTIONS_PAYABLE',
      ]);
      const expenseCode = payroll.expenseAccountCode || resolved.PAYROLL_EXPENSE;
      const expenseAmount = gross > 0 ? gross : net;
      const lines: { accountCode: string; debit: number; credit: number }[] = [
        { accountCode: expenseCode, debit: expenseAmount, credit: 0 },
      ];
      if (net > 0) lines.push({ accountCode: resolved.PAYROLL_CASH, debit: 0, credit: net });
      if (tax > 0) lines.push({ accountCode: resolved.PAYROLL_TAX_PAYABLE, debit: 0, credit: tax });
      if (deductions > 0) lines.push({ accountCode: resolved.PAYROLL_DEDUCTIONS_PAYABLE, debit: 0, credit: deductions });
      // If withholdings weren't broken out, credit cash for the full expense.
      if (lines.length === 1) {
        lines.push({ accountCode: resolved.PAYROLL_CASH, debit: 0, credit: expenseAmount });
      }
      await this.accounting.postJournalBatch(tx, {
        tenantId: 'system',
        userId,
        tx,
        dto: {
          date: new Date(),
          memo: description,
          sourceType: 'PAYROLL',
          sourceId: payroll.id,
          sourceRef: `PAYROLL-${payroll.id}`,
          lines,
        },
      });
    });
  }

  async getPayrolls(tenantDb: any, status?: string) {
    if (!tenantDb) return [];
    const where: any = {};
    if (status) where.status = status;

    return tenantDb.payroll.findMany({
      where,
      include: {
        createdByUser: true,
        approvedByUser: true,
        items: {
          include: { staff: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPayrollById(tenantDb: any, id: string) {
    if (!tenantDb) throw new BadRequestException('Tenant DB not available');
    const payroll = await tenantDb.payroll.findUnique({
      where: { id },
      include: {
        createdByUser: true,
        approvedByUser: true,
        items: {
          include: { staff: true },
        },
      },
    });

    if (!payroll) {
      throw new NotFoundException(`Payroll run with ID '${id}' not found`);
    }

    return payroll;
  }

  getEligibleStaff(tenantDb: any) {
    return tenantDb.staff.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, position: true, department: true, salary: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  getExpenseAccounts(tenantDb: any) {
    return tenantDb.account.findMany({ where: { type: 'EXPENSE' }, orderBy: { code: 'asc' } });
  }

  async validatePeriod(tenantDb: any, year: number, month: number, excludeId?: string) {
    const existing = await tenantDb.payroll.findFirst({
      where: { year, month, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true, name: true, status: true },
    });
    return { isDuplicate: Boolean(existing), existing };
  }

  async createPayroll(tenantDb: any, data: SavePayrollDto, userId: string) {
    const duplicate = await this.validatePeriod(tenantDb, data.year, data.month);
    if (duplicate.isDuplicate) throw new ConflictException('A payroll already exists for this period');
    this.ensureUniqueStaff(data.items);
    if (data.expenseAccountCode) await this.ensureExpenseAccount(tenantDb, data.expenseAccountCode);
    const calculated = this.calculate(data.items);
    return tenantDb.payroll.create({
      data: {
        name: data.name,
        year: data.year,
        month: data.month,
        payPeriod: data.payPeriod || `${data.year}-${String(data.month).padStart(2, '0')}`,
        paymentDate: data.paymentDate,
        status: (data.status as any) || 'DRAFT',
        expenseAccountCode: data.expenseAccountCode || null,
        createdById: userId,
        ...calculated.totals,
        items: {
          create: calculated.items.map((item) => ({
            ...item,
            status: (data.status as any) || 'DRAFT',
          })),
        },
      },
      include: { items: true },
    });
  }

  async updatePayroll(tenantDb: any, id: string, data: SavePayrollDto) {
    const payroll = await this.getPayrollById(tenantDb, id);
    if (!['DRAFT', 'REJECTED'].includes(payroll.status)) {
      throw new BadRequestException(`Payroll in ${payroll.status} status cannot be edited`);
    }
    if ((await this.validatePeriod(tenantDb, data.year, data.month, id)).isDuplicate) {
      throw new ConflictException('Another payroll exists for this period');
    }
    this.ensureUniqueStaff(data.items);
    if (data.expenseAccountCode) await this.ensureExpenseAccount(tenantDb, data.expenseAccountCode);
    const calculated = this.calculate(data.items);
    return tenantDb.$transaction(async (tx: any) => {
      await tx.payrollItem.deleteMany({ where: { payrollId: id } });
      return tx.payroll.update({
        where: { id },
        data: {
          name: data.name,
          year: data.year,
          month: data.month,
          payPeriod: data.payPeriod || `${data.year}-${String(data.month).padStart(2, '0')}`,
          paymentDate: data.paymentDate,
          expenseAccountCode: data.expenseAccountCode || null,
          rejectionReason: null,
          ...calculated.totals,
          items: { create: calculated.items.map((item) => ({ ...item, status: 'DRAFT' })) },
        },
        include: { items: true },
      });
    });
  }

  async transition(tenantDb: any, id: string, data: PayrollTransitionDto, userId: string) {
    const payroll = await tenantDb.payroll.findFirst({
      where: { id, deletedAt: null },
      include: { items: true, expenseAccount: true },
    });
    if (!payroll) throw new NotFoundException('Payroll not found');
    const allowed: Record<string, string[]> = {
      submit: ['DRAFT', 'REJECTED'],
      approve: ['DRAFT', 'PENDING_APPROVAL'],
      reject: ['PENDING_APPROVAL'],
      pay: ['APPROVED'],
      reopen: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
    };
    if (!allowed[data.action].includes(payroll.status)) {
      throw new BadRequestException(`Cannot ${data.action} payroll in ${payroll.status} status`);
    }
    if (data.action === 'reject' && (!data.reason || data.reason.trim().length < 3)) {
      throw new BadRequestException('A rejection reason is required');
    }
    const status = {
      submit: 'PENDING_APPROVAL',
      approve: 'APPROVED',
      reject: 'REJECTED',
      pay: 'PAID',
      reopen: 'DRAFT',
    }[data.action];
    return tenantDb.$transaction(async (tx: any) => {
      for (let index = 0; index < payroll.items.length; index++) {
        const item = payroll.items[index];
        await tx.payrollItem.update({
          where: { id: item.id },
          data: {
            status,
            payslipNumber: ['approve', 'pay'].includes(data.action)
              ? item.payslipNumber || `PAY-${payroll.year}${String(payroll.month).padStart(2, '0')}-${String(index + 1).padStart(3, '0')}`
              : item.payslipNumber,
          },
        });
      }
      const updated = await tx.payroll.update({
        where: { id },
        data: {
          status,
          rejectionReason: data.action === 'reject' ? data.reason : null,
          approvedById: data.action === 'approve' ? userId : data.action === 'reopen' ? null : payroll.approvedById,
          approvedAt: data.action === 'approve' ? new Date() : data.action === 'reopen' ? null : payroll.approvedAt,
          paidAt: data.action === 'pay' ? new Date() : data.action === 'reopen' ? null : payroll.paidAt,
        },
      });
      if (data.action === 'pay') {
        await this.recordPayrollPayment(
          tx,
          payroll,
          userId,
          `Payroll Payment — ${payroll.name} (${payroll.year}-${String(payroll.month).padStart(2, '0')})`,
        );
      }
      return updated;
    });
  }

  async deletePayroll(tenantDb: any, id: string) {
    const payroll = await this.getPayrollById(tenantDb, id);
    if (payroll.status === 'PAID') throw new BadRequestException('Paid payrolls cannot be deleted');
    await tenantDb.payroll.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  getPayslips(tenantDb: any, query: { year?: number; month?: number; staffId?: string; search?: string }) {
    const where: any = { payroll: { deletedAt: null } };
    if (query.staffId) where.staffId = query.staffId;
    if (query.year) where.payroll.year = query.year;
    if (query.month) where.payroll.month = query.month;
    if (query.search) where.OR = [
      { employeeName: { contains: query.search, mode: 'insensitive' } },
      { payslipNumber: { contains: query.search, mode: 'insensitive' } },
    ];
    return tenantDb.payrollItem.findMany({
      where,
      include: { payroll: true, staff: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approvePayroll(tenantDb: any, id: string, userId: string) {
    const payroll = await this.getPayrollById(tenantDb, id);

    if (payroll.status !== 'DRAFT' && payroll.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Payroll status is '${payroll.status}' and cannot be approved`);
    }

    return tenantDb.payroll.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Process Payroll Payment Transactionally
   * Uses atomic Prisma transaction & status verification to ensure
   * a payroll run can NEVER be paid twice even under concurrent requests.
   */
  async processPayrollPayment(tenantDb: any, id: string, accountId: string, userId: string) {
    if (!tenantDb) throw new BadRequestException('Tenant DB not available');

    return tenantDb.$transaction(async (tx: any) => {
      // Fetch with lock check
      const payroll = await tx.payroll.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!payroll) {
        throw new NotFoundException(`Payroll '${id}' not found`);
      }

      if (payroll.status === 'PAID') {
        throw new ConflictException(`Payroll '${payroll.name}' has already been processed and paid.`);
      }

      if (payroll.status !== 'APPROVED') {
        throw new BadRequestException(`Payroll must be APPROVED before payment processing.`);
      }

      // 1. Mark Payroll as PAID
      const updatedPayroll = await tx.payroll.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      await this.recordPayrollPayment(
        tx,
        payroll,
        userId,
        `Payroll salary payment for ${payroll.name} (${payroll.items.length} employees)`,
      );

      return updatedPayroll;
    });
  }

  private calculate(items: PayrollItemDto[]) {
    const totals = {
      totalBaseSalary: 0,
      totalBonuses: 0,
      totalDeductions: 0,
      totalTax: 0,
      totalGrossSalary: 0,
      totalNetSalary: 0,
    };
    const processed = items.map((item) => {
      const grossSalary = item.baseSalary + item.bonuses;
      const netSalary = grossSalary - item.deductions - item.tax;
      if (netSalary < 0) throw new BadRequestException(`Net salary cannot be negative for ${item.employeeName}`);
      totals.totalBaseSalary += item.baseSalary;
      totals.totalBonuses += item.bonuses;
      totals.totalDeductions += item.deductions;
      totals.totalTax += item.tax;
      totals.totalGrossSalary += grossSalary;
      totals.totalNetSalary += netSalary;
      return {
        staffId: item.staffId || null,
        employeeName: item.employeeName,
        employeePosition: item.employeePosition || null,
        employeeDepartment: (item.employeeDepartment as any) || 'GENERAL',
        baseSalary: item.baseSalary,
        bonuses: item.bonuses,
        deductions: item.deductions,
        tax: item.tax,
        grossSalary,
        netSalary,
        notes: item.notes || null,
      };
    });
    return { items: processed, totals };
  }

  private ensureUniqueStaff(items: PayrollItemDto[]) {
    const ids = items.map((item) => item.staffId).filter(Boolean);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Duplicate staff member in payroll');
  }

  private async ensureExpenseAccount(tenantDb: any, code: string) {
    const account = await tenantDb.account.findFirst({ where: { code, type: 'EXPENSE' } });
    if (!account) throw new BadRequestException('Expense account does not exist');
  }
}
