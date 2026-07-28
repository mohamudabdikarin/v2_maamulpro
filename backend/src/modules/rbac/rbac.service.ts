import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignUserRolesDto,
  CreateRoleDto,
  SetDirectPermissionDto,
  UpdateRoleDto,
} from './dto/rbac.dto';

@Injectable()
export class RbacService {
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
    const existing = await tenantDb.rbacRole.findUnique({ where: { key: data.key } });
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
    return tenantDb.$transaction(async (tx: any) => {
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
  }

  async deleteRole(tenantDb: any, id: string) {
    const role = await tenantDb.rbacRole.findUnique({
      where: { id },
      include: { _count: { select: { userRoles: true } } },
    });
    if (!role || role.deletedAt) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('System roles cannot be deleted');
    if (role._count.userRoles > 0) {
      throw new ConflictException('Remove this role from all users before deleting it');
    }
    return tenantDb.rbacRole.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async getUserAccess(tenantDb: any, userId: string) {
    const user = await tenantDb.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        rbacUserRoles: { include: { role: true } },
        rbacUserPermissions: { include: { permission: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
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
    return this.getUserAccess(tenantDb, userId);
  }

  async removeDirectPermission(tenantDb: any, userId: string, permissionId: string) {
    await tenantDb.rbacUserPermission.deleteMany({ where: { userId, permissionId } });
    return this.getUserAccess(tenantDb, userId);
  }

  private async validatePermissions(tenantDb: any, permissionIds: string[]) {
    const count = await tenantDb.rbacPermission.count({ where: { id: { in: permissionIds } } });
    if (count !== permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }
  }
}
