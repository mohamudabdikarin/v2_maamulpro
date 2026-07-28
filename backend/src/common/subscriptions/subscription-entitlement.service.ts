import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CentralPrismaService } from '../database/central-prisma.service';
import {
  hasSubscriptionAccess,
  isAtLimit,
  normalizePlanFeatures,
  planEntitlements,
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

  fromCompany(company: any): PlanEntitlements {
    const stored = company?.entitlements;
    if (stored && typeof stored === 'object' && stored.features && stored.limits) {
      return {
        ...stored,
        features: normalizePlanFeatures(stored.features),
        limits: {
          users: Number(stored.limits.users || 0),
          constructionProjects: Number(stored.limits.constructionProjects || 0),
          properties: Number(stored.limits.properties || 0),
        },
      };
    }
    return {
      planKey: company?.planKey,
      features: {
        construction: Boolean(company?.constructionEnabled),
        realEstate: Boolean(company?.realEstateEnabled),
        materials: Boolean(company?.materialManagementEnabled),
        payroll: false,
        advancedReports: false,
        prioritySupport: false,
      },
      limits: { users: 0, constructionProjects: 0, properties: 0 },
    };
  }

  companyEntitlementData(plan: any) {
    const entitlements = planEntitlements(plan);
    return {
      planKey: plan.key,
      entitlements,
      constructionEnabled: entitlements.features.construction,
      realEstateEnabled: entitlements.features.realEstate,
      materialManagementEnabled: entitlements.features.materials,
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
      await tx.$queryRawUnsafe(
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
      await tx.$queryRawUnsafe(
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
