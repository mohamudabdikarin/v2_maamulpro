import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcryptjs';
import { CentralPrismaService } from '../../common/database/central-prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  ChangePasswordDto,
  UpdateCompanySettingsDto,
  UpdateLanguageDto,
  UpdateProfileDto,
} from './dto/settings.dto';
import { assertStrongPassword } from '../../common/security/password-policy';

const CONFIG_KEYS: Record<keyof UpdateCompanySettingsDto, string> = {
  companyName: 'company_name',
  logoUrl: 'logo_url',
  companyEmail: 'company_email',
  companyPhone: 'company_phone',
  companyAddress: 'company_address',
  companyDescription: 'company_description',
};

@Injectable()
export class SettingsService {
  constructor(private readonly centralPrisma: CentralPrismaService) {}

  async getSettings(tenantDb: any, tenant: any) {
    const rows = await tenantDb.systemConfig.findMany();
    const values = Object.fromEntries(rows.map((row: any) => [row.key, row.value]));
    const [users, constructionProjects, properties] = await Promise.all([
      (this.centralPrisma as any).companyUser.count({
        where: { companyId: tenant.companyId, isActive: true, deletedAt: null },
      }),
      tenant.entitlements?.features?.construction
        ? tenantDb.project.count({ where: { deletedAt: null } })
        : 0,
      tenant.entitlements?.features?.realEstate
        ? tenantDb.property.count({ where: { deletedAt: null } })
        : 0,
    ]);
    return {
      companyName: values.company_name || tenant.companyName,
      logoUrl: values.logo_url || null,
      companyEmail: values.company_email || '',
      companyPhone: values.company_phone || '',
      companyAddress: values.company_address || '',
      companyDescription: values.company_description || '',
      constructionEnabled: tenant.constructionEnabled,
      realEstateEnabled: tenant.realEstateEnabled,
      materialManagementEnabled: tenant.materialManagementEnabled,
      moduleMode: tenant.mode,
      subscriptionStatus: tenant.subscriptionStatus,
      subscriptionExpiresAt: tenant.subscriptionExpiresAt,
      accessGranted: tenant.accessGranted,
      entitlements: tenant.entitlements,
      usage: { users, constructionProjects, properties },
    };
  }

  async updateSettings(tenantDb: any, data: UpdateCompanySettingsDto) {
    const entries = Object.entries(data).filter(([, value]) => value !== undefined);
    await tenantDb.$transaction(
      entries.map(([field, value]) =>
        tenantDb.systemConfig.upsert({
          where: { key: CONFIG_KEYS[field as keyof UpdateCompanySettingsDto] },
          update: { value: String(value) },
          create: {
            key: CONFIG_KEYS[field as keyof UpdateCompanySettingsDto],
            value: String(value),
          },
        }),
      ),
    );
    return { updated: entries.map(([key]) => key) };
  }

  async getProfile(tenantDb: any, userId: string) {
    const profile = await tenantDb.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        language: true,
        isActive: true,
      },
    });
    if (!profile) throw new NotFoundException('User profile not found');
    return profile;
  }

  async updateProfile(tenantDb: any, userId: string, data: UpdateProfileDto) {
    const current = await this.getProfile(tenantDb, userId);
    const email = data.email?.trim().toLowerCase();
    if (email && email !== current.email) {
      const duplicate = await (this.centralPrisma as any).companyUser.findUnique({
        where: { email },
      });
      if (duplicate) throw new ConflictException('Email address is already in use');
      await (this.centralPrisma as any).companyUser.update({
        where: { id: userId },
        data: { email },
      });
    }
    try {
      return await tenantDb.user.update({
        where: { id: userId },
        data: {
          name: data.name?.trim(),
          email,
          avatarUrl: data.avatarUrl,
        },
        select: { id: true, name: true, email: true, avatarUrl: true, language: true },
      });
    } catch (error) {
      if (email && email !== current.email) {
        await (this.centralPrisma as any).companyUser.update({
          where: { id: userId },
          data: { email: current.email },
        });
      }
      throw error;
    }
  }

  async changePassword(tenantDb: any, userId: string, data: ChangePasswordDto) {
    assertStrongPassword(data.newPassword);
    const centralUser = await (this.centralPrisma as any).companyUser.findUnique({
      where: { id: userId },
    });
    if (!centralUser) throw new NotFoundException('User account not found');
    const valid = centralUser.passwordHash.startsWith('$argon2')
      ? await argon2.verify(centralUser.passwordHash, data.currentPassword)
      : await bcrypt.compare(data.currentPassword, centralUser.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await argon2.hash(data.newPassword);
    await (this.centralPrisma as any).companyUser.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordResetAt: new Date(),
        sessionVersion: { increment: 1 },
      },
    });
    await tenantDb.user.update({ where: { id: userId }, data: { passwordHash } });
    return { changed: true };
  }

  updateLanguage(tenantDb: any, userId: string, data: UpdateLanguageDto) {
    return tenantDb.user.update({
      where: { id: userId },
      data: { language: data.language },
      select: { id: true, language: true },
    });
  }

  async getActivityLogs(tenantDb: any, query: PaginationQueryDto & {
    entity?: string;
    userId?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const where: any = {};
    if (query.entity) where.entity = query.entity;
    if (query.userId) where.userId = query.userId;
    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { entity: { contains: query.search, mode: 'insensitive' } },
        { details: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      tenantDb.activityLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      tenantDb.activityLog.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async clearActivityLogs(tenantDb: any) {
    const result = await tenantDb.activityLog.deleteMany();
    return { deletedCount: result.count };
  }

  async getNotifications(tenantDb: any, userId: string) {
    const [lastRead, notifications] = await Promise.all([
      tenantDb.activityLog.findFirst({
        where: { userId, action: 'UPDATE', entity: 'notification_center' },
        orderBy: { createdAt: 'desc' },
      }),
      tenantDb.activityLog.findMany({
        where: { NOT: { entity: 'notification_center' } },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
    ]);
    return {
      notifications: notifications.map((row: any) => ({
        id: row.id,
        action: row.action,
        entity: row.entity,
        details: row.details,
        createdAt: row.createdAt,
        actorName: row.user?.name || row.user?.email || 'System',
        isUnread: !lastRead || row.createdAt > lastRead.createdAt,
      })),
      lastSeenAt: lastRead?.createdAt || null,
    };
  }

  markNotificationsRead(tenantDb: any, userId: string) {
    return tenantDb.activityLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'notification_center',
        details: 'Marked all notifications as read',
      },
    });
  }
}
