import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class TenantAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const tenant = request.tenantContext;
    const user = request.user as any;

    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }

    if (!tenant) {
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

    const path = request.path;
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

    return true;
  }
}
