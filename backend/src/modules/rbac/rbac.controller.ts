import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { GetTenantDb } from '../../common/decorators/tenant-context.decorator';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import {
  AssignUserRolesDto,
  CreateRoleDto,
  SetDirectPermissionDto,
  SetApprovalLimitDto,
  UpdateRoleDto,
} from './dto/rbac.dto';
import { RbacService } from './rbac.service';

@Controller('api/rbac')
@UseGuards(TenantAccessGuard)
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('permissions')
  @RequirePermissions('roles.read')
  listPermissions(@GetTenantDb() db: any) {
    return this.rbac.listPermissions(db);
  }

  @Get('roles')
  @RequirePermissions('roles.read')
  listRoles(@GetTenantDb() db: any) {
    return this.rbac.listRoles(db);
  }

  @Post('roles')
  @RequirePermissions('roles.create')
  createRole(@GetTenantDb() db: any, @Body() body: CreateRoleDto) {
    return this.rbac.createRole(db, body);
  }

  @Patch('roles/:id')
  @RequirePermissions('roles.update')
  updateRole(@GetTenantDb() db: any, @Param('id') id: string, @Body() body: UpdateRoleDto) {
    return this.rbac.updateRole(db, id, body);
  }

  @Delete('roles/:id')
  @RequirePermissions('roles.delete')
  deleteRole(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.rbac.deleteRole(db, id);
  }

  @Get('users/:userId')
  @RequirePermissions('users.read', 'roles.read')
  getUserAccess(@GetTenantDb() db: any, @Param('userId') userId: string) {
    return this.rbac.getUserAccess(db, userId);
  }

  @Patch('users/:userId/roles')
  @RequirePermissions('users.update', 'roles.update')
  assignUserRoles(
    @GetTenantDb() db: any,
    @Param('userId') userId: string,
    @Body() body: AssignUserRolesDto,
  ) {
    return this.rbac.assignUserRoles(db, userId, body);
  }

  @Patch('users/:userId/approval-limit')
  @RequirePermissions('users.update', 'roles.update')
  setApprovalLimit(@GetTenantDb() db: any, @Param('userId') userId: string, @Body() body: SetApprovalLimitDto) {
    return this.rbac.setApprovalLimit(db, userId, body.approvalLimit);
  }

  @Post('users/:userId/permissions')
  @RequirePermissions('users.update', 'roles.update')
  setDirectPermission(
    @GetTenantDb() db: any,
    @Param('userId') userId: string,
    @Body() body: SetDirectPermissionDto,
  ) {
    return this.rbac.setDirectPermission(db, userId, body);
  }

  @Delete('users/:userId/permissions/:permissionId')
  @RequirePermissions('users.update', 'roles.update')
  removeDirectPermission(
    @GetTenantDb() db: any,
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.rbac.removeDirectPermission(db, userId, permissionId);
  }
}
