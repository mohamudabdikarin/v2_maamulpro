import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { CentralPrismaService } from '../../common/database/central-prisma.service';
import { TenantConnectionManager } from '../../common/database/tenant-connection.manager';
import { revealDatabaseUrl } from '../../common/database/database-credentials';
import { ResendEmailService } from '../../common/email/resend-email.service';
import { SubscriptionEntitlementService } from '../../common/subscriptions/subscription-entitlement.service';
import { hasSubscriptionAccess } from '../../common/subscriptions/entitlement-policy';

@Injectable()
export class AuthService {
  constructor(
    private readonly centralPrisma: CentralPrismaService,
    private readonly tenantManager: TenantConnectionManager,
    private readonly jwtService: JwtService,
    private readonly email: ResendEmailService,
    private readonly entitlements: SubscriptionEntitlementService,
  ) {}

  private get central(): any {
    return this.centralPrisma as any;
  }

  async loginCompanyUser(email: string, passwordAttempt: string, tenantId?: string) {
    // 1. Locate CompanyUser in Central DB
    const companyUser = await this.central.companyUser.findFirst({
      where: { email },
      include: { company: true },
    });

    if (!companyUser) {
      throw new UnauthorizedException('Invalid email or password credentials');
    }

    if (!companyUser.isActive) {
      throw new UnauthorizedException('User account has been deactivated');
    }

    const company = companyUser.company;
    // 2. Password Verification
    let isPasswordValid = false;
    if (companyUser.passwordHash.startsWith('$argon2')) {
      isPasswordValid = await argon2.verify(companyUser.passwordHash, passwordAttempt);
    } else {
      isPasswordValid = await bcrypt.compare(passwordAttempt, companyUser.passwordHash);
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password credentials');
    }

    // 3. Resolve permissions from Tenant DB
    let userPermissions: string[] = [];
    if (company.dbUrl) {
      try {
        const tenantDb = this.tenantManager.getTenantDb(revealDatabaseUrl(company.dbUrl));
        const tenantUser = await tenantDb.user.findUnique({
          where: { email },
          include: {
            rbacUserRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            },
            rbacUserPermissions: {
              include: { permission: true },
            },
          },
        });

        if (tenantUser) {
          const permSet = new Set<string>();
          for (const ur of (tenantUser as any).rbacUserRoles || []) {
            for (const rp of ur.role.rolePermissions || []) {
              if (rp?.permission?.key) permSet.add(rp.permission.key);
            }
          }
          const directPermissions = (tenantUser as any).rbacUserPermissions || [];
          for (const up of directPermissions.filter((item: any) => item.effect === 'ALLOW')) {
            if (up.permission?.key) permSet.add(up.permission.key);
          }
          for (const up of directPermissions.filter((item: any) => item.effect === 'DENY')) {
            if (up.permission?.key) permSet.delete(up.permission.key);
          }
          userPermissions = Array.from(permSet);
        }
      } catch (err) {
        // Fallback if tenant DB connection is pending setup
      }
    }

    // 4. Update last login
    await this.central.companyUser.update({
      where: { id: companyUser.id },
      data: { lastLoginAt: new Date() },
    });

    // 5. Generate JWT Token
    const companyEntitlements = this.entitlements.fromCompany(company);
    const accessGranted = hasSubscriptionAccess(company);
    const payload = {
      sub: companyUser.id,
      email: companyUser.email,
      role: companyUser.role,
      companyId: company.id,
      subdomain: company.subdomain,
      companyName: company.name,
      permissions: userPermissions,
      constructionEnabled: company.constructionEnabled,
      realEstateEnabled: company.realEstateEnabled,
      materialManagementEnabled: company.materialManagementEnabled,
      subscriptionStatus: company.subscriptionStatus,
      subscriptionExpiresAt: company.subscriptionExpiresAt,
      accessGranted,
      planKey: company.planKey,
      entitlements: companyEntitlements,
      isSuperAdmin: false,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: companyUser.id,
        email: companyUser.email,
        role: companyUser.role,
        companyId: company.id,
        companyName: company.name,
        subdomain: company.subdomain,
        permissions: userPermissions,
        constructionEnabled: company.constructionEnabled,
        realEstateEnabled: company.realEstateEnabled,
        materialManagementEnabled: company.materialManagementEnabled,
        subscriptionStatus: company.subscriptionStatus,
        subscriptionExpiresAt: company.subscriptionExpiresAt,
        companyStatus: company.status,
        accessGranted,
        planKey: company.planKey,
        entitlements: companyEntitlements,
      },
    };
  }

  async loginSuperAdmin(email: string, passwordAttempt: string) {
    const admin = await this.centralPrisma.centralAdmin.findFirst({
      where: { email },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid Super Admin credentials');
    }

    let isValid = false;
    if (admin.passwordHash.startsWith('$argon2')) {
      isValid = await argon2.verify(admin.passwordHash, passwordAttempt);
    } else {
      isValid = await bcrypt.compare(passwordAttempt, admin.passwordHash);
    }

    if (!isValid) {
      throw new UnauthorizedException('Invalid Super Admin credentials');
    }

    await this.central.centralAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'SUPER_ADMIN',
      isSuperAdmin: true,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
      },
    };
  }

  async currentSession(user: any) {
    if (user?.isSuperAdmin) {
      const admin = await this.central.centralAdmin.findUnique({
        where: { id: user.id },
        select: { id: true, email: true, name: true },
      });
      if (!admin) throw new UnauthorizedException('Administrator account no longer exists');
      return { ...admin, role: 'SUPER_ADMIN', isSuperAdmin: true };
    }
    const companyUser = await this.central.companyUser.findUnique({
      where: { id: user?.id },
      include: { company: true },
    });
    if (!companyUser || !companyUser.isActive || companyUser.deletedAt) {
      throw new UnauthorizedException('User account is inactive');
    }
    const company = companyUser.company;
    return {
      id: companyUser.id,
      email: companyUser.email,
      role: companyUser.role,
      companyId: company.id,
      companyName: company.name,
      subdomain: company.subdomain,
      permissions: user.permissions || [],
      constructionEnabled: company.constructionEnabled,
      realEstateEnabled: company.realEstateEnabled,
      materialManagementEnabled: company.materialManagementEnabled,
      subscriptionStatus: company.subscriptionStatus,
      subscriptionExpiresAt: company.subscriptionExpiresAt,
      companyStatus: company.status,
      accessGranted: hasSubscriptionAccess(company),
      planKey: company.planKey,
      entitlements: this.entitlements.fromCompany(company),
      isSuperAdmin: false,
    };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.central.companyUser.findFirst({
      where: { email: normalizedEmail, isActive: true },
      include: { company: true },
    });
    const admin = user ? null : await this.central.centralAdmin.findFirst({
      where: { email: normalizedEmail },
    });
    // Do not disclose whether an address exists.
    if (!user && !admin) return { accepted: true };

    const code = String(randomInt(100000, 1000000));
    const hashedCode = await argon2.hash(code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.central.$transaction(async (tx: any) => {
      await tx.emailVerification.updateMany({
        where: { email: normalizedEmail, context: 'PASSWORD_RESET', status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });
      await tx.emailVerification.create({
        data: {
          email: normalizedEmail,
          context: 'PASSWORD_RESET',
          hashedCode,
          expiresAt,
        },
      });
    });

    if (this.email.isConfigured()) {
      await this.email.send({
        to: [normalizedEmail],
        subject: 'MaamulPro password reset code',
        text: `Your MaamulPro password reset code is ${code}. It expires in 15 minutes.`,
      });
    }

    return {
      accepted: true,
      expiresAt,
      ...(process.env.NODE_ENV === 'production' ? {} : { previewCode: code }),
    };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    if (newPassword.length < 10) {
      throw new BadRequestException('Password must contain at least 10 characters');
    }
    const normalizedEmail = email.trim().toLowerCase();
    const verification = await this.central.emailVerification.findFirst({
      where: { email: normalizedEmail, context: 'PASSWORD_RESET', status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (!verification || verification.expiresAt < new Date()) {
      throw new BadRequestException('Reset code is invalid or expired');
    }
    if (verification.attempts >= 5) {
      await this.central.emailVerification.update({ where: { id: verification.id }, data: { status: 'FAILED' } });
      throw new BadRequestException('Reset code is invalid or expired');
    }
    const valid = await argon2.verify(verification.hashedCode, code);
    if (!valid) {
      await this.central.emailVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Reset code is invalid or expired');
    }

    const user = await this.central.companyUser.findFirst({
      where: { email: normalizedEmail },
      include: { company: true },
    });
    const admin = user ? null : await this.central.centralAdmin.findFirst({ where: { email: normalizedEmail } });
    if (!user && !admin) throw new NotFoundException('Account not found');
    const passwordHash = await argon2.hash(newPassword);
    await this.central.$transaction(async (tx: any) => {
      if (user) await tx.companyUser.update({ where: { id: user.id }, data: { passwordHash } });
      else await tx.centralAdmin.update({ where: { id: admin.id }, data: { passwordHash, passwordResetAt: new Date() } });
      await tx.emailVerification.update({
        where: { id: verification.id },
        data: { status: 'VERIFIED', verifiedAt: new Date() },
      });
    });
    if (user?.company.dbUrl) {
      const tenantDb = this.tenantManager.getTenantDb(revealDatabaseUrl(user.company.dbUrl));
      await tenantDb.user.updateMany({
        where: { OR: [{ id: user.id }, { email: normalizedEmail }] },
        data: { passwordHash },
      });
    }
    return { reset: true };
  }
}
