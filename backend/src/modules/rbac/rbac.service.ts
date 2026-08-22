import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CentralPrismaService } from '../../common/database/central-prisma.service';
import {
  AssignUserRolesDto,
  CreateRoleDto,
  SetDirectPermissionDto,
  UpdateRoleDto,
} from './dto/rbac.dto';

@Injectable()
export class RbacService {
  constructor(private readonly centralPrisma: CentralPrismaService) {}

  private get central(): any {
    return this.centralPrisma as any;
  }

  private async bumpSessionVersions(userIds: string[]) {
    const unique = Array.from(new Set(userIds.filter(Boolean)));
    if (!unique.length) return;
    await this.central.companyUser.updateMany({
      where: { id: { in: unique } },
      data: { sessionVersion: { increment: 1 } },
    });
  }

  private async usersHoldingRole(tenantDb: any, roleId: string): Promise<string[]> {
    const rows = await tenantDb.rbacUserRole.findMany({ where: { roleId }, select: { userId: true } });
    return rows.map((row: { userId: string }) => row.userId);
  }

  listPermissions(tenantDb: any) {
    return tenantDb.rbacPermission.findMany({
      orderBy: [{ workspace: 'asc' }, { module: 'asc' }, { action: 'asc' }],
    });
  }

  listRoles(tenantDb: any) {
    return tenantDb.rbacRole.findMany({
      where: { deletedAt: null },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async createRole(tenantDb: any, data: CreateRoleDto) {
    const existing = await tenantDb.rbacRole.findFirst({ where: { key: data.key, deletedAt: null } });
    if (existing) throw new ConflictException(`Role key '${data.key}' already exists`);
    await this.validatePermissions(tenantDb, data.permissionIds);
    return tenantDb.rbacRole.create({
      data: {
        key: data.key,
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
        rolePermissions: {
          create: data.permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  async updateRole(tenantDb: any, id: string, data: UpdateRoleDto) {
    const role = await tenantDb.rbacRole.findUnique({ where: { id } });
    if (!role || role.deletedAt) throw new NotFoundException('Role not found');
    if (data.permissionIds) await this.validatePermissions(tenantDb, data.permissionIds);
    const affected = await this.usersHoldingRole(tenantDb, id);
    const updated = await tenantDb.$transaction(async (tx: any) => {
      if (data.permissionIds) {
        await tx.rbacRolePermission.deleteMany({ where: { roleId: id } });
        if (data.permissionIds.length) {
          await tx.rbacRolePermission.createMany({
            data: data.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
          });
        }
      }
      return tx.rbacRole.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          isActive: data.isActive,
        },
        include: { rolePermissions: { include: { permission: true } } },
      });
    });
    await this.bumpSessionVersions(affected);
    return updated;
  }

  async deleteRole(tenantDb: any, id: string) {
    const role = await tenantDb.rbacRole.findUnique({
      where: { id },
      include: { _count: { select: { userRoles: true } } },
    });
    if (!role || role.deletedAt) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('System roles cannot be deleted');
    const affected = role._count.userRoles > 0 ? await this.usersHoldingRole(tenantDb, id) : [];
    await tenantDb.$transaction(async (tx: any) => {
      if (affected.length) await tx.rbacUserRole.deleteMany({ where: { roleId: id } });
      await tx.rbacRole.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    });
    if (affected.length) await this.bumpSessionVersions(affected);
    return { deleted: true };
  }

  async getUserAccess(tenantDb: any, userId: string) {
    const user = await tenantDb.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        approvalLimit: true,
        rbacUserRoles: { include: { role: true } },
        rbacUserPermissions: { include: { permission: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async setApprovalLimit(tenantDb: any, userId: string, approvalLimit: number) {
    await this.getUserAccess(tenantDb, userId);
    await tenantDb.user.update({ where: { id: userId }, data: { approvalLimit: approvalLimit > 0 ? approvalLimit : null } });
    return this.getUserAccess(tenantDb, userId);
  }

  async assignUserRoles(tenantDb: any, userId: string, data: AssignUserRolesDto) {
    await this.getUserAccess(tenantDb, userId);
    const roleCount = await tenantDb.rbacRole.count({
      where: { id: { in: data.roleIds }, deletedAt: null, isActive: true },
    });
    if (roleCount !== data.roleIds.length) {
      throw new BadRequestException('One or more roles are invalid or inactive');
    }
    await tenantDb.$transaction([
      tenantDb.rbacUserRole.deleteMany({ where: { userId } }),
      tenantDb.rbacUserRole.createMany({
        data: data.roleIds.map((roleId) => ({ userId, roleId })),
      }),
    ]);
    await this.bumpSessionVersions([userId]);
    return this.getUserAccess(tenantDb, userId);
  }

  async setDirectPermission(
    tenantDb: any,
    userId: string,
    data: SetDirectPermissionDto,
  ) {
    await this.getUserAccess(tenantDb, userId);
    const permission = await tenantDb.rbacPermission.findUnique({
      where: { id: data.permissionId },
    });
    if (!permission) throw new NotFoundException('Permission not found');
    await tenantDb.rbacUserPermission.upsert({
      where: {
        userId_permissionId: { userId, permissionId: data.permissionId },
      },
      update: { effect: data.effect, reason: data.reason },
      create: {
        userId,
        permissionId: data.permissionId,
        effect: data.effect,
        reason: data.reason,
      },
    });
    await this.bumpSessionVersions([userId]);
    return this.getUserAccess(tenantDb, userId);
  }

  async removeDirectPermission(tenantDb: any, userId: string, permissionId: string) {
    await tenantDb.rbacUserPermission.deleteMany({ where: { userId, permissionId } });
    await this.bumpSessionVersions([userId]);
    return this.getUserAccess(tenantDb, userId);
  }

  private async validatePermissions(tenantDb: any, permissionIds: string[]) {
    const count = await tenantDb.rbacPermission.count({ where: { id: { in: permissionIds } } });
    if (count !== permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }
  }
}
