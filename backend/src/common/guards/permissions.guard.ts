import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { CentralPrismaService } from '../database/central-prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly permissionCache = new Map<string, { expiresAt: number; permissions: string[] }>();
  private readonly principalCache = new Map<string, { expiresAt: number; role: string; active: boolean }>();

  constructor(private reflector: Reflector, private readonly centralPrisma: CentralPrismaService) {}

  private async currentPrincipal(userId: string) {
    const cached = this.principalCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached;
    const principal = await (this.centralPrisma as any).companyUser.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true, deletedAt: true },
    });
    const current = {
      role: principal?.role || '',
      active: Boolean(principal?.isActive && !principal?.deletedAt),
      expiresAt: Date.now() + 2_000,
    };
    this.principalCache.set(userId, current);
    return current;
  }

  private async currentPermissions(tenantDb: any, user: any, companyId: string): Promise<string[]> {
    const key = `${companyId}:${user.id}`;
    const cached = this.permissionCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.permissions;
    const tenantUser = await tenantDb?.user?.findFirst({
      where: { id: user.id, email: user.email, isActive: true, deletedAt: null },
      include: {
        rbacUserRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        rbacUserPermissions: { include: { permission: true } },
      },
    });
    if (!tenantUser) return [];
    const permissions = new Set<string>();
    for (const assignment of tenantUser.rbacUserRoles || []) {
      for (const rolePermission of assignment.role?.rolePermissions || []) {
        if (rolePermission.permission?.key) permissions.add(rolePermission.permission.key);
      }
    }
    for (const direct of tenantUser.rbacUserPermissions || []) {
      if (!direct.permission?.key) continue;
      if (direct.effect === 'DENY') permissions.delete(direct.permission.key);
      else permissions.add(direct.permission.key);
    }
    const resolved = Array.from(permissions);
    this.permissionCache.set(key, { permissions: resolved, expiresAt: Date.now() + 2_000 });
    return resolved;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions && !requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      return false;
    }

    if (user.isSuperAdmin || user.role === 'SUPER_ADMIN') {
      return true;
    }

    const principal = await this.currentPrincipal(user.id);
    if (!principal.active) {
      throw new ForbiddenException('User account is inactive');
    }
    user.role = principal.role;
    if (user.role === 'COMPANY_OWNER') return true;

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(user.role);
      if (!hasRole) {
        throw new ForbiddenException(`Requires one of roles: ${requiredRoles.join(', ')}`);
      }
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = await this.currentPermissions(request.tenantDb, user, request.tenantContext?.companyId || user.companyId);
      user.permissions = userPermissions;
      const hasAllPermissions = requiredPermissions.every(p => userPermissions.includes(p));
      if (!hasAllPermissions) {
        throw new ForbiddenException(`Missing required permissions: ${requiredPermissions.join(', ')}`);
      }
    }

    return true;
  }
}
