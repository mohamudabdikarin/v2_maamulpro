import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CentralPrismaService } from '../database/central-prisma.service';
import {
  hasSubscriptionAccess,
  isAtLimit,
  PlanEntitlements,
  PlanFeatureKey,
} from './entitlement-policy';

type QuotaResource = 'users' | 'constructionProjects' | 'properties';

@Injectable()
export class SubscriptionEntitlementService {
  constructor(private readonly centralPrisma: CentralPrismaService) {}

  private get central(): any {
    return this.centralPrisma as any;
  }

  tenantModulesFromCompany(company: any) {
    const configured = company?.entitlements?.tenantModules;
    if (configured && typeof configured === 'object') {
      return {
        construction: configured.construction !== false,
        realEstate: configured.realEstate !== false,
        materials: configured.materials !== false,
      };
    }
    // Existing tenants predate tenant-level configuration. Their current flags are
    // the safe migration baseline and must not be overwritten by plan synchronization.
    return {
      construction: Boolean(company?.constructionEnabled),
      realEstate: Boolean(company?.realEstateEnabled),
      materials: Boolean(company?.materialManagementEnabled),
    };
  }

  fromCompany(company: any): PlanEntitlements {
    // MaamulPro tenants are configured directly by the platform administrator.
    // Subscription records remain billing information and never decide which product
    // modules the tenant may use.
    return {
      planKey: undefined,
      features: {
        construction: Boolean(company?.constructionEnabled),
        realEstate: Boolean(company?.realEstateEnabled),
        materials: Boolean(company?.materialManagementEnabled),
        payroll: true,
        advancedReports: true,
        prioritySupport: false,
      },
      limits: { users: 0, constructionProjects: 0, properties: 0 },
    };
  }

  companyEntitlementData(plan: any, tenantModules?: { construction: boolean; realEstate: boolean; materials: boolean }) {
    const configured = tenantModules || {
      construction: false,
      realEstate: false,
      materials: false,
    };
    const entitlements = {
      planId: plan?.id,
      planKey: undefined,
      planName: undefined,
      features: {
        construction: configured.construction,
        realEstate: configured.realEstate,
        materials: configured.materials,
        payroll: true,
        advancedReports: true,
        prioritySupport: false,
      },
      limits: { users: 0, constructionProjects: 0, properties: 0 },
      tenantModules: configured,
    };
    return {
      planKey: null,
      entitlements,
      constructionEnabled: configured.construction,
      realEstateEnabled: configured.realEstate,
      materialManagementEnabled: configured.materials,
    };
  }

  async getCompanyAccess(companyId: string) {
    const company = await this.central.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    return {
      subscriptionStatus: company.subscriptionStatus,
      accessGranted: hasSubscriptionAccess(company),
      subscriptionExpiresAt: company.subscriptionExpiresAt,
      entitlements: this.fromCompany(company),
      constructionEnabled: company.constructionEnabled,
      realEstateEnabled: company.realEstateEnabled,
      materialManagementEnabled: company.materialManagementEnabled,
    };
  }

  assertFeature(entitlements: PlanEntitlements, feature: PlanFeatureKey, label: string) {
    if (!entitlements.features[feature]) {
      throw new ForbiddenException(`${label} is not included in the current subscription plan`);
    }
  }

  async assertQuota(
    companyId: string,
    tenantDb: any,
    resource: QuotaResource,
  ) {
    const company = await this.central.company.findUnique({ where: { id: companyId } });
    if (!company || !hasSubscriptionAccess(company)) {
      throw new ForbiddenException('An active paid subscription is required');
    }
    const entitlements = this.fromCompany(company);
    let current = 0;
    let label = '';
    if (resource === 'users') {
      current = await this.central.companyUser.count({
        where: { companyId, isActive: true, deletedAt: null },
      });
      label = 'active users';
    } else if (resource === 'constructionProjects') {
      this.assertFeature(entitlements, 'construction', 'Construction');
      current = await tenantDb.project.count({ where: { deletedAt: null } });
      label = 'construction projects';
    } else {
      this.assertFeature(entitlements, 'realEstate', 'Real estate');
      current = await tenantDb.property.count({ where: { deletedAt: null } });
      label = 'properties';
    }
    const limit = entitlements.limits[resource];
    if (isAtLimit(current, limit)) {
      throw new ForbiddenException(
        `The subscription limit of ${limit} ${label} has been reached. Upgrade the plan to add more.`,
      );
    }
    return { current, limit, remaining: limit === 0 ? null : Math.max(0, limit - current) };
  }

  withinTenantQuota<T>(
    companyId: string,
    tenantDb: any,
    resource: 'constructionProjects' | 'properties',
    action: (tx: any) => Promise<T>,
  ): Promise<T> {
    return tenantDb.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        `maamulpro:${companyId}:${resource}`,
      );
      await this.assertQuota(companyId, tx, resource);
      return action(tx);
    });
  }

  withUserQuota<T>(
    companyId: string,
    action: (centralTx: any) => Promise<T>,
  ): Promise<T> {
    return this.central.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        `maamulpro:${companyId}:users`,
      );
      const company = await tx.company.findUnique({ where: { id: companyId } });
      if (!company || !hasSubscriptionAccess(company)) {
        throw new ForbiddenException('An active paid subscription is required');
      }
      const entitlements = this.fromCompany(company);
      const current = await tx.companyUser.count({
        where: { companyId, isActive: true, deletedAt: null },
      });
      const limit = entitlements.limits.users;
      if (isAtLimit(current, limit)) {
        throw new ForbiddenException(
          `The subscription limit of ${limit} active users has been reached. Upgrade the plan to add more.`,
        );
      }
      return action(tx);
    });
  }
}
