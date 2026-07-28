import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CentralPrismaService } from '../../common/database/central-prisma.service';
import { TenantConnectionManager } from '../../common/database/tenant-connection.manager';
import { TenantProvisioningService } from '../../common/database/tenant-provisioning.service';
import {
  NeonManagementService,
  NeonTenantDatabase,
} from '../../common/database/neon-management.service';
import { protectDatabaseUrl, revealDatabaseUrl } from '../../common/database/database-credentials';
import { isNeonDatabaseUrl } from '../../common/database/database-url';
import { CreateCompanyDto } from './superadmin.dto';
import * as argon2 from 'argon2';
import { normalizeLimit, normalizePlanFeatures } from '../../common/subscriptions/entitlement-policy';
import { SubscriptionLifecycleService } from '../../common/subscriptions/subscription-lifecycle.service';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly centralPrisma: CentralPrismaService,
    private readonly tenantManager: TenantConnectionManager,
    private readonly tenantProvisioning: TenantProvisioningService,
    private readonly neonManagement: NeonManagementService,
    private readonly subscriptions: SubscriptionLifecycleService,
  ) {}

  private get central(): any {
    return this.centralPrisma as any;
  }

  async getAccount(adminId: string) {
    const account = await this.central.centralAdmin.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, name: true, createdAt: true, lastLoginAt: true, passwordResetAt: true },
    });
    if (!account) throw new NotFoundException('Platform administrator not found');
    return { ...account, role: 'SUPER_ADMIN' };
  }

  async updateAccountEmail(adminId: string, email: string, currentPassword: string) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new BadRequestException('A valid email address is required');
    const account = await this.central.centralAdmin.findUnique({ where: { id: adminId } });
    if (!account || !(await argon2.verify(account.passwordHash, currentPassword || ''))) {
      throw new BadRequestException('Current password is incorrect');
    }
    const duplicate = await this.central.centralAdmin.findFirst({ where: { email: normalized, NOT: { id: adminId } } });
    if (duplicate) throw new ConflictException('Email address is already in use');
    return this.central.centralAdmin.update({ where: { id: adminId }, data: { email: normalized }, select: { id: true, email: true, name: true } });
  }

  async updateAccountPassword(adminId: string, currentPassword: string, newPassword: string) {
    if (String(newPassword || '').length < 10 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      throw new BadRequestException('Password must have at least 10 characters, an uppercase letter, a number and a special character');
    }
    const account = await this.central.centralAdmin.findUnique({ where: { id: adminId } });
    if (!account || !(await argon2.verify(account.passwordHash, currentPassword || ''))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (await argon2.verify(account.passwordHash, newPassword)) throw new BadRequestException('New password must be different');
    await this.central.centralAdmin.update({ where: { id: adminId }, data: { passwordHash: await argon2.hash(newPassword), passwordResetAt: new Date() } });
    return { updated: true };
  }

  // -----------------------------------------------------------
  // Company & Tenant Management
  // -----------------------------------------------------------

  getNeonStatus() {
    return this.neonManagement.status();
  }

  async createCompany(data: CreateCompanyDto, adminId?: string) {
    const subdomain = data.subdomain.trim().toLowerCase();
    const adminEmail = data.adminEmail.trim().toLowerCase();
    const duplicate = await this.central.company.findFirst({
      where: {
        OR: [{ subdomain }, { adminEmail }],
      },
    });
    if (duplicate) {
      throw new ConflictException('The subdomain or administrator email is already in use');
    }

    let neonDatabase: NeonTenantDatabase | undefined;
    let companyId: string | undefined;

    try {
      neonDatabase = await this.neonManagement.resolveTenantDatabase(subdomain, data.dbUrl);
      const connections = await this.tenantProvisioning.provision(neonDatabase.directUrl);
      const protectedRuntimeUrl = protectDatabaseUrl(connections.runtimeUrl, connections.isNeon);
      const passwordHash = await argon2.hash(data.adminPassword);
      const companyUserId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      const company = await this.central.$transaction(async (tx: any) => {
        const created = await tx.company.create({
          data: {
            name: data.name.trim(),
            subdomain,
            adminName: data.adminName.trim(),
            adminEmail,
            dbUrl: protectedRuntimeUrl,
            companyType: data.companyType?.trim() || null,
            constructionEnabled: data.constructionEnabled ?? false,
            realEstateEnabled: data.realEstateEnabled ?? false,
            materialManagementEnabled: data.materialManagementEnabled ?? false,
          },
        });
        await tx.companyUser.create({
          data: {
            id: companyUserId,
            email: adminEmail,
            passwordHash,
            companyId: created.id,
            role: 'COMPANY_OWNER',
          },
        });
        return created;
      });
      companyId = company.id;

      const tenantDb = this.tenantManager.getTenantDb(connections.runtimeUrl);
      await tenantDb.user.create({
        data: {
          id: companyUserId,
          email: adminEmail,
          name: data.adminName.trim(),
          passwordHash,
          role: 'COMPANY_OWNER',
        },
      });

      if (data.planId) {
        await this.subscriptions.assignSubscription(
          company.id,
          data.planId,
          data.billingCycle || 'MONTHLY',
          adminId,
        );
      }

      return await this.getCompanyById(company.id);
    } catch (error) {
      if (companyId) {
        await this.central.company.delete({ where: { id: companyId } }).catch(() => undefined);
      }
      await this.neonManagement.deleteCreatedDatabase(neonDatabase).catch(() => undefined);
      if (error instanceof HttpException) throw error;
      throw new BadRequestException(
        'Company onboarding failed; provisioned records were rolled back',
      );
    }
  }

  async getAllCompanies(query?: { search?: string; status?: string; page?: number; pageSize?: number }) {
    const where: any = {};
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { subdomain: { contains: query.search, mode: 'insensitive' } },
        { adminEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const paginationRequested = Boolean(query?.page || query?.pageSize);
    const page = Math.max(1, query?.page || 1);
    const pageSize = Math.min(100, Math.max(10, query?.pageSize || 20));
    const [companies, total] = await Promise.all([
      this.central.company.findMany({
      where,
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...(paginationRequested ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
      }),
      this.central.company.count({ where }),
    ]);
    const data = companies.map((company: any) => this.sanitizeCompany(company));
    return paginationRequested ? { data, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } } : data;
  }

  async getCompanyById(id: string) {
    const company = await this.central.company.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
        subscriptionTransactions: {
          orderBy: { createdAt: 'desc' },
        },
        users: true,
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID '${id}' not found`);
    }

    return this.sanitizeCompany(company);
  }

  private sanitizeCompany(company: any) {
    const { dbUrl, users, ...safeCompany } = company;
    let provider = 'POSTGRESQL';
    if (dbUrl) {
      try {
        provider = isNeonDatabaseUrl(revealDatabaseUrl(dbUrl)) ? 'NEON' : 'POSTGRESQL';
      } catch {
        provider = String(process.env.DATABASE_PROVIDER || '').toUpperCase() || 'POSTGRESQL';
      }
    }
    const safeUsers = Array.isArray(users)
      ? users.map(({ passwordHash, resetTokenHash, resetTokenExpiresAt, ...user }: any) => user)
      : undefined;
    return {
      ...safeCompany,
      ...(Array.isArray(safeCompany.subscriptions)
        ? {
            currentSubscription: safeCompany.subscriptions.find(
              (row: any) => ['ACTIVE', 'SUSPENDED'].includes(row.status),
            ) || safeCompany.subscriptions.find((row: any) => row.status === 'PENDING')
              || safeCompany.subscriptions[0]
              || null,
          }
        : {}),
      ...(safeUsers ? { users: safeUsers } : {}),
      database: {
        configured: Boolean(dbUrl),
        provider,
        runtimeConnection: provider === 'NEON' ? 'POOLED' : 'DIRECT',
      },
    };
  }

  async updateCompanyStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_SETUP') {
    await this.getCompanyById(id);

    const company = await this.central.company.update({
      where: { id },
      data: {
        status,
        version: { increment: 1 },
      },
    });
    return this.sanitizeCompany(company);
  }

  async updateCompanyModules(
    id: string,
    modules: { constructionEnabled?: boolean; realEstateEnabled?: boolean; materialManagementEnabled?: boolean },
  ) {
    const activeSubscription = await this.central.tenantSubscription.findFirst({
      where: { companyId: id, status: { in: ['ACTIVE', 'SUSPENDED'] } },
    });
    if (activeSubscription) {
      throw new BadRequestException(
        'Workspace access is managed by the active subscription plan. Change the plan instead.',
      );
    }
    const company = await this.central.company.update({
      where: { id },
      data: {
        ...modules,
        version: { increment: 1 },
      },
    });
    return this.sanitizeCompany(company);
  }

  // -----------------------------------------------------------
  // Customizable Subscription Plans
  // -----------------------------------------------------------

  async getAllPlans() {
    return this.central.subscriptionPlan.findMany({
      orderBy: { priceMonthly: 'asc' },
    });
  }

  async createPlan(data: {
    key: string;
    name: string;
    description?: string;
    priceMonthly: number;
    priceYearly: number;
    constructionMax?: number;
    propertiesMax?: number;
    usersMax?: number;
    features?: any;
    isActive?: boolean;
  }) {
    const key = String(data.key || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{1,49}$/.test(key)) {
      throw new BadRequestException('Plan key must contain 2-50 lowercase letters, numbers, dashes or underscores');
    }
    const existing = await this.central.subscriptionPlan.findUnique({
      where: { key },
    });

    if (existing) {
      throw new ConflictException(`Subscription plan key '${key}' already exists`);
    }
    this.validatePlanPrices(data.priceMonthly, data.priceYearly);
    return this.central.subscriptionPlan.create({
      data: {
        key,
        name: String(data.name || '').trim(),
        description: data.description?.trim() || null,
        priceMonthly: Number(data.priceMonthly),
        priceYearly: Number(data.priceYearly),
        constructionMax: normalizeLimit(data.constructionMax),
        propertiesMax: normalizeLimit(data.propertiesMax),
        usersMax: normalizeLimit(data.usersMax, 5),
        features: normalizePlanFeatures(data.features),
        isActive: data.isActive ?? true,
      },
    });
  }

  async updatePlan(id: string, data: Partial<{
    name: string;
    description: string;
    priceMonthly: number;
    priceYearly: number;
    constructionMax: number;
    propertiesMax: number;
    usersMax: number;
    features: any;
    isActive: boolean;
  }>) {
    if (data.priceMonthly !== undefined || data.priceYearly !== undefined) {
      const current = await this.central.subscriptionPlan.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Subscription plan not found');
      this.validatePlanPrices(
        data.priceMonthly ?? current.priceMonthly,
        data.priceYearly ?? current.priceYearly,
      );
    }
    const normalized: any = {
      ...data,
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description.trim() || null } : {}),
      ...(data.features !== undefined ? { features: normalizePlanFeatures(data.features) } : {}),
      ...(data.constructionMax !== undefined ? { constructionMax: normalizeLimit(data.constructionMax) } : {}),
      ...(data.propertiesMax !== undefined ? { propertiesMax: normalizeLimit(data.propertiesMax) } : {}),
      ...(data.usersMax !== undefined ? { usersMax: normalizeLimit(data.usersMax) } : {}),
    };
    const plan = await this.central.subscriptionPlan.update({
      where: { id },
      data: normalized,
    });
    const synchronization = await this.subscriptions.syncPlanSubscribers(id);
    return { ...plan, subscriberSynchronization: synchronization };
  }

  private validatePlanPrices(monthly: number, yearly: number) {
    if (!Number.isFinite(Number(monthly)) || Number(monthly) < 0 ||
        !Number.isFinite(Number(yearly)) || Number(yearly) < 0) {
      throw new BadRequestException('Plan prices must be valid non-negative numbers');
    }
  }

  // -----------------------------------------------------------
  // Tenant Subscriptions & Invoicing
  // -----------------------------------------------------------

  assignSubscription(
    companyId: string,
    planId: string,
    billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY',
    adminId?: string,
  ) {
    return this.subscriptions.assignSubscription(companyId, planId, billingCycle, adminId);
  }

  markInvoicePaid(invoiceId: string, paymentMethod = 'MANUAL_BANK_TRANSFER', adminId?: string) {
    return this.subscriptions.markInvoicePaid(invoiceId, paymentMethod, adminId);
  }

  createRenewalInvoice(companyId: string, adminId?: string) {
    return this.subscriptions.createRenewalInvoice(companyId, adminId);
  }

  suspendSubscription(companyId: string, adminId?: string, notes?: string) {
    return this.subscriptions.suspendSubscription(companyId, adminId, notes);
  }

  resumeSubscription(companyId: string, adminId?: string, notes?: string) {
    return this.subscriptions.resumeSubscription(companyId, adminId, notes);
  }

  cancelSubscription(companyId: string, adminId?: string, notes?: string) {
    return this.subscriptions.cancelSubscription(companyId, adminId, notes);
  }

  setSubscriptionAutoRenew(companyId: string, autoRenew: boolean, adminId?: string) {
    return this.subscriptions.setAutoRenew(companyId, autoRenew, adminId);
  }

  cancelInvoice(invoiceId: string, adminId?: string, notes?: string) {
    return this.subscriptions.cancelInvoice(invoiceId, adminId, notes);
  }

  // -----------------------------------------------------------
  // Super Admin Financial Metrics & Analytics
  // -----------------------------------------------------------

  async getPlatformFinancialSummary() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const [
      totalCompanies,
      activeCompanies,
      expiredCompanies,
      trialCompanies,
      totalUsers,
      activeSubscriptions,
      monthlyRevenue,
      outstandingInvoices,
      latestRegistrations,
      recentTransactions,
      statusRows,
      growthRows,
      revenueRows,
      expiringSoon,
    ] = await Promise.all([
      this.central.company.count(),
      this.central.company.count({ where: { status: 'ACTIVE' } }),
      this.central.company.count({ where: { subscriptionStatus: 'EXPIRED' } }),
      this.central.tenantSubscription.count({
        where: { status: 'ACTIVE', plan: { priceMonthly: 0 } },
      }),
      this.central.companyUser.count({ where: { isActive: true, deletedAt: null } }),
      this.central.tenantSubscription.count({ where: { status: 'ACTIVE', expiresAt: { gt: now } } }),
      this.central.invoice.aggregate({ where: { status: 'PAID', paidAt: { gte: monthStart } }, _sum: { amount: true } }),
      this.central.invoice.aggregate({ where: { status: { in: ['UNPAID', 'OVERDUE'] } }, _sum: { amount: true }, _count: { id: true } }),
      this.central.company.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, subdomain: true, status: true, subscriptionStatus: true, createdAt: true },
      }),
      this.central.subscriptionTransaction.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { company: { select: { id: true, name: true, subdomain: true } } },
      }),
      this.central.company.groupBy({ by: ['subscriptionStatus'], _count: { id: true } }),
      this.central.company.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
      this.central.invoice.findMany({ where: { status: 'PAID', paidAt: { gte: sixMonthsAgo } }, select: { amount: true, paidAt: true } }),
      this.central.company.count({
        where: { subscriptionStatus: 'ACTIVE', subscriptionExpiresAt: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) } },
      }),
    ]);

    const months = Array.from({ length: 6 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - 5 + index, 1));
    const monthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;
    const growthMap = new Map<string, number>();
    const revenueMap = new Map<string, number>();
    growthRows.forEach((row: any) => {
      const key = monthKey(new Date(row.createdAt));
      growthMap.set(key, (growthMap.get(key) || 0) + 1);
    });
    revenueRows.forEach((row: any) => {
      if (!row.paidAt) return;
      const key = monthKey(new Date(row.paidAt));
      revenueMap.set(key, (revenueMap.get(key) || 0) + Number(row.amount || 0));
    });

    return {
      totalCompanies,
      activeCompanies,
      expiredCompanies,
      trialCompanies,
      totalUsers,
      activeSubscriptions,
      monthlyRevenue: Number(monthlyRevenue._sum.amount || 0),
      outstandingInvoices: { count: outstandingInvoices._count.id, amount: Number(outstandingInvoices._sum.amount || 0) },
      latestRegistrations,
      recentTransactions,
      subscriptionStatusDistribution: statusRows.map((row: any) => ({ status: row.subscriptionStatus, count: row._count.id })),
      growthTrend: months.map((month) => ({ label: month.toLocaleString('en-US', { month: 'short' }), value: growthMap.get(monthKey(month)) || 0 })),
      revenueTrend: months.map((month) => ({ label: month.toLocaleString('en-US', { month: 'short' }), value: revenueMap.get(monthKey(month)) || 0 })),
      systemHealth: { database: 'OPERATIONAL', expiringSoon },
    };
  }

  async updateCompany(id: string, data: Partial<CreateCompanyDto & { phone?: string; address?: string; description?: string; logoUrl?: string }>) {
    const current = await this.central.company.findUnique({ where: { id }, include: { users: { where: { role: 'COMPANY_OWNER' }, take: 1 } } });
    if (!current) throw new NotFoundException(`Company with ID '${id}' not found`);
    const moduleChangeRequested = data.constructionEnabled !== undefined
      || data.realEstateEnabled !== undefined
      || data.materialManagementEnabled !== undefined;
    if (moduleChangeRequested) {
      const managedSubscription = await this.central.tenantSubscription.findFirst({
        where: { companyId: id, status: { in: ['ACTIVE', 'SUSPENDED'] } },
      });
      if (managedSubscription) {
        const changed = (data.constructionEnabled !== undefined && data.constructionEnabled !== current.constructionEnabled)
          || (data.realEstateEnabled !== undefined && data.realEstateEnabled !== current.realEstateEnabled)
          || (data.materialManagementEnabled !== undefined && data.materialManagementEnabled !== current.materialManagementEnabled);
        if (changed) {
          throw new BadRequestException('Workspace access is controlled by the active subscription plan');
        }
      }
    }
    const adminEmail = data.adminEmail?.trim().toLowerCase();
    if (adminEmail && adminEmail !== current.adminEmail) {
      const duplicate = await this.central.company.findFirst({ where: { adminEmail, NOT: { id } } });
      if (duplicate) throw new ConflictException('The administrator email is already in use');
    }
    const update: any = {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.adminName !== undefined ? { adminName: data.adminName.trim() } : {}),
      ...(adminEmail ? { adminEmail } : {}),
      ...(data.companyType !== undefined ? { companyType: data.companyType.trim() || null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone.trim() || null } : {}),
      ...(data.address !== undefined ? { address: data.address.trim() || null } : {}),
      ...(data.description !== undefined ? { description: data.description.trim() || null } : {}),
      ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl.trim() || null } : {}),
      ...(data.constructionEnabled !== undefined ? { constructionEnabled: data.constructionEnabled } : {}),
      ...(data.realEstateEnabled !== undefined ? { realEstateEnabled: data.realEstateEnabled } : {}),
      ...(data.materialManagementEnabled !== undefined ? { materialManagementEnabled: data.materialManagementEnabled } : {}),
      version: { increment: 1 },
    };
    const updated = await this.central.$transaction(async (tx: any) => {
      if (adminEmail && current.users[0]) await tx.companyUser.update({ where: { id: current.users[0].id }, data: { email: adminEmail } });
      return tx.company.update({ where: { id }, data: update });
    });
    let synchronizationWarning: string | undefined;
    if ((adminEmail || data.adminName !== undefined) && current.users[0]) {
      try {
        const tenantDb = this.tenantManager.getTenantDb(revealDatabaseUrl(current.dbUrl));
        await tenantDb.user.update({ where: { id: current.users[0].id }, data: { ...(adminEmail ? { email: adminEmail } : {}), ...(data.adminName !== undefined ? { name: data.adminName.trim() } : {}) } });
      } catch {
        synchronizationWarning = 'The platform profile was saved, but the tenant owner account could not be synchronized. Retry after restoring the tenant database connection.';
      }
    }
    return { ...(await this.getCompanyById(updated.id)), ...(synchronizationWarning ? { synchronizationWarning } : {}) };
  }

  async deleteCompany(id: string) {
    const company = await this.central.company.findUnique({ where: { id }, select: { id: true, name: true, status: true } });
    if (!company) throw new NotFoundException(`Company with ID '${id}' not found`);
    if (company.status === 'ACTIVE') throw new BadRequestException('Suspend an active company before deleting its platform registry record');
    await this.central.company.delete({ where: { id } });
    return { deleted: true, id, name: company.name, tenantDatabaseRetained: true };
  }

  async getPlatformNotifications() {
    const now = new Date();
    const [registrations, invoices, transactions, expiredCompanies, expiringCompanies] = await Promise.all([
      this.central.company.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, createdAt: true } }),
      this.central.invoice.findMany({ where: { status: { in: ['UNPAID', 'OVERDUE', 'EXPIRED'] } }, take: 5, orderBy: { updatedAt: 'desc' }, include: { company: { select: { id: true, name: true } } } }),
      this.central.subscriptionTransaction.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { company: { select: { id: true, name: true } } } }),
      this.central.company.findMany({ where: { subscriptionStatus: 'EXPIRED' }, take: 5, orderBy: { subscriptionExpiresAt: 'desc' }, select: { id: true, name: true, subscriptionExpiresAt: true } }),
      this.central.company.findMany({ where: { subscriptionStatus: 'ACTIVE', subscriptionExpiresAt: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) } }, take: 5, orderBy: { subscriptionExpiresAt: 'asc' }, select: { id: true, name: true, subscriptionExpiresAt: true } }),
    ]);
    const notifications = [
      ...registrations.map((row: any) => ({ id: `company-${row.id}`, category: 'REGISTRATION', title: 'New company registration', details: `${row.name} registered on the platform.`, createdAt: row.createdAt, companyId: row.id })),
      ...invoices.map((row: any) => ({
        id: `invoice-${row.id}`,
        category: ['OVERDUE', 'EXPIRED'].includes(row.status) ? 'FAILED_PAYMENT' : 'OUTSTANDING_INVOICE',
        title: row.status === 'EXPIRED' ? 'Invoice expired' : row.status === 'OVERDUE' ? 'Overdue invoice' : 'Outstanding invoice',
        details: `${row.company.name} has ${row.status.toLowerCase()} invoice ${row.invoiceNumber}.`,
        createdAt: row.updatedAt || row.dueDate,
        companyId: row.companyId,
      })),
      ...transactions.map((row: any) => ({ id: `subscription-${row.id}`, category: 'SUBSCRIPTION', title: row.transactionType.replace(/_/g, ' '), details: `${row.company.name}: subscription status changed to ${row.newStatus}.`, createdAt: row.createdAt, companyId: row.companyId })),
      ...expiredCompanies.map((row: any) => ({ id: `expired-${row.id}`, category: 'EXPIRED_SUBSCRIPTION', title: 'Subscription expired', details: `${row.name}'s subscription has expired.`, createdAt: row.subscriptionExpiresAt || now, companyId: row.id })),
      ...expiringCompanies.map((row: any) => ({ id: `expiring-${row.id}`, category: 'SUBSCRIPTION_RENEWAL', title: 'Subscription expiring soon', details: `${row.name}'s subscription expires soon.`, createdAt: row.subscriptionExpiresAt || now, companyId: row.id })),
    ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12);
    return { notifications };
  }
}
