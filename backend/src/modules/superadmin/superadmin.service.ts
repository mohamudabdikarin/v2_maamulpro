import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CentralPrismaService } from '../../common/database/central-prisma.service';
import { TenantConnectionManager } from '../../common/database/tenant-connection.manager';
import { TenantProvisioningService } from '../../common/database/tenant-provisioning.service';
import {
  NeonManagementService,
  NeonTenantDatabase,
} from '../../common/database/neon-management.service';
import { protectDatabaseUrl, revealDatabaseUrl } from '../../common/database/database-credentials';
import { getDatabaseConnectionPair, isNeonDatabaseUrl } from '../../common/database/database-url';
import { applyCompanySchema } from '../../common/database/tenant-schema-sql';
import { CreateCompanyDto } from './superadmin.dto';
import * as argon2 from 'argon2';
import { SubscriptionLifecycleService } from '../../common/subscriptions/subscription-lifecycle.service';
import { SubscriptionEntitlementService } from '../../common/subscriptions/subscription-entitlement.service';
import { syncPermissionsToDb } from '../../common/database/rbac-sync';
import { ResendEmailService } from '../../common/email/resend-email.service';
import { randomBytes, randomInt } from 'crypto';
import {
  EnterpriseModuleConfiguration,
  ENTERPRISE_CONFIG_KEY,
  parseEnterpriseModuleConfiguration,
} from '../../common/database/enterprise-config';
import { assertStrongPassword } from '../../common/security/password-policy';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly centralPrisma: CentralPrismaService,
    private readonly tenantManager: TenantConnectionManager,
    private readonly tenantProvisioning: TenantProvisioningService,
    private readonly neonManagement: NeonManagementService,
    private readonly subscriptions: SubscriptionLifecycleService,
    private readonly entitlements: SubscriptionEntitlementService,
    private readonly email: ResendEmailService,
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

  async sendAccountEmailVerification(adminId: string, email: string, currentPassword: string) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new BadRequestException('A valid email address is required');
    const account = await this.central.centralAdmin.findUnique({ where: { id: adminId } });
    if (!account || !(await argon2.verify(account.passwordHash, currentPassword || ''))) {
      throw new BadRequestException('Current password is incorrect');
    }
    const duplicate = await this.central.centralAdmin.findFirst({ where: { email: normalized, NOT: { id: adminId } } });
    if (duplicate) throw new ConflictException('Email address is already in use');
    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.central.emailVerification.upsert({
      where: { email_context: { email: normalized, context: 'EMAIL_CHANGE' } },
      create: { email: normalized, context: 'EMAIL_CHANGE', hashedCode: await argon2.hash(code), expiresAt },
      update: { hashedCode: await argon2.hash(code), expiresAt, status: 'PENDING', attempts: 0, verifiedAt: null },
    });
    const delivery = await this.email.send({
      to: [normalized],
      subject: 'MaamulPro administrator email verification code',
      text: `Your MaamulPro administrator email verification code is ${code}. It expires in 10 minutes.`,
    });
    if (!delivery.sent) {
      await this.central.emailVerification.updateMany({
        where: { email: normalized, context: 'EMAIL_CHANGE', status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      throw new ServiceUnavailableException(
        'Verification email could not be delivered. Please try again later.',
      );
    }
    return { sent: true, expiresAt };
  }

  async updateAccountEmail(adminId: string, email: string, currentPassword: string, verificationCode: string) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new BadRequestException('A valid email address is required');
    const account = await this.central.centralAdmin.findUnique({ where: { id: adminId } });
    if (!account || !(await argon2.verify(account.passwordHash, currentPassword || ''))) {
      throw new BadRequestException('Current password is incorrect');
    }
    const duplicate = await this.central.centralAdmin.findFirst({ where: { email: normalized, NOT: { id: adminId } } });
    if (duplicate) throw new ConflictException('Email address is already in use');
    const verification = await this.central.emailVerification.findUnique({
      where: { email_context: { email: normalized, context: 'EMAIL_CHANGE' } },
    });
    if (!verification || verification.status !== 'PENDING' || verification.expiresAt < new Date()) {
      throw new BadRequestException('Email verification code is invalid or expired');
    }
    if (!(await argon2.verify(verification.hashedCode, String(verificationCode || '')))) {
      await this.central.emailVerification.update({ where: { id: verification.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('Email verification code is incorrect');
    }
    const updated = await this.central.$transaction(async (tx: any) => {
      const row = await tx.centralAdmin.update({ where: { id: adminId }, data: { email: normalized }, select: { id: true, email: true, name: true } });
      await tx.emailVerification.update({ where: { id: verification.id }, data: { status: 'VERIFIED', verifiedAt: new Date() } });
      return row;
    });
    return updated;
  }

  async updateAccountPassword(adminId: string, currentPassword: string, newPassword: string) {
    assertStrongPassword(newPassword);
    const account = await this.central.centralAdmin.findUnique({ where: { id: adminId } });
    if (!account || !(await argon2.verify(account.passwordHash, currentPassword || ''))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (await argon2.verify(account.passwordHash, newPassword)) throw new BadRequestException('New password must be different');
    await this.central.centralAdmin.update({
      where: { id: adminId },
      data: {
        passwordHash: await argon2.hash(newPassword),
        passwordResetAt: new Date(),
        sessionVersion: { increment: 1 },
      },
    });
    return { updated: true };
  }

  // -----------------------------------------------------------
  // Company & Tenant Management
  // -----------------------------------------------------------

  getNeonStatus() {
    return this.neonManagement.status();
  }

  private moduleMode(modules: { construction: boolean; realEstate: boolean; materials: boolean }) {
    if (modules.construction && modules.realEstate && modules.materials) return 'ENTERPRISE';
    if (modules.construction && modules.realEstate) return 'HYBRID';
    if (modules.construction && modules.materials) return 'CONSTRUCTION_MATERIAL';
    if (modules.realEstate && modules.materials) return 'REAL_ESTATE_MATERIAL';
    if (modules.construction) return 'CONSTRUCTION_ONLY';
    if (modules.materials) return 'MATERIAL_MANAGEMENT_ONLY';
    return 'REAL_ESTATE_ONLY';
  }

  private async synchronizeTenantConfiguration(company: any, runtimeUrl?: string) {
    const tenantDb = this.tenantManager.getTenantDb(runtimeUrl || revealDatabaseUrl(company.dbUrl));
    const moduleValues = {
      construction: Boolean(company.constructionEnabled),
      real_estate: Boolean(company.realEstateEnabled),
      material_management: Boolean(company.materialManagementEnabled),
    };
    const values = [
      ['company_name', company.name],
      ['company_slug', company.subdomain],
      ['company_type', company.companyType || 'general'],
      ['construction_enabled', String(moduleValues.construction)],
      ['real_estate_enabled', String(moduleValues.real_estate)],
      ['material_management_enabled', String(moduleValues.material_management)],
      ['modules_enabled', Object.entries(moduleValues).filter(([, enabled]) => enabled).map(([key]) => key).join(',')],
    ];
    for (const [key, value] of values) {
      await tenantDb.systemConfig.upsert({ where: { key }, update: { value }, create: { key, value } });
    }
    await tenantDb.systemConfig.upsert({
      where: { key: ENTERPRISE_CONFIG_KEY },
      update: {},
      create: {
        key: ENTERPRISE_CONFIG_KEY,
        value: JSON.stringify(parseEnterpriseModuleConfiguration(null)),
      },
    });
    return tenantDb;
  }

  private async seedTenantDefaults(company: any, ownerId: string, runtimeUrl?: string) {
    const tenantDb = await this.synchronizeTenantConfiguration(company, runtimeUrl);
    const [firstName, ...rest] = String(company.adminName || '').trim().split(/\s+/);
    await tenantDb.staff.upsert({
      where: { userId: ownerId },
      update: { firstName: firstName || company.adminName, lastName: rest.join(' ') },
      create: {
        userId: ownerId,
        firstName: firstName || company.adminName,
        lastName: rest.join(' '),
        department: 'GENERAL',
        position: 'Company Owner',
      },
    });
    const categories = [
      ['Salary', '#3b82f6'], ['Material', '#f59e0b'], ['Client Payment', '#10b981'],
      ['Consulting', '#8b5cf6'], ['Rent', '#ef4444'], ['Utilities', '#06b6d4'],
      ['Equipment', '#f97316'], ['Other', '#6b7280'],
    ];
    for (const [name, color] of categories) {
      await tenantDb.category.upsert({ where: { name }, update: {}, create: { name, color } });
    }
    const setupLog = await tenantDb.activityLog.findFirst({ where: { action: 'company_setup_completed', entity: 'company_setup' } });
    if (!setupLog) {
      await tenantDb.activityLog.create({
        data: { userId: ownerId, action: 'company_setup_completed', entity: 'company_setup', details: `Initial setup via platform administration for ${company.name}` },
      });
    }
  }

  async createCompany(data: CreateCompanyDto, adminId?: string) {
    const subdomain = data.subdomain.trim().toLowerCase();
    const adminEmail = data.adminEmail.trim().toLowerCase();
    const modules = {
      construction: Boolean(data.constructionEnabled),
      realEstate: Boolean(data.realEstateEnabled),
      materials: Boolean(data.materialManagementEnabled),
    };
    if (!modules.construction && !modules.realEstate && !modules.materials) {
      throw new BadRequestException('Select at least one tenant module during onboarding');
    }
    const duplicate = await this.central.company.findFirst({
      where: {
        OR: [{ subdomain }, { adminEmail }],
      },
    });
    if (duplicate) {
      throw new ConflictException('The subdomain or administrator email is already in use');
    }
    const onboardingVerification = await this.central.emailVerification.findUnique({
      where: {
        email_context: {
          email: adminEmail,
          context: 'COMPANY_ONBOARDING',
        },
      },
    });
    if (
      !onboardingVerification
      || onboardingVerification.status !== 'VERIFIED'
      || !onboardingVerification.verifiedAt
      || onboardingVerification.expiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Verify the company administrator email before creating the company',
      );
    }
    assertStrongPassword(data.adminPassword);

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
            dbProvider: neonDatabase.isNeon ? 'NEON' : 'POSTGRESQL',
            dbCreatedByMaamulPro: neonDatabase.createdByMaamulPro,
            companyType: data.companyType?.trim() || null,
            mode: this.moduleMode(modules),
            status: 'ACTIVE',
            subscriptionStatus: 'ACTIVE',
            accessGranted: true,
            constructionEnabled: modules.construction,
            realEstateEnabled: modules.realEstate,
            materialManagementEnabled: modules.materials,
            logoUrl: (data as any).logoUrl?.trim() || null,
            phone: (data as any).phone?.trim() || null,
            address: (data as any).address?.trim() || null,
            description: (data as any).description?.trim() || null,
            entitlements: { tenantModules: modules },
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

      await this.seedTenantDefaults(company, companyUserId, connections.runtimeUrl);

      if (data.subscriptionAmount !== undefined && data.subscriptionTermMonths) {
        await this.configureCompanySubscription(
          company.id,
          {
            amount: data.subscriptionAmount,
            termDurationMonths: data.subscriptionTermMonths,
            autoRecur: data.autoRecur,
            notes: 'Initial subscription configured during company onboarding',
          },
          adminId,
        );
      }

      const createdCompany = await this.getCompanyById(company.id);
      await this.central.emailVerification.update({
        where: { id: onboardingVerification.id },
        data: { status: 'EXPIRED' },
      });
      return {
        ...createdCompany,
        onboarding: {
          adminEmail,
          dbName: `maamulpro_${subdomain.replace(/[^a-z0-9]/g, '_')}`,
          loginUrl: `${String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')}/sign-in?tenant=${encodeURIComponent(subdomain)}`,
          modulesEnabled: Object.entries(modules).filter(([, enabled]) => enabled).map(([key]) => key),
          emailVerified: true,
        },
      };
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

  async checkCompanyEmailAvailability(email: string) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new BadRequestException('Enter a valid email address');
    }
    const [company, user, admin] = await Promise.all([
      this.central.company.findFirst({ where: { adminEmail: normalized } }),
      this.central.companyUser.findFirst({ where: { email: normalized } }),
      this.central.centralAdmin.findFirst({ where: { email: normalized } }),
    ]);
    return {
      available: !company && !user && !admin,
      ...((company || user || admin) ? { error: 'This email is already associated with an existing account.' } : {}),
    };
  }

  async sendCompanyOnboardingVerification(email: string) {
    const availability = await this.checkCompanyEmailAvailability(email);
    if (!availability.available) throw new ConflictException(availability.error);
    const normalized = email.trim().toLowerCase();
    const existing = await this.central.emailVerification.findUnique({
      where: { email_context: { email: normalized, context: 'COMPANY_ONBOARDING' } },
    });
    if (existing && Date.now() - new Date(existing.updatedAt).getTime() < 60_000) {
      const cooldownRemaining = Math.ceil((60_000 - (Date.now() - new Date(existing.updatedAt).getTime())) / 1000);
      throw new BadRequestException(`Please wait ${cooldownRemaining} seconds before requesting another code`);
    }
    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.central.emailVerification.upsert({
      where: { email_context: { email: normalized, context: 'COMPANY_ONBOARDING' } },
      create: {
        email: normalized,
        context: 'COMPANY_ONBOARDING',
        hashedCode: await argon2.hash(code),
        expiresAt,
      },
      update: {
        hashedCode: await argon2.hash(code),
        expiresAt,
        status: 'PENDING',
        attempts: 0,
        verifiedAt: null,
      },
    });
    const delivery = await this.email.send({
      to: [normalized],
      subject: 'MaamulPro company onboarding verification code',
      text: `Your MaamulPro company onboarding verification code is ${code}. It expires in 10 minutes.`,
    });
    if (!delivery.sent) {
      await this.central.emailVerification.updateMany({
        where: { email: normalized, context: 'COMPANY_ONBOARDING', status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      throw new ServiceUnavailableException(
        'Verification email could not be delivered. Please try again later.',
      );
    }
    return { sent: true, expiresAt, cooldownSeconds: 60 };
  }

  async verifyCompanyOnboardingEmail(email: string, code: string) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!/^\d{6}$/.test(String(code || ''))) {
      throw new BadRequestException('Verification code must contain 6 digits');
    }
    const verification = await this.central.emailVerification.findUnique({
      where: { email_context: { email: normalized, context: 'COMPANY_ONBOARDING' } },
    });
    if (!verification || verification.status !== 'PENDING' || verification.expiresAt < new Date()) {
      throw new BadRequestException('Verification code is invalid or expired');
    }
    if (verification.attempts >= 5) {
      await this.central.emailVerification.update({ where: { id: verification.id }, data: { status: 'FAILED' } });
      throw new BadRequestException('Too many verification attempts; request a new code');
    }
    if (!(await argon2.verify(verification.hashedCode, code))) {
      await this.central.emailVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Incorrect verification code');
    }
    await this.central.emailVerification.update({
      where: { id: verification.id },
      data: { status: 'VERIFIED', verifiedAt: new Date() },
    });
    return { verified: true };
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
    let provider = company.dbProvider ? String(company.dbProvider).toUpperCase() : 'POSTGRESQL';
    if (!company.dbProvider && dbUrl) {
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
    const current = await this.central.company.findUnique({ where: { id } });
    if (!current) throw new NotFoundException(`Company with ID '${id}' not found`);
    if (status === 'ACTIVE') {
      try {
        const tenantDb = this.tenantManager.getTenantDb(revealDatabaseUrl(current.dbUrl));
        const [owner, companyNameConfig] = await Promise.all([
          tenantDb.user.findFirst({ where: { email: current.adminEmail.toLowerCase(), deletedAt: null } }),
          tenantDb.systemConfig.findUnique({ where: { key: 'company_name' } }),
        ]);
        if (!owner || !companyNameConfig) throw new Error('Tenant setup is incomplete');
      } catch {
        throw new BadRequestException('Company setup is incomplete. Tenant schema, owner or configuration records are not ready.');
      }
    }

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
    const current = await this.central.company.findUnique({ where: { id } });
    if (!current) throw new NotFoundException(`Company with ID '${id}' not found`);
    if (current.status !== 'ACTIVE') {
      throw new BadRequestException('Activate the company before changing its modules');
    }
    const configured = {
      construction: modules.constructionEnabled ?? this.entitlements.tenantModulesFromCompany(current).construction,
      realEstate: modules.realEstateEnabled ?? this.entitlements.tenantModulesFromCompany(current).realEstate,
      materials: modules.materialManagementEnabled ?? this.entitlements.tenantModulesFromCompany(current).materials,
    };
    if (!configured.construction && !configured.realEstate && !configured.materials) {
      throw new BadRequestException('At least one tenant module must remain enabled');
    }
    const entitlementData = {
      entitlements: { ...(current.entitlements as any), tenantModules: configured },
      constructionEnabled: configured.construction,
      realEstateEnabled: configured.realEstate,
      materialManagementEnabled: configured.materials,
    };
    const company = await this.central.company.update({
      where: { id },
      data: {
        ...entitlementData,
        mode: this.moduleMode(configured),
        version: { increment: 1 },
      },
    });
    await this.synchronizeTenantConfiguration(company).catch(() => undefined);
    return this.sanitizeCompany(company);
  }

  async syncCompanyRbac(id: string) {
    const company = await this.central.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException(`Company with ID '${id}' not found`);
    const tenantDb = this.tenantManager.getTenantDb(revealDatabaseUrl(company.dbUrl));
    return syncPermissionsToDb(tenantDb as any);
  }

  async generateCompanyOwnerTemporaryPassword(id: string) {
    const company = await this.central.company.findUnique({
      where: { id },
      include: { users: { where: { isActive: true, deletedAt: null }, orderBy: { createdAt: 'asc' } } },
    });
    if (!company) throw new NotFoundException(`Company with ID '${id}' not found`);
    const owner = company.users.find((user: any) => user.email.toLowerCase() === company.adminEmail.toLowerCase())
      || company.users.find((user: any) => ['COMPANY_OWNER', 'SUPER_ADMIN'].includes(user.role))
      || company.users[0];
    if (!owner) throw new NotFoundException('Company owner account was not found');
    const temporaryPassword = `${randomBytes(6).toString('base64url')}A9!`;
    const passwordHash = await argon2.hash(temporaryPassword);
    const passwordResetAt = new Date();
    const tenantDb = this.tenantManager.getTenantDb(revealDatabaseUrl(company.dbUrl));
    await tenantDb.user.update({
      where: { id: owner.id },
      data: { passwordHash, passwordResetAt, deletedAt: null },
    });
    await this.central.companyUser.update({
      where: { id: owner.id },
      data: {
        passwordHash,
        passwordResetAt,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        resetRequestedAt: null,
      },
    });
    return { password: temporaryPassword, adminEmail: owner.email, passwordResetAt };
  }

  async getCompanyEnterpriseConfiguration(id: string) {
    const company = await this.central.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException(`Company with ID '${id}' not found`);
    const tenantDb = this.tenantManager.getTenantDb(revealDatabaseUrl(company.dbUrl));
    const record = await tenantDb.systemConfig.findUnique({ where: { key: ENTERPRISE_CONFIG_KEY } });
    return parseEnterpriseModuleConfiguration(record?.value);
  }

  async updateCompanyEnterpriseConfiguration(id: string, configuration: EnterpriseModuleConfiguration) {
    const company = await this.central.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException(`Company with ID '${id}' not found`);
    if (!configuration || typeof configuration !== 'object') {
      throw new BadRequestException('Enterprise configuration is required');
    }
    const normalized = parseEnterpriseModuleConfiguration(JSON.stringify(configuration));
    normalized.workspaceControls.construction = Boolean(company.constructionEnabled)
      && normalized.workspaceControls.construction !== false;
    normalized.workspaceControls.real_estate = Boolean(company.realEstateEnabled)
      && normalized.workspaceControls.real_estate !== false;
    normalized.workspaceControls.material_management = Boolean(company.materialManagementEnabled)
      && normalized.workspaceControls.material_management !== false;
    const tenantDb = this.tenantManager.getTenantDb(revealDatabaseUrl(company.dbUrl));
    await tenantDb.systemConfig.upsert({
      where: { key: ENTERPRISE_CONFIG_KEY },
      update: { value: JSON.stringify(normalized) },
      create: { key: ENTERPRISE_CONFIG_KEY, value: JSON.stringify(normalized) },
    });
    const synchronization = await syncPermissionsToDb(tenantDb as any);
    return { configuration: normalized, synchronization };
  }

  // -----------------------------------------------------------
  // Tenant Subscriptions & Invoicing
  // -----------------------------------------------------------

  markInvoicePaid(invoiceId: string, paymentMethod = 'MANUAL_BANK_TRANSFER', adminId?: string) {
    return this.subscriptions.markInvoicePaid(invoiceId, paymentMethod, adminId);
  }

  extendInvoiceDueDate(invoiceId: string, extendDays = 7, newDueDate?: string) {
    return this.subscriptions.extendInvoiceDueDate(invoiceId, extendDays, newDueDate);
  }


  async configureCompanySubscription(
    companyId: string,
    data: { amount: number; termDurationMonths: number; autoRecur?: boolean; notes?: string },
    adminId?: string,
  ) {
    const company = await this.central.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException(`Company with ID '${companyId}' not found`);
    const amount = Number(data.amount);
    const termDurationMonths = Number(data.termDurationMonths);
    if (company.subscriptionStatus === 'ACTIVE' && company.accessGranted) {
      await this.central.$transaction(async (tx: any) => {
        await tx.company.update({
          where: { id: companyId },
          data: {
            subscriptionAmount: amount,
            termDurationMonths,
            autoRecur: data.autoRecur ?? false,
            version: { increment: 1 },
          },
        });
        await tx.subscriptionTransaction.create({
          data: {
            companyId,
            transactionType: 'UPDATE',
            amount,
            termDurationMonths,
            previousStatus: company.subscriptionStatus,
            newStatus: company.subscriptionStatus,
            approvedBy: adminId,
            notes: data.notes,
          },
        });
      });
      return this.getCompanyById(companyId);
    }
    const startAt = new Date();
    const expiresAt = new Date(startAt);
    expiresAt.setMonth(expiresAt.getMonth() + termDurationMonths);
    const invoiceNumber = `INV-${startAt.toISOString().replace(/\D/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    await this.central.$transaction(async (tx: any) => {
      await tx.company.update({
        where: { id: companyId },
        data: {
          subscriptionStatus: 'ACTIVE',
          subscriptionAmount: amount,
          termDurationMonths,
          subscriptionStartAt: startAt,
          subscriptionExpiresAt: expiresAt,
          autoRecur: data.autoRecur ?? false,
          accessGranted: true,
          ...(company.status === 'PENDING_SETUP' ? { status: 'ACTIVE' } : {}),
          version: { increment: 1 },
        },
      });
      await tx.invoice.create({
        data: {
          invoiceNumber,
          companyId,
          amount,
          kind: 'INITIAL',
          status: 'PAID',
          dueDate: startAt,
          expiresAt,
          periodStart: startAt,
          periodEnd: expiresAt,
          paidAt: startAt,
          paymentMethod: 'MANUAL_PLATFORM_APPROVAL',
          notes: data.notes || 'Subscription configured by platform administration',
        },
      });
      await tx.subscriptionTransaction.create({
        data: {
          companyId,
          transactionType: 'APPROVAL',
          amount,
          termDurationMonths,
          previousStatus: company.subscriptionStatus,
          newStatus: 'ACTIVE',
          startAt,
          expiresAt,
          approvedBy: adminId,
          notes: data.notes,
        },
      });
    });
    return this.getCompanyById(companyId);
  }

  createRenewalInvoice(companyId: string, adminId?: string) {
    // Route through SubscriptionLifecycleService so a renewal Invoice and the
    // TenantSubscription lifecycle record stay consistent with company state.
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

  async setSubscriptionAutoRenew(companyId: string, autoRenew: boolean, adminId?: string) {
    const company = await this.central.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException(`Company with ID '${companyId}' not found`);
    await this.central.$transaction(async (tx: any) => {
      await tx.company.update({
        where: { id: companyId },
        data: { autoRecur: autoRenew, version: { increment: 1 } },
      });
      await tx.subscriptionTransaction.create({
        data: {
          companyId,
          transactionType: 'AUTO_RENEW_UPDATED',
          previousStatus: company.subscriptionStatus,
          newStatus: company.subscriptionStatus,
          approvedBy: adminId,
          notes: `Automatic renewal ${autoRenew ? 'enabled' : 'disabled'}`,
        },
      });
    });
    return { autoRenew };
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
    const [pendingCompanies, suspendedCompanies, pendingSubscriptions, modeRows] = await Promise.all([
      this.central.company.count({ where: { status: 'PENDING_SETUP' } }),
      this.central.company.count({ where: { status: 'SUSPENDED' } }),
      this.central.company.count({ where: { subscriptionStatus: 'PENDING' } }),
      this.central.company.groupBy({ by: ['mode'], _count: { id: true } }),
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
      pendingCompanies,
      suspendedCompanies,
      pendingSubscriptions,
      expiredCompanies,
      trialCompanies,
      totalUsers,
      activeSubscriptions,
      monthlyRevenue: Number(monthlyRevenue._sum.amount || 0),
      outstandingInvoices: { count: outstandingInvoices._count.id, amount: Number(outstandingInvoices._sum.amount || 0) },
      latestRegistrations,
      recentTransactions,
      subscriptionStatusDistribution: statusRows.map((row: any) => ({ status: row.subscriptionStatus, count: row._count.id })),
      companyStatusDistribution: [
        { status: 'ACTIVE', count: activeCompanies },
        { status: 'PENDING_SETUP', count: pendingCompanies },
        { status: 'SUSPENDED', count: suspendedCompanies },
      ],
      moduleDistribution: modeRows.map((row: any) => ({ mode: row.mode, count: row._count.id })),
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
      await this.updateCompanyModules(id, {
        constructionEnabled: data.constructionEnabled,
        realEstateEnabled: data.realEstateEnabled,
        materialManagementEnabled: data.materialManagementEnabled,
      });
      data = {
        ...data,
        constructionEnabled: undefined,
        realEstateEnabled: undefined,
        materialManagementEnabled: undefined,
      };
    }
    const adminEmail = data.adminEmail?.trim().toLowerCase();
    if (adminEmail && adminEmail !== current.adminEmail) {
      const duplicate = await this.central.company.findFirst({ where: { adminEmail, NOT: { id } } });
      if (duplicate) throw new ConflictException('The administrator email is already in use');
    }
    const subdomain = data.subdomain?.trim().toLowerCase();
    if (subdomain && subdomain !== current.subdomain) {
      if (!/^[a-z0-9-]+$/.test(subdomain) || subdomain.length < 2 || subdomain.length > 30) {
        throw new BadRequestException('Subdomain must contain 2-30 characters of lowercase letters, numbers, and hyphens');
      }
      const duplicate = await this.central.company.findFirst({ where: { subdomain, NOT: { id } } });
      if (duplicate) throw new ConflictException('Subdomain is already in use by another company');
    }
    const update: any = {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(subdomain ? { subdomain } : {}),
      ...(data.adminName !== undefined ? { adminName: data.adminName.trim() } : {}),
      ...(adminEmail ? { adminEmail } : {}),
      ...(data.companyType !== undefined ? { companyType: data.companyType.trim() || null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone.trim() || null } : {}),
      ...(data.address !== undefined ? { address: data.address.trim() || null } : {}),
      ...(data.description !== undefined ? { description: data.description.trim() || null } : {}),
      ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl.trim() || null } : {}),
      version: { increment: 1 },
    };

    if ((adminEmail || data.adminName !== undefined) && current.users[0]) {
      try {
        const tenantDb = this.tenantManager.getTenantDb(revealDatabaseUrl(current.dbUrl));
        await tenantDb.user.update({ where: { id: current.users[0].id }, data: { ...(adminEmail ? { email: adminEmail } : {}), ...(data.adminName !== undefined ? { name: data.adminName.trim() } : {}) } });
      } catch {
        throw new BadRequestException('The tenant owner account could not be updated. No platform identity changes were saved.');
      }
    }
    const updated = await this.central.$transaction(async (tx: any) => {
      if (adminEmail && current.users[0]) await tx.companyUser.update({ where: { id: current.users[0].id }, data: { email: adminEmail } });
      return tx.company.update({ where: { id }, data: update });
    });
    let synchronizationWarning: string | undefined;
    try {
      await this.synchronizeTenantConfiguration(updated);
    } catch {
      synchronizationWarning = synchronizationWarning || 'The platform profile was saved, but tenant configuration could not be synchronized. Retry after restoring the tenant database connection.';
    }
    return { ...(await this.getCompanyById(updated.id)), ...(synchronizationWarning ? { synchronizationWarning } : {}) };
  }

  async deleteCompany(id: string) {
    const company = await this.central.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException(`Company with ID '${id}' not found`);
    const revealedUrl = revealDatabaseUrl(company.dbUrl);
    await this.tenantManager.disconnectTenant(revealedUrl).catch(() => undefined);
    let tenantDatabaseDeleted = false;
    // Only delete databases the platform itself provisioned. Customer-supplied
    // databases must never be touched through the Neon API, regardless of name.
    if (company.dbCreatedByMaamulPro) {
      const pair = getDatabaseConnectionPair(revealedUrl);
      const databaseName = decodeURIComponent(new URL(pair.directUrl).pathname.replace(/^\/+/, ''));
      if (databaseName) {
        await this.neonManagement.deleteCreatedDatabase({
          ...pair,
          databaseName,
          createdByMaamulPro: true,
        });
        tenantDatabaseDeleted = true;
      }
    }
    await this.central.company.delete({ where: { id } });
    return { deleted: true, id, name: company.name, tenantDatabaseDeleted };
  }

  async getPlatformNotifications() {
    const now = new Date();
    const [registrations, invoices, transactions, expiredCompanies, expiringCompanies, passwordResetRequests] = await Promise.all([
      this.central.company.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, createdAt: true } }),
      this.central.invoice.findMany({ where: { status: { in: ['UNPAID', 'OVERDUE', 'EXPIRED'] } }, take: 5, orderBy: { updatedAt: 'desc' }, include: { company: { select: { id: true, name: true } } } }),
      this.central.subscriptionTransaction.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { company: { select: { id: true, name: true } } } }),
      this.central.company.findMany({ where: { subscriptionStatus: 'EXPIRED' }, take: 5, orderBy: { subscriptionExpiresAt: 'desc' }, select: { id: true, name: true, subscriptionExpiresAt: true } }),
      this.central.company.findMany({ where: { subscriptionStatus: 'ACTIVE', subscriptionExpiresAt: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) } }, take: 5, orderBy: { subscriptionExpiresAt: 'asc' }, select: { id: true, name: true, subscriptionExpiresAt: true } }),
      this.central.emailVerification.findMany({
        where: { context: 'PASSWORD_RESET', status: 'PENDING' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, createdAt: true, expiresAt: true },
      }),
    ]);
    const resetEmails = [...new Set(passwordResetRequests.map((request: any) => request.email))];
    const resetCompanies = resetEmails.length
      ? await this.central.company.findMany({ where: { adminEmail: { in: resetEmails } }, select: { id: true, name: true, adminEmail: true } })
      : [];
    const resetCompanyByEmail = new Map<string, { id: string; name: string; adminEmail: string }>(
      resetCompanies.map((company: any) => [company.adminEmail.toLowerCase(), company]),
    );
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
      ...passwordResetRequests.map((request: any) => {
        const company = resetCompanyByEmail.get(request.email.toLowerCase());
        return company ? {
          id: `password-reset-${request.id}`,
          category: 'PASSWORD_RESET',
          title: 'Admin password reset requested',
          details: `${company.name}: a reset code was sent to ${company.adminEmail}.`,
          createdAt: request.createdAt,
          companyId: company.id,
        } : null;
      }).filter(Boolean),
    ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12);
    return { notifications };
  }

  async syncTenantSchemas() {
    const companies = await this.central.company.findMany({
      where: { status: { not: 'PENDING_SETUP' } },
      select: { id: true, name: true, dbUrl: true },
    });

    const results: { companyId: string; name: string; status: string; error?: string }[] = [];
    for (const company of companies) {
      try {
        const { directUrl } = getDatabaseConnectionPair(revealDatabaseUrl(company.dbUrl));
        await applyCompanySchema(directUrl);
        results.push({ companyId: company.id, name: company.name, status: 'ok' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ companyId: company.id, name: company.name, status: 'error', error: msg });
      }
    }

    const ok = results.filter((r) => r.status === 'ok').length;
    const failed = results.filter((r) => r.status === 'error');
    return { total: companies.length, ok, failed: failed.length, details: failed };
  }
}
