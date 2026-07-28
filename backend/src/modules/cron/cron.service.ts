import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CentralPrismaService } from '../../common/database/central-prisma.service';
import { TenantConnectionManager } from '../../common/database/tenant-connection.manager';
import { ReportsService } from '../reports/reports.service';
import { revealDatabaseUrl } from '../../common/database/database-credentials';
import { ResendEmailService } from '../../common/email/resend-email.service';
import { SubscriptionLifecycleService } from '../../common/subscriptions/subscription-lifecycle.service';
import { SubscriptionEntitlementService } from '../../common/subscriptions/subscription-entitlement.service';

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  private reportDeliveryRunning = false;

  constructor(
    private readonly centralPrisma: CentralPrismaService,
    private readonly tenantManager: TenantConnectionManager,
    private readonly reports: ReportsService,
    private readonly email: ResendEmailService,
    private readonly subscriptionLifecycle: SubscriptionLifecycleService,
    private readonly subscriptionEntitlements: SubscriptionEntitlementService,
  ) {}

  private get central(): any {
    return this.centralPrisma as any;
  }

  /**
   * Daily Subscription Expiration & Renewal Job
   * Runs every night at midnight to safely update expired subscriptions
   * and auto-generate renewal invoices.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processSubscriptionRenewalsAndExpirations() {
    try {
      await this.subscriptionLifecycle.backfillLegacyEntitlements();
      const reconciliation = await this.subscriptionLifecycle.reconcileBillingLifecycle();
      const renewalInvoices = await this.subscriptionLifecycle.generateUpcomingRenewalInvoices(7);
      this.logger.log(
        `Subscription lifecycle reconciled: ${reconciliation.overdue} overdue invoices, ` +
        `${reconciliation.expiredInvoices} expired invoices, ${reconciliation.expiredSubscriptions} expired subscriptions, ` +
        `${renewalInvoices.length} renewal invoices prepared`,
      );
    } catch (error: any) {
      this.logger.error(`Error executing subscription lifecycle job: ${error.message}`, error.stack);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async reconcileInvoiceAndSubscriptionStatus() {
    try {
      await this.subscriptionLifecycle.reconcileBillingLifecycle();
    } catch (error: any) {
      this.logger.error(`Hourly billing reconciliation failed: ${error.message}`, error.stack);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processDueReportSchedules() {
    if (this.reportDeliveryRunning) {
      this.logger.warn('Skipping report delivery because the previous run is still active');
      return;
    }
    if (!this.email.isConfigured()) {
      this.logger.warn('Scheduled report delivery is disabled until RESEND_API_KEY and RESEND_FROM are configured');
      return;
    }
    this.reportDeliveryRunning = true;
    const now = new Date();
    try {
      const companies = await this.central.company.findMany({
        where: { status: 'ACTIVE', accessGranted: true, dbUrl: { not: '' } },
        select: { id: true, name: true, adminEmail: true, dbUrl: true, entitlements: true },
      });
      for (const company of companies) {
        if (!this.subscriptionEntitlements.fromCompany(company).features.advancedReports) continue;
        try {
          const db: any = this.tenantManager.getTenantDb(revealDatabaseUrl(company.dbUrl));
          const schedules = await db.reportSchedule.findMany({
            where: {
              deletedAt: null,
              isActive: true,
              OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
            },
            orderBy: { createdAt: 'asc' },
          });
          for (const schedule of schedules) {
            try {
              const filters = this.parseReportFilters(schedule.filters);
              const result = await this.reports.runReport(db, schedule.reportId, filters);
              const csv = this.reportCsv(result);
              const recipients = (schedule.recipients || company.adminEmail)
                .split(',')
                .map((value: string) => value.trim())
                .filter(Boolean);
              if (!recipients.length) throw new Error('No report recipients are configured');
              await this.email.send({
                to: recipients,
                subject: `${company.name}: ${result.report.title}`,
                text: `${result.report.title} is attached as a CSV file.`,
                html: `<h2>${this.escapeHtml(result.report.title)}</h2><p>Your scheduled report for ${this.escapeHtml(company.name)} is attached.</p><p>Generated ${new Date(result.generatedAt).toISOString()}</p>`,
                attachments: [{
                  filename: `${schedule.reportId}-${now.toISOString().slice(0, 10)}.csv`,
                  content: csv,
                }],
              });
              const nextRunAt = this.nextReportRun(now, schedule.frequency);
              await db.reportSchedule.update({ where: { id: schedule.id }, data: { nextRunAt } });
              const actor = await db.user.findFirst({
                where: { deletedAt: null, isActive: true },
                orderBy: { createdAt: 'asc' },
              });
              if (actor) {
                await db.activityLog.create({
                  data: {
                    userId: actor.id,
                    action: 'EXPORT',
                    entity: 'report_schedule',
                    entityId: schedule.id,
                    resource: schedule.reportId,
                    details: `Scheduled report sent to ${recipients.join(', ')}`,
                    ipAddress: 'system',
                    deviceInfo: 'cron',
                  },
                });
              }
              this.logger.log(`Sent report '${schedule.name}' for '${company.name}'`);
            } catch (error: any) {
              this.logger.error(`Report schedule '${schedule.id}' failed for '${company.name}': ${error.message}`);
            }
          }
        } catch (error: any) {
          this.logger.error(`Unable to process report schedules for '${company.name}': ${error.message}`);
        }
      }
    } finally {
      this.reportDeliveryRunning = false;
    }
  }

  private parseReportFilters(value?: string | null) {
    if (!value) return {};
    try {
      const parsed = JSON.parse(value);
      return {
        startDate: typeof parsed.startDate === 'string' ? parsed.startDate : parsed.from,
        endDate: typeof parsed.endDate === 'string' ? parsed.endDate : parsed.to,
        entityId: typeof parsed.entityId === 'string' ? parsed.entityId : undefined,
      };
    } catch {
      return {};
    }
  }

  private nextReportRun(from: Date, frequency: string) {
    const next = new Date(from);
    if (frequency === 'WEEKLY') next.setDate(next.getDate() + 7);
    if (frequency === 'MONTHLY') next.setMonth(next.getMonth() + 1);
    if (frequency === 'YEARLY') next.setFullYear(next.getFullYear() + 1);
    return next;
  }

  private reportCsv(result: { report: { title: string }; summary: any; rows: any[] }) {
    const columns = Object.keys(result.rows[0] || {});
    const lines: string[][] = [
      [result.report.title],
      [],
      ['Metric', 'Value'],
      ...Object.entries(result.summary).map(([key, value]) => [key, String(value)]),
      [],
      columns,
      ...result.rows.map((row) => columns.map((column) => this.csvValue(row[column]))),
    ];
    return lines.map((line) => line.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\r\n');
  }

  private csvValue(value: any) {
    let output = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (/^[=+\-@]/.test(output)) output = `'${output}`;
    return output;
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[character] || character);
  }
}
