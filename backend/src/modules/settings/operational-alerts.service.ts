import { Injectable, NotFoundException } from '@nestjs/common';

type AlertCandidate = {
  sourceKey: string;
  type: string;
  severity: 'WARNING' | 'CRITICAL';
  title: string;
  details: string;
  targetPath: string;
  requiredPermission: string;
  assigneeId?: string | null;
};

const LEASE_ALERT_WINDOW_DAYS = 30;
const RECONCILIATION_LOCK = 731004;

@Injectable()
export class OperationalAlertsService {
  private readonly recentReconciliations = new WeakMap<object, { expiresAt: number; promise?: Promise<void> }>();

  async reconcileTenantIfStale(tenantDb: any, maxAgeMs = 60_000) {
    const recent = this.recentReconciliations.get(tenantDb);
    if (recent?.promise) return recent.promise;
    if (recent && recent.expiresAt > Date.now()) return;
    const promise = this.reconcileTenant(tenantDb).then(() => undefined);
    this.recentReconciliations.set(tenantDb, { expiresAt: 0, promise });
    try {
      await promise;
      this.recentReconciliations.set(tenantDb, { expiresAt: Date.now() + maxAgeMs });
    } catch (error) {
      this.recentReconciliations.delete(tenantDb);
      throw error;
    }
  }

  async reconcileTenant(tenantDb: any, now = new Date()) {
    const candidates = await this.collectCandidates(tenantDb, now);
    await tenantDb.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${RECONCILIATION_LOCK})`;
      const activeAlerts = await tx.operationalAlert.findMany({ where: { resolvedAt: null } });
      const activeBySource = new Map<string, any>(activeAlerts.map((alert: any) => [alert.sourceKey, alert]));

      for (const candidate of candidates) {
        const existing = activeBySource.get(candidate.sourceKey);
        const escalation = candidate.severity === 'CRITICAL' && !existing?.escalatedAt
          ? { escalatedAt: now }
          : {};
        if (existing) {
          await tx.operationalAlert.update({ where: { id: existing.id }, data: { ...candidate, ...escalation } });
          activeBySource.delete(candidate.sourceKey);
        } else {
          await tx.operationalAlert.create({ data: { ...candidate, ...escalation } });
        }
      }

      const resolvedIds = Array.from(activeBySource.values()).map((alert: any) => alert.id);
      if (resolvedIds.length) await tx.operationalAlert.updateMany({ where: { id: { in: resolvedIds } }, data: { resolvedAt: now } });
    });
  }

  async getAlertsForUser(tenantDb: any, userId: string, permissions: string[] = [], isOwner = false) {
    const alerts = await tenantDb.operationalAlert.findMany({
      where: { resolvedAt: null },
      include: { reads: { where: { userId }, select: { id: true, dismissedAt: true } } },
      orderBy: [{ severity: 'asc' }, { activeAt: 'desc' }],
      take: 100,
    });
    return alerts
      .filter((alert: any) => (isOwner || permissions.includes(alert.requiredPermission)) && (!alert.assigneeId || alert.assigneeId === userId) && !alert.reads[0]?.dismissedAt)
      .map((alert: any) => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        details: alert.details,
        targetPath: alert.targetPath,
        activeAt: alert.activeAt,
        escalatedAt: alert.escalatedAt,
        assigneeId: alert.assigneeId,
        isUnread: !alert.reads.length,
      }));
  }

  async markAlertRead(tenantDb: any, alertId: string, userId: string, permissions: string[] = [], isOwner = false) {
    const visible = await this.getAlertsForUser(tenantDb, userId, permissions, isOwner);
    if (!visible.some((alert: any) => alert.id === alertId)) throw new NotFoundException('Alert not found');
    return tenantDb.operationalAlertRead.upsert({
      where: { alertId_userId: { alertId, userId } },
      create: { alertId, userId },
      update: { readAt: new Date() },
    });
  }

  async dismissAlert(tenantDb: any, alertId: string, userId: string, permissions: string[] = [], isOwner = false) {
    const visible = await this.getAlertsForUser(tenantDb, userId, permissions, isOwner);
    if (!visible.some((alert: any) => alert.id === alertId)) throw new NotFoundException('Alert not found');
    return tenantDb.operationalAlertRead.upsert({
      where: { alertId_userId: { alertId, userId } },
      create: { alertId, userId, dismissedAt: new Date() },
      update: { readAt: new Date(), dismissedAt: new Date() },
    });
  }

  getDigestAlerts(tenantDb: any) {
    return tenantDb.operationalAlert.findMany({
      where: { resolvedAt: null },
      orderBy: [{ severity: 'asc' }, { activeAt: 'asc' }],
      take: 100,
    });
  }

  async markAlertsRead(tenantDb: any, userId: string, permissions: string[] = [], isOwner = false) {
    const alerts = await this.getAlertsForUser(tenantDb, userId, permissions, isOwner);
    const unreadIds = alerts.filter((alert: any) => alert.isUnread).map((alert: any) => alert.id);
    if (unreadIds.length) await tenantDb.operationalAlertRead.createMany({
      data: unreadIds.map((alertId: string) => ({ alertId, userId })),
      skipDuplicates: true,
    });
  }

  private async collectCandidates(tenantDb: any, now: Date): Promise<AlertCandidate[]> {
    const leaseCutoff = new Date(now);
    leaseCutoff.setDate(leaseCutoff.getDate() + LEASE_ALERT_WINDOW_DAYS);
    const [materials, rentPayments, payrolls, tasks, leases] = await Promise.all([
      tenantDb.material.findMany({ where: { deletedAt: null, status: 'ACTIVE' }, select: { id: true, name: true, quantity: true, lowStockThreshold: true } }),
      tenantDb.rentPayment.findMany({ where: { deletedAt: null, dueDate: { lt: now }, status: { not: 'PAID' } }, include: { tenant: { select: { name: true } } } }),
      tenantDb.payroll.findMany({ where: { deletedAt: null, status: 'PENDING_APPROVAL' }, select: { id: true, name: true, year: true, month: true } }),
      tenantDb.projectTask.findMany({ where: { deletedAt: null, dueDate: { lt: now }, status: { not: 'COMPLETED' } }, include: { project: { select: { name: true } } } }),
      tenantDb.rentalContract.findMany({ where: { deletedAt: null, status: 'ACTIVE', OR: [{ endDate: { gte: now, lte: leaseCutoff } }, { renewalDate: { gte: now, lte: leaseCutoff } }] }, include: { tenant: { select: { name: true } }, property: { select: { title: true } } } }),
    ]);

    const candidates: AlertCandidate[] = [];
    for (const material of materials) {
      if (Number(material.quantity) <= Number(material.lowStockThreshold)) candidates.push({
        sourceKey: `low-stock:${material.id}`, type: 'LOW_STOCK', severity: 'WARNING', title: `Low stock: ${material.name}`,
        details: `${Number(material.quantity)} remaining; threshold is ${Number(material.lowStockThreshold)}.`, targetPath: '/app/materials/inventory', requiredPermission: 'materials_products.read',
      });
    }
    for (const payment of rentPayments) {
      if (Number(payment.amountPaid) >= Number(payment.amountDue)) continue;
      const overdueDays = Math.max(1, Math.ceil((now.getTime() - new Date(payment.dueDate).getTime()) / 86_400_000));
      candidates.push({
        sourceKey: `overdue-rent:${payment.id}`, type: 'OVERDUE_RENT', severity: 'CRITICAL', title: `Overdue rent: ${payment.tenant?.name || 'Tenant'}`,
        details: `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue with ${Number(payment.amountDue) - Number(payment.amountPaid)} outstanding.`, targetPath: '/app/real-estate/rent-payments', requiredPermission: 'rentals.read',
      });
    }
    for (const payroll of payrolls) candidates.push({
      sourceKey: `payroll-approval:${payroll.id}`, type: 'PAYROLL_APPROVAL', severity: 'WARNING', title: `Payroll awaiting approval: ${payroll.name}`,
      details: `Payroll period ${payroll.year}-${String(payroll.month).padStart(2, '0')} requires approval.`, targetPath: '/app/payroll', requiredPermission: 'payroll.approve',
    });
    for (const task of tasks) {
      const overdueDays = Math.max(1, Math.ceil((now.getTime() - new Date(task.dueDate).getTime()) / 86_400_000));
      candidates.push({
        sourceKey: `overdue-task:${task.id}`, type: 'OVERDUE_TASK', severity: overdueDays >= 7 ? 'CRITICAL' : 'WARNING', title: `Overdue task: ${task.title}`,
        details: `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue${task.project?.name ? ` · ${task.project.name}` : ''}.`, targetPath: '/app/construction/tasks', requiredPermission: 'construction_tasks.read', assigneeId: task.assigneeId || null,
      });
    }
    for (const lease of leases) {
      const date = lease.renewalDate && new Date(lease.renewalDate) <= new Date(lease.endDate) ? lease.renewalDate : lease.endDate;
      const remainingDays = Math.max(0, Math.ceil((new Date(date).getTime() - now.getTime()) / 86_400_000));
      candidates.push({
        sourceKey: `lease-expiry:${lease.id}`, type: 'LEASE_EXPIRY', severity: 'WARNING', title: `Lease ending soon: ${lease.property?.title || 'Property'}`,
        details: `${lease.tenant?.name || 'Tenant'} has ${remainingDays} day${remainingDays === 1 ? '' : 's'} until renewal or end date.`, targetPath: '/app/real-estate/rental-contracts', requiredPermission: 'rentals.read',
      });
    }
    return candidates;
  }
}
