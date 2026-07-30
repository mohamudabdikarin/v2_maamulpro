import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class ExecutiveHubService {

  async getDashboardSummary(tenantDb: any, entitlements: any) {
    if (!tenantDb) {
      return this.emptyDashboardSummary();
    }

    const hasConstruction = Boolean(entitlements?.features?.construction);
    const hasRealEstate = Boolean(entitlements?.features?.realEstate);
    const hasMaterials = Boolean(entitlements?.features?.materials);
    const now = new Date();
    const daysAgo = (days: number) => {
      const date = new Date(now);
      date.setDate(date.getDate() - days);
      date.setHours(0, 0, 0, 0);
      return date;
    };
    const last30 = daysAgo(30);
    const prev60to30 = daysAgo(60);
    const last7 = daysAgo(7);
    const prev14to7 = daysAgo(14);
    const last90 = daysAgo(90);
    const transactionWhere = { deletedAt: null };

    const [
      incomeAgg,
      expenseAgg,
      totalStaff,
      dailyTransactions,
      recentActivity,
      thisMonthIncome,
      previousMonthIncome,
      thisMonthExpense,
      previousMonthExpense,
      staffBeforeMonth,
      thisWeekTransactions,
      previousWeekTransactions,
      constructionCounts,
      realEstateCounts,
      materials,
    ] = await Promise.all([
      tenantDb.transaction.aggregate({ where: { ...transactionWhere, type: 'INCOME' }, _sum: { amount: true } }),
      tenantDb.transaction.aggregate({ where: { ...transactionWhere, type: 'EXPENSE' }, _sum: { amount: true } }),
      tenantDb.staff.count({ where: { deletedAt: null } }),
      tenantDb.transaction.findMany({ where: { ...transactionWhere, date: { gte: last90 } }, select: { date: true, type: true, amount: true }, orderBy: { date: 'asc' } }),
      tenantDb.activityLog.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } }),
      tenantDb.transaction.aggregate({ where: { ...transactionWhere, type: 'INCOME', date: { gte: last30 } }, _sum: { amount: true } }),
      tenantDb.transaction.aggregate({ where: { ...transactionWhere, type: 'INCOME', date: { gte: prev60to30, lt: last30 } }, _sum: { amount: true } }),
      tenantDb.transaction.aggregate({ where: { ...transactionWhere, type: 'EXPENSE', date: { gte: last30 } }, _sum: { amount: true } }),
      tenantDb.transaction.aggregate({ where: { ...transactionWhere, type: 'EXPENSE', date: { gte: prev60to30, lt: last30 } }, _sum: { amount: true } }),
      tenantDb.staff.count({ where: { deletedAt: null, createdAt: { lt: last30 } } }),
      tenantDb.transaction.count({ where: { ...transactionWhere, date: { gte: last7 } } }),
      tenantDb.transaction.count({ where: { ...transactionWhere, date: { gte: prev14to7, lt: last7 } } }),
      hasConstruction ? Promise.all([
        tenantDb.project.count({ where: { deletedAt: null } }),
        tenantDb.project.count({ where: { deletedAt: null, status: 'ONGOING' } }),
        tenantDb.project.count({ where: { deletedAt: null, status: 'COMPLETED' } }),
      ]) : Promise.resolve(null),
      hasRealEstate ? Promise.all([
        tenantDb.property.count({ where: { deletedAt: null } }),
        tenantDb.property.count({ where: { deletedAt: null, status: 'AVAILABLE' } }),
        tenantDb.deal.count({ where: { deletedAt: null, paymentStatus: { in: ['PENDING', 'PARTIAL'] } } }),
      ]) : Promise.resolve(null),
      hasMaterials ? tenantDb.material.findMany({ where: { deletedAt: null }, select: { quantity: true, lowStockThreshold: true } }) : Promise.resolve(null),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount || 0);
    const totalExpense = Number(expenseAgg._sum.amount || 0);
    const netProfit = totalIncome - totalExpense;
    const number = (value: unknown) => Number(value || 0);
    const change = (current: number, previous: number) => previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);
    const dates = new Map<string, { income: number; expense: number }>();
    for (let offset = 89; offset >= 0; offset -= 1) {
      const date = new Date(now);
      date.setDate(date.getDate() - offset);
      dates.set(date.toISOString().slice(0, 10), { income: 0, expense: 0 });
    }
    for (const transaction of dailyTransactions) {
      const key = new Date(transaction.date).toISOString().slice(0, 10);
      const point = dates.get(key);
      if (!point) continue;
      if (transaction.type === 'INCOME') point.income += number(transaction.amount);
      if (transaction.type === 'EXPENSE') point.expense += number(transaction.amount);
    }
    const revenue = Array.from(dates.entries()).map(([date, values]) => ({ label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: Math.round(values.income) }));
    const profit = Array.from(dates.entries()).map(([date, values]) => ({ label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: Math.round(values.income - values.expense) }));
    const lowStockCount = materials?.filter((material: any) => number(material.quantity) <= number(material.lowStockThreshold)).length || 0;

    return {
      totalIncome,
      totalExpense,
      netProfit,
      profitMargin: totalIncome > 0 ? Math.round((netProfit / totalIncome) * 1000) / 10 : 0,
      totalStaff,
      transactionCount: thisWeekTransactions,
      modules: { construction: hasConstruction, realEstate: hasRealEstate, material_management: hasMaterials },
      trends: {
        income: { change: change(number(thisMonthIncome._sum.amount), number(previousMonthIncome._sum.amount)), label: 'vs last month' },
        expense: { change: change(number(thisMonthExpense._sum.amount), number(previousMonthExpense._sum.amount)), label: 'vs last month' },
        staff: { change: change(totalStaff, staffBeforeMonth), label: 'vs 30 days ago' },
        transactions: { change: change(thisWeekTransactions, previousWeekTransactions), label: 'vs last week', total: thisWeekTransactions },
      },
      charts: { revenue, profit },
      sparklines: { income: revenue.slice(-7).map((point) => point.value), expense: profit.slice(-7).map((point, index) => revenue[revenue.length - 7 + index]?.value - point.value) },
      constructionSummary: constructionCounts ? { projectCount: constructionCounts[0], ongoingProjects: constructionCounts[1], completedProjects: constructionCounts[2] } : null,
      realEstateSummary: realEstateCounts ? { propertyCount: realEstateCounts[0], availableProperties: realEstateCounts[1], activeDealCount: realEstateCounts[2] } : null,
      materialsSummary: materials ? { materialCount: materials.length, lowStockCount } : null,
      recentActivity: recentActivity.map((activity: any) => ({ id: activity.id, action: activity.action, entity: activity.entity, details: activity.details, createdAt: activity.createdAt, userName: activity.user?.name || 'Unknown user' })),
    };
  }

  private emptyDashboardSummary() {
    return {
      totalIncome: 0, totalExpense: 0, netProfit: 0, profitMargin: 0, totalStaff: 0, transactionCount: 0,
      modules: { construction: false, realEstate: false, material_management: false },
      trends: { income: { change: 0, label: 'vs last month' }, expense: { change: 0, label: 'vs last month' }, staff: { change: 0, label: 'vs 30 days ago' }, transactions: { change: 0, label: 'vs last week', total: 0 } },
      charts: { revenue: [], profit: [] }, sparklines: { income: [], expense: [] },
      constructionSummary: null, realEstateSummary: null, materialsSummary: null, recentActivity: [],
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
