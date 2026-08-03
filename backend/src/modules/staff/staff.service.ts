import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CentralPrismaService } from '../../common/database/central-prisma.service';
import * as argon2 from 'argon2';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  CreateStaffDto,
  StaffAccountDto,
  UpdateStaffDto,
} from './dto/staff.dto';
import { SubscriptionEntitlementService } from '../../common/subscriptions/subscription-entitlement.service';
import { assertStrongPassword } from '../../common/security/password-policy';

@Injectable()
export class StaffService {
  constructor(
    private readonly centralPrisma: CentralPrismaService,
    private readonly entitlements: SubscriptionEntitlementService,
  ) {}

  private get central(): any {
    return this.centralPrisma as any;
  }

  async listUserAccounts(tenantDb: any) {
    if (!tenantDb) return [];
    return tenantDb.user.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ name: 'asc' }],
    });
  }

  async getStaff(tenantDb: any, query: PaginationQueryDto & { department?: string; status?: string }) {
    if (!tenantDb) return [];
    const where: any = { deletedAt: null };
    if (query?.department) where.department = query.department;
    if (query?.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) where.status = query.status;
    const page = query.page || 1;
    const limit = query.limit || 25;
    const [data, total] = await Promise.all([
      tenantDb.staff.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, email: true, role: true, isActive: true } }, assignedProject: true, workerType: true },
        orderBy: { createdAt: 'desc' },
      }),
      tenantDb.staff.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getStaffById(tenantDb: any, id: string) {
    const staff = await tenantDb.staff.findFirst({
      where: { id, deletedAt: null },
      include: { user: true, assignedProject: true, workerType: true },
    });
    if (!staff) throw new NotFoundException('Staff member not found');
    return staff;
  }

  async createStaff(tenantDb: any, companyId: string, data: CreateStaffDto) {
    if (!tenantDb) throw new BadRequestException('Tenant DB not available');
    const create = (centralDb: any) => tenantDb.$transaction(async (tx: any) => {
      const staff = await tx.staff.create({
        data: {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone: data.phone,
          position: data.position,
          department: (data.department as any) || 'GENERAL',
          salary: data.salary || 0,
          hireDate: data.hireDate,
          status: (data.status as any) || 'ACTIVE',
          notes: data.notes,
          photoUrl: data.photoUrl,
          workerTypeId: data.workerTypeId,
          assignedProjectId: data.assignedProjectId,
        },
      });

      // 2. Optional User Account creation
      if (data.createAccount) {
        if (!data.email || !data.temporaryPassword) {
          throw new BadRequestException('Email and temporary password are required');
        }
        assertStrongPassword(data.temporaryPassword);
        const existingCentral = await centralDb.companyUser.findUnique({
          where: { email: data.email },
        });

        if (existingCentral) {
          throw new ConflictException(`User account with email '${data.email}' already exists.`);
        }

        const defaultHash = await argon2.hash(data.temporaryPassword);

        // Create Tenant DB User
        const tenantUser = await tx.user.create({
          data: {
            email: data.email,
            name: `${data.firstName} ${data.lastName}`,
            passwordHash: defaultHash,
            role: (data.role || 'STAFF') as any,
          },
        });

        // Link User to Staff
        await tx.staff.update({
          where: { id: staff.id },
          data: { userId: tenantUser.id },
        });

        // Create Central CompanyUser record
        await centralDb.companyUser.create({
          data: {
            id: tenantUser.id,
            email: data.email,
            passwordHash: defaultHash,
            companyId,
            role: data.role || 'STAFF',
          },
        });
      }

      return staff;
    });
    return data.createAccount
      ? this.entitlements.withUserQuota(companyId, create)
      : create(this.central);
  }

  async updateStaff(tenantDb: any, id: string, data: UpdateStaffDto) {
    await this.getStaffById(tenantDb, id);
    return tenantDb.staff.update({ where: { id }, data: data as any });
  }

  async deleteStaff(tenantDb: any, id: string, currentUserId?: string) {
    const staff = await this.getStaffById(tenantDb, id);
    if (currentUserId && staff.userId === currentUserId) {
      throw new BadRequestException('You cannot delete your own staff record.');
    }
    await tenantDb.$transaction(async (tx: any) => {
      await tx.staff.delete({ where: { id } });
      if (staff.userId) {
        await tx.user.delete({ where: { id: staff.userId } });
      }
    });
    if (staff.userId) {
      await this.central.companyUser.delete({ where: { id: staff.userId } });
    }
    return { deleted: true };
  }

  async createAccount(tenantDb: any, companyId: string, staffId: string, data: StaffAccountDto) {
    assertStrongPassword(data.temporaryPassword);
    const staff = await this.getStaffById(tenantDb, staffId);
    if (staff.userId) throw new ConflictException('Staff member already has a user account');
    const email = data.email.toLowerCase();
    const passwordHash = await argon2.hash(data.temporaryPassword);
    return this.entitlements.withUserQuota(companyId, async (centralTx) => {
      if (await centralTx.companyUser.findUnique({ where: { email } })) {
        throw new ConflictException('Email is already in use');
      }
      const user = await tenantDb.user.create({
        data: { email, name: `${staff.firstName} ${staff.lastName}`, passwordHash, role: data.role as any },
      });
      try {
        await centralTx.companyUser.create({
          data: { id: user.id, email, passwordHash, companyId, role: data.role },
        });
        await tenantDb.staff.update({ where: { id: staffId }, data: { userId: user.id } });
      } catch (error) {
        await tenantDb.user.delete({ where: { id: user.id } });
        throw error;
      }
      return this.getStaffById(tenantDb, staffId);
    });
  }

  async setAccountStatus(tenantDb: any, companyId: string, staffId: string, isActive: boolean) {
    const staff = await this.getStaffById(tenantDb, staffId);
    if (!staff.userId) throw new BadRequestException('Staff member has no user account');
    if (Boolean(staff.user?.isActive) === isActive) return { isActive };
    const update = async (centralDb: any) => {
      await Promise.all([
        tenantDb.user.update({ where: { id: staff.userId }, data: { isActive } }),
        centralDb.companyUser.update({ where: { id: staff.userId }, data: { isActive } }),
      ]);
    };
    if (isActive) await this.entitlements.withUserQuota(companyId, update);
    else await update(this.central);
    return { isActive };
  }

  async updateAccountEmail(tenantDb: any, staffId: string, email: string) {
    const staff = await this.getStaffById(tenantDb, staffId);
    if (!staff.userId) throw new BadRequestException('Staff member has no user account');
    const normalized = email.toLowerCase();
    const duplicate = await this.central.companyUser.findUnique({ where: { email: normalized } });
    if (duplicate && duplicate.id !== staff.userId) throw new ConflictException('Email is already in use');
    await this.central.companyUser.update({ where: { id: staff.userId }, data: { email: normalized } });
    try {
      await tenantDb.user.update({ where: { id: staff.userId }, data: { email: normalized } });
    } catch (error) {
      await this.central.companyUser.update({ where: { id: staff.userId }, data: { email: staff.user.email } });
      throw error;
    }
    return { email: normalized };
  }

  async resetPassword(tenantDb: any, staffId: string, temporaryPassword: string) {
    assertStrongPassword(temporaryPassword);
    const staff = await this.getStaffById(tenantDb, staffId);
    if (!staff.userId) throw new BadRequestException('Staff member has no user account');
    const passwordHash = await argon2.hash(temporaryPassword);
    await Promise.all([
      tenantDb.user.update({ where: { id: staff.userId }, data: { passwordHash, passwordResetAt: new Date() } }),
      this.central.companyUser.update({
        where: { id: staff.userId },
        data: {
          passwordHash,
          passwordResetAt: new Date(),
          sessionVersion: { increment: 1 },
        },
      }),
    ]);
    return { reset: true };
  }

  async updateAccountRole(tenantDb: any, staffId: string, role: string) {
    const staff = await this.getStaffById(tenantDb, staffId);
    if (!staff.userId) throw new BadRequestException('Staff member has no user account');
    await Promise.all([
      tenantDb.user.update({ where: { id: staff.userId }, data: { role } }),
      this.central.companyUser.update({
        where: { id: staff.userId },
        data: { role, sessionVersion: { increment: 1 } },
      }),
    ]);
    return { role };
  }

  async getStaffActivity(tenantDb: any, staffId: string) {
    const staff = await this.getStaffById(tenantDb, staffId);
    if (!staff.userId) return [];
    return tenantDb.activityLog.findMany({
      where: { userId: staff.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
