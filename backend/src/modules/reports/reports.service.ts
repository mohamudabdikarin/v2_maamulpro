import { Injectable, NotFoundException } from '@nestjs/common';
import { ReportScheduleDto } from './reports.dto';

const REPORTS = [
  ['core-income', 'Income Report', 'core'],
  ['core-expense', 'Expense Report', 'core'],
  ['core-profit-summary', 'Profit Summary', 'core'],
  ['core-transaction-detail', 'Transaction Detail By Account', 'core'],
  ['construction-project-profit', 'Project Profit Report', 'construction'],
  ['construction-material-usage', 'Material Usage Report', 'construction'],
  ['construction-manpower-cost', 'Manpower Cost Report', 'construction'],
  ['construction-expenses', 'Construction Expense Report', 'construction'],
  ['construction-progress', 'Project Progress Analytics', 'construction'],
  ['construction-manpower-expenses', 'Manpower Expense Detail', 'construction'],
  ['construction-workforce-budget', 'Workforce Budget Report', 'construction'],
  ['real-estate-rental-income', 'Rental Income Report', 'real_estate'],
  ['real-estate-occupancy', 'Occupancy Report', 'real_estate'],
  ['real-estate-property-sales', 'Property Sales Report', 'real_estate'],
  ['real-estate-due-payments', 'Due Payment Report', 'real_estate'],
  ['real-estate-sales-performance', 'Sales Performance Report', 'real_estate'],
  ['material-stock-movement', 'Stock Movement Report', 'material_management'],
  ['material-purchases', 'Purchase Report', 'material_management'],
  ['material-supplier-balances', 'Supplier Balance Report', 'material_management'],
  ['material-sales', 'Material Sales Report', 'material_management'],
  ['material-estimated-profit', 'Estimated Profit Report', 'material_management'],
  ['payroll-summary', 'Payroll Summary', 'payroll'],
  ['payroll-payslips', 'Payslip Detail Report', 'payroll'],
  ['payroll-department-cost', 'Department Payroll Cost', 'payroll'],
].map(([id, title, workspace]) => ({ id, title, workspace, supportsDateRange: true, schedulingReady: true }));

@Injectable()
export class ReportsService {

  async getFinancialReport(tenantDb: any, startDate?: string, endDate?: string) {
    if (!tenantDb) return { income: 0, expense: 0, netProfit: 0, transactions: [] };

    const where: any = { status: 'CLEARED' };
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const txns = await tenantDb.transaction.findMany({
      where,
      include: { category: true, project: true, property: true, deal: true },
      orderBy: { date: 'desc' },
    });

    let income = 0;
    let expense = 0;

    for (const t of txns) {
      if (t.type === 'INCOME') income += Number(t.amount);
      else if (t.type === 'EXPENSE') expense += Number(t.amount);
    }

    return {
      income,
      expense,
      netProfit: income - expense,
      totalCount: txns.length,
      transactions: txns,
    };
  }

  async getConstructionReport(tenantDb: any) {
    if (!tenantDb) return { projects: [], totalBudget: 0 };

    const projects = await tenantDb.project.findMany({
      include: {
        tasks: true,
        dailyExpenses: true,
      },
    });

    let totalBudget = 0;
    for (const p of projects) {
      totalBudget += Number(p.budget);
    }

    return {
      totalProjects: projects.length,
      totalBudget,
      projects,
    };
  }

  getRegistry() {
    return REPORTS;
  }

  async runReport(
    db: any,
    reportId: string,
    query: { startDate?: string; endDate?: string; entityId?: string; projectId?: string },
  ) {
    const report = REPORTS.find((item) => item.id === reportId);
    if (!report) throw new NotFoundException('Report not found');
    const date = query.startDate || query.endDate
      ? {
          gte: query.startDate ? new Date(query.startDate) : undefined,
          // A date input is inclusive: do not discard the rest of its final day.
          lte: query.endDate ? new Date(`${query.endDate}T23:59:59.999`) : undefined,
        }
      : undefined;
    const projectId = query.projectId || (reportId.startsWith('construction-') ? query.entityId : undefined);
    const transactionProjectWhere = projectId ? { projectId } : {};
    let rows: any[] = [];
    let summary: Record<string, number> = {};

    if (['core-income', 'core-expense', 'core-transaction-detail'].includes(reportId)) {
      const type = reportId === 'core-income' ? 'INCOME' : reportId === 'core-expense' ? 'EXPENSE' : undefined;
      const transactions = await db.transaction.findMany({
        where: { deletedAt: null, ...(type ? { type } : {}), ...transactionProjectWhere, ...(date ? { date } : {}) },
        include: { category: true, project: true, property: true, deal: true, user: { select: { name: true, email: true } } },
        orderBy: { date: reportId === 'core-transaction-detail' ? 'asc' : 'desc' },
      });
      let income = 0;
      let expense = 0;
      let balance = 0;
      rows = transactions.map((transaction: any) => {
        const amount = Number(transaction.amount);
        if (transaction.type === 'INCOME') {
          income += amount;
          balance += amount;
        } else {
          expense += amount;
          balance -= amount;
        }
        return {
          reference: transaction.referenceId,
          transactionId: transaction.id,
          date: transaction.date,
          type: transaction.type,
          status: transaction.status,
          project: transaction.project?.name || 'General',
          property: transaction.property?.title || '—',
          category: transaction.category?.name || 'Uncategorized',
          description: transaction.description,
          notes: transaction.notes || '—',
          debit: transaction.type === 'EXPENSE' ? amount : 0,
          credit: transaction.type === 'INCOME' ? amount : 0,
          runningBalance: balance,
          recordedBy: transaction.user?.name || transaction.user?.email || 'System',
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
        };
      });
      summary = { rowCount: rows.length, income, expense, netProfit: income - expense };
    } else if (reportId === 'core-profit-summary') {
      const transactions = await db.transaction.findMany({ where: { deletedAt: null, status: 'CLEARED', ...transactionProjectWhere, ...(date ? { date } : {}) } });
      const income = transactions.filter((row: any) => row.type === 'INCOME').reduce((sum: number, row: any) => sum + Number(row.amount), 0);
      const expense = transactions.filter((row: any) => row.type === 'EXPENSE').reduce((sum: number, row: any) => sum + Number(row.amount), 0);
      rows = [{ income, expense, netProfit: income - expense, margin: income ? ((income - expense) / income) * 100 : 0 }];
      summary = { rowCount: rows.length, income, expense, netProfit: income - expense };
    } else if (reportId === 'construction-project-profit') {
      const projects = await db.project.findMany({ where: { deletedAt: null, ...(projectId ? { id: projectId } : {}) } });
      const transactions = await db.transaction.findMany({ where: { deletedAt: null, status: 'CLEARED', projectId: { in: projects.map((row: any) => row.id) }, ...(date ? { date } : {}) } });
      rows = projects.map((project: any) => {
        const linked = transactions.filter((row: any) => row.projectId === project.id);
        const income = linked.filter((row: any) => row.type === 'INCOME').reduce((sum: number, row: any) => sum + Number(row.amount), 0);
        const expenses = linked.filter((row: any) => row.type === 'EXPENSE').reduce((sum: number, row: any) => sum + Number(row.amount), 0);
        return { projectId: project.id, project: project.name, budget: project.budget, income, expenses, profit: income - expenses };
      });
      summary = {
        rowCount: rows.length,
        income: rows.reduce((sum, row) => sum + Number(row.income), 0),
        expense: rows.reduce((sum, row) => sum + Number(row.expenses), 0),
        netProfit: rows.reduce((sum, row) => sum + Number(row.profit), 0),
      };
    } else if (reportId === 'construction-material-usage') {
      rows = await db.inventoryTransaction.findMany({ where: { type: 'USAGE', ...(projectId ? { projectId } : {}), ...(date ? { date } : {}) }, include: { material: true, project: true } });
    } else if (['construction-manpower-cost', 'construction-manpower-expenses'].includes(reportId)) {
      rows = await db.workerLedgerEntry.findMany({ where: { ...(projectId ? { projectId } : {}), ...(date ? { date } : {}) }, include: { staff: true, project: true } });
    } else if (reportId === 'construction-expenses') {
      rows = await db.dailyOperationalExpense.findMany({ where: { deletedAt: null, ...(projectId ? { projectId } : {}), ...(date ? { date } : {}) }, include: { staff: true, project: true } });
    } else if (reportId === 'construction-progress') {
      rows = await db.project.findMany({ where: { deletedAt: null, ...(projectId ? { id: projectId } : {}) }, include: { tasks: { where: { deletedAt: null } } } });
    } else if (reportId === 'construction-workforce-budget') {
      rows = await db.workforceContract.findMany({ where: { deletedAt: null, ...(projectId ? { projectId } : {}), ...(date ? { createdAt: date } : {}) }, include: { project: true, payments: true, budgetAdjustments: true } });
    } else if (reportId === 'real-estate-rental-income') {
      rows = await db.rentPayment.findMany({ where: { deletedAt: null, ...(query.entityId ? { contract: { is: { propertyId: query.entityId } } } : {}), ...(date ? { dueDate: date } : {}) }, include: { tenant: true, contract: { include: { property: true } } } });
    } else if (reportId === 'real-estate-occupancy') {
      rows = await db.property.findMany({ where: { deletedAt: null, ...(query.entityId ? { id: query.entityId } : {}) } });
    } else if (reportId === 'real-estate-property-sales') {
      rows = await db.deal.findMany({ where: { deletedAt: null, type: 'SALE', ...(query.entityId ? { propertyId: query.entityId } : {}), ...(date ? { createdAt: date } : {}) }, include: { property: true, client: true } });
    } else if (reportId === 'real-estate-due-payments') {
      rows = await db.deal.findMany({ where: { deletedAt: null, ...(query.entityId ? { propertyId: query.entityId } : {}), paymentStatus: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } }, include: { property: true, client: true } });
    } else if (reportId === 'real-estate-sales-performance') {
      rows = await db.deal.findMany({ where: { deletedAt: null, ...(query.entityId ? { propertyId: query.entityId } : {}), ...(date ? { createdAt: date } : {}) }, include: { property: true, client: true, createdBy: true } });
    } else if (reportId === 'material-stock-movement') {
      rows = await db.inventoryTransaction.findMany({ where: { ...(query.entityId ? { materialId: query.entityId } : {}), ...transactionProjectWhere, ...(date ? { date } : {}) }, include: { material: true, project: true, user: true } });
    } else if (reportId === 'material-purchases') {
      rows = await db.purchaseOrder.findMany({ where: { deletedAt: null, ...(date ? { createdAt: date } : {}) }, include: { supplier: true, items: { include: { material: true } } } });
    } else if (reportId === 'material-supplier-balances') {
      rows = await db.supplier.findMany({ where: { deletedAt: null }, include: { transactions: true } });
    } else if (reportId === 'material-sales') {
      rows = await db.materialSale.findMany({ where: { deletedAt: null, ...(date ? { date } : {}) }, include: { customer: true, items: { include: { material: true } } } });
    } else if (reportId === 'material-estimated-profit') {
      const materials = await db.material.findMany({ where: { deletedAt: null } });
      rows = materials.map((row: any) => ({ ...row, stockValue: Number(row.quantity) * Number(row.unitCost), estimatedRevenue: Number(row.quantity) * Number(row.salePrice), estimatedProfit: Number(row.quantity) * (Number(row.salePrice) - Number(row.unitCost)) }));
    } else if (reportId === 'payroll-summary') {
      rows = await db.payroll.findMany({ where: { deletedAt: null, ...(date ? { createdAt: date } : {}) }, include: { items: true }, orderBy: [{ year: 'desc' }, { month: 'desc' }] });
    } else if (reportId === 'payroll-payslips') {
      rows = await db.payrollItem.findMany({ where: { payroll: { deletedAt: null, ...(date ? { createdAt: date } : {}) } }, include: { payroll: true, staff: true }, orderBy: { createdAt: 'desc' } });
    } else if (reportId === 'payroll-department-cost') {
      const items = await db.payrollItem.findMany({ where: { payroll: { deletedAt: null, ...(date ? { createdAt: date } : {}) } } });
      const totals = new Map<string, { department: string; employees: number; grossSalary: number; deductions: number; netSalary: number }>();
      for (const item of items) {
        const key = item.employeeDepartment;
        const row = totals.get(key) || { department: key, employees: 0, grossSalary: 0, deductions: 0, netSalary: 0 };
        row.employees += 1; row.grossSalary += Number(item.grossSalary); row.deductions += Number(item.deductions) + Number(item.tax); row.netSalary += Number(item.netSalary);
        totals.set(key, row);
      }
      rows = Array.from(totals.values());
    }

    return {
      report,
      generatedAt: new Date(),
      summary: { rowCount: rows.length, ...summary },
      rows,
    };
  }

  listSchedules(db: any) {
    return db.reportSchedule.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  createSchedule(db: any, data: ReportScheduleDto) {
    if (!REPORTS.some((item) => item.id === data.reportId)) throw new NotFoundException('Report not found');
    return db.reportSchedule.create({ data: { ...data, frequency: data.frequency as any } });
  }

  async updateSchedule(db: any, id: string, data: ReportScheduleDto) {
    const result = await db.reportSchedule.updateMany({
      where: { id, deletedAt: null },
      data: { ...data, frequency: data.frequency as any },
    });
    if (!result.count) throw new NotFoundException('Report schedule not found');
    return db.reportSchedule.findUnique({ where: { id } });
  }

  async deleteSchedule(db: any, id: string) {
    const result = await db.reportSchedule.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), isActive: false } });
    if (!result.count) throw new NotFoundException('Report schedule not found');
    return { deleted: true };
  }
}
