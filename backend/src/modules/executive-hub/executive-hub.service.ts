import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class ExecutiveHubService {

  async getDashboardSummary(tenantDb: any, entitlements: any) {
    if (!tenantDb) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0,
        staffCount: 0,
        activeProjects: 0,
        activeProperties: 0,
        recentTransactions: [],
      };
    }

    const incomeAgg = await tenantDb.transaction.aggregate({
      where: { type: 'INCOME', status: 'CLEARED' },
      _sum: { amount: true },
    });

    const expenseAgg = await tenantDb.transaction.aggregate({
      where: { type: 'EXPENSE', status: 'CLEARED' },
      _sum: { amount: true },
    });

    const totalIncome = Number(incomeAgg._sum.amount || 0);
    const totalExpenses = Number(expenseAgg._sum.amount || 0);
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    const staffCount = await tenantDb.staff.count({ where: { deletedAt: null } });
    
    let activeProjects = 0;
    try {
      if (entitlements?.features?.construction) {
        activeProjects = await tenantDb.project.count({ where: { status: 'ONGOING' } });
      }
    } catch {}

    let activeProperties = 0;
    try {
      if (entitlements?.features?.realEstate) {
        activeProperties = await tenantDb.property.count({ where: { status: 'AVAILABLE' } });
      }
    } catch {}

    const recentTransactions = await tenantDb.transaction.findMany({
      take: 10,
      orderBy: { date: 'desc' },
      include: { category: true, project: true, property: true, deal: true },
    });

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      staffCount,
      activeProjects,
      activeProperties,
      recentTransactions,
    };
  }

  async getAnalytics(tenantDb: any, entitlements: any, period = 'monthly', workspace = 'all') {
    const workspaceFeature: Record<string, string> = {
      construction: 'construction',
      real_estate: 'realEstate',
      material_management: 'materials',
    };
    if (workspaceFeature[workspace] && !entitlements?.features?.[workspaceFeature[workspace]]) {
      throw new ForbiddenException('The selected workspace is not included in the current subscription plan');
    }
    const now = new Date();
    const start = period === 'weekly'
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
      : period === 'yearly'
        ? new Date(now.getFullYear(), 0, 1)
        : new Date(now.getFullYear(), now.getMonth(), 1);
    const where: any = { deletedAt: null, date: { gte: start } };
    if (workspace === 'construction') where.projectId = { not: null };
    if (workspace === 'real_estate') where.propertyId = { not: null };
    const transactions = await tenantDb.transaction.findMany({
      where,
      select: { date: true, type: true, amount: true },
      orderBy: { date: 'asc' },
    });
    const points = new Map<string, { label: string; income: number; expense: number; net: number }>();
    for (const transaction of transactions) {
      const date = new Date(transaction.date);
      const label = period === 'weekly'
        ? date.toLocaleDateString('en-US', { weekday: 'short' })
        : period === 'yearly'
          ? date.toLocaleDateString('en-US', { month: 'short' })
          : String(date.getDate()).padStart(2, '0');
      const point = points.get(label) || { label, income: 0, expense: 0, net: 0 };
      point[transaction.type === 'INCOME' ? 'income' : 'expense'] += Number(transaction.amount);
      point.net = point.income - point.expense;
      points.set(label, point);
    }
    const series = Array.from(points.values());
    const totalIncome = series.reduce((sum, point) => sum + point.income, 0);
    const totalExpense = series.reduce((sum, point) => sum + point.expense, 0);
    const [construction, realEstate, material] = await Promise.all([
      entitlements?.features?.construction ? tenantDb.project.count({ where: { deletedAt: null } }) : 0,
      entitlements?.features?.realEstate ? tenantDb.property.count({ where: { deletedAt: null } }) : 0,
      entitlements?.features?.materials ? tenantDb.material.count({ where: { deletedAt: null } }) : 0,
    ]);
    return {
      period,
      workspace,
      totals: { totalIncome, totalExpense, netProfit: totalIncome - totalExpense, transactionCount: transactions.length },
      series,
      distribution: [
        { label: 'Construction', value: construction, color: '#059669' },
        { label: 'Real Estate', value: realEstate, color: '#2563eb' },
        { label: 'Materials', value: material, color: '#d97706' },
      ].filter((item) => item.value > 0),
    };
  }
}
