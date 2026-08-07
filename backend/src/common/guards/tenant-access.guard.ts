import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ENTERPRISE_CONFIG_KEY, EnterpriseModuleConfiguration, parseEnterpriseModuleConfiguration } from '../database/enterprise-config';
import { CentralPrismaService } from '../database/central-prisma.service';

@Injectable()
export class TenantAccessGuard implements CanActivate {
  private readonly principalCache = new Map<string, { expiresAt: number; role: string; companyId: string }>();
  private readonly tenantUserCache = new Map<string, {
    expiresAt: number;
    constructionAccess: boolean;
    realEstateAccess: boolean;
    materialManagementAccess: boolean;
  }>();
  private readonly configurationCache = new Map<string, { expiresAt: number; configuration: EnterpriseModuleConfiguration }>();

  constructor(private readonly centralPrisma: CentralPrismaService) {}

  private async currentPrincipal(userId: string) {
    const cached = this.principalCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached;
    const user = await (this.centralPrisma as any).companyUser.findUnique({
      where: { id: userId },
      select: { companyId: true, role: true, isActive: true, deletedAt: true },
    });
    if (!user || !user.isActive || user.deletedAt) return null;
    const principal = { companyId: user.companyId, role: user.role, expiresAt: Date.now() + 2_000 };
    this.principalCache.set(userId, principal);
    return principal;
  }

  private async currentTenantUser(tenantDb: any, userId: string) {
    if (!tenantDb) return null;
    const cached = this.tenantUserCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached;
    const tenantUser = await tenantDb.user.findFirst({
      where: { id: userId, isActive: true, deletedAt: null },
      select: {
        id: true,
        constructionAccess: true,
        realEstateAccess: true,
        materialManagementAccess: true,
      },
    });
    if (!tenantUser) return null;
    const current = {
      constructionAccess: tenantUser.constructionAccess,
      realEstateAccess: tenantUser.realEstateAccess,
      materialManagementAccess: tenantUser.materialManagementAccess,
      expiresAt: Date.now() + 2_000,
    };
    this.tenantUserCache.set(userId, current);
    return current;
  }

  private async enterpriseConfiguration(tenant: any, tenantDb: any) {
    const cached = this.configurationCache.get(tenant.companyId);
    if (cached && cached.expiresAt > Date.now()) return cached.configuration;
    const record = await tenantDb?.systemConfig?.findUnique({ where: { key: ENTERPRISE_CONFIG_KEY } });
    const configuration = parseEnterpriseModuleConfiguration(record?.value);
    this.configurationCache.set(tenant.companyId, { configuration, expiresAt: Date.now() + 2_000 });
    return configuration;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const tenant = request.tenantContext;
    const user = request.user as any;
    const path = request.path;

    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }

    if (!tenant) {
      if (user.companyId) {
        throw new ForbiddenException('Cross-tenant data access denied');
      }
      throw new UnauthorizedException('Tenant context not resolved for this request');
    }

    if (tenant.status === 'SUSPENDED') {
      throw new ForbiddenException('Company subscription account is currently suspended');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException('Company setup is not active');
    }

    if (tenant.subscriptionStatus !== 'ACTIVE' || !tenant.accessGranted) {
      throw new ForbiddenException('An active paid subscription is required');
    }

    if (!tenant.subscriptionExpiresAt || new Date(tenant.subscriptionExpiresAt) <= new Date()) {
      throw new ForbiddenException('The company subscription has expired');
    }

    if (!user.isSuperAdmin && (!user.companyId || user.companyId !== tenant.companyId)) {
      throw new ForbiddenException('Cross-tenant data access denied');
    }

    if (!user.isSuperAdmin) {
      const principal = await this.currentPrincipal(user.id);
      if (!principal) throw new UnauthorizedException('User account is inactive');
      if (principal.companyId !== tenant.companyId) throw new ForbiddenException('Cross-tenant data access denied');
      // JWT claims are only an initial identity assertion; use the current role for every protected request.
      user.role = principal.role;
      // A central CompanyUser record alone is not proof of tenant membership.
      // Fail closed unless an active tenant user exists for this request.
      const tenantUser = await this.currentTenantUser(request.tenantDb, user.id);
      if (!tenantUser) throw new UnauthorizedException('User account is not active in this company');
      user.tenantUser = tenantUser;
      const path = request.path;
      if (path.startsWith('/api/construction') && !tenantUser.constructionAccess) {
        throw new ForbiddenException('Your account is not granted access to the construction workspace');
      }
      if (path.startsWith('/api/real-estate') && !tenantUser.realEstateAccess) {
        throw new ForbiddenException('Your account is not granted access to the real-estate workspace');
      }
      if (path.startsWith('/api/materials') && !tenantUser.materialManagementAccess) {
        throw new ForbiddenException('Your account is not granted access to the material-management workspace');
      }
    }

    if (path.startsWith('/api/construction') &&
        (!tenant.constructionEnabled || !tenant.entitlements.features.construction)) {
      throw new ForbiddenException('The construction workspace is not enabled');
    }
    if (path.startsWith('/api/real-estate') &&
        (!tenant.realEstateEnabled || !tenant.entitlements.features.realEstate)) {
      throw new ForbiddenException('The real-estate workspace is not enabled');
    }
    if (path.startsWith('/api/materials') &&
        (!tenant.materialManagementEnabled || !tenant.entitlements.features.materials)) {
      throw new ForbiddenException('The material-management workspace is not enabled');
    }
    if (path.startsWith('/api/payroll') && !tenant.entitlements.features.payroll) {
      throw new ForbiddenException('Payroll is not included in the current subscription plan');
    }
    if (path.startsWith('/api/reports') && !tenant.entitlements.features.advancedReports) {
      throw new ForbiddenException('Advanced reports are not included in the current subscription plan');
    }

    if (
      path.startsWith('/api/construction') || path.startsWith('/api/real-estate') ||
      path.startsWith('/api/materials') || path.startsWith('/api/reports') ||
      path.startsWith('/api/dashboard/analytics')
    ) {
      const configuration = await this.enterpriseConfiguration(tenant, request.tenantDb);
      if (path.startsWith('/api/construction') && configuration.workspaceControls.construction === false) {
        throw new ForbiddenException('The construction workspace is disabled by company administration');
      }
      if (path.startsWith('/api/real-estate') && configuration.workspaceControls.real_estate === false) {
        throw new ForbiddenException('The real-estate workspace is disabled by company administration');
      }
      if (path.startsWith('/api/materials') && configuration.workspaceControls.material_management === false) {
        throw new ForbiddenException('The material-management workspace is disabled by company administration');
      }
      if (path.startsWith('/api/reports/run/')) {
        const reportId = String(request.params?.reportId || path.split('/').pop() || '');
        if (reportId && configuration.reportVisibility[reportId] === false) {
          throw new ForbiddenException('This report is disabled by company administration');
        }
      }
      if (path.startsWith('/api/dashboard/analytics')) {
        const workspace = String(request.query?.workspace || 'all');
        if (workspace !== 'all' && configuration.analyticsVisibility[workspace] === false) {
          throw new ForbiddenException('Analytics for this workspace are disabled by company administration');
        }
      }
    }

    return true;
  }
}
