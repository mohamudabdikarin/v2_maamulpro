import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { TenantResolverMiddleware } from './common/middleware/tenant-resolver.middleware';
import { DatabaseModule } from './common/database/database.module';

import { AuthModule } from './modules/auth/auth.module';
import { SuperAdminModule } from './modules/superadmin/superadmin.module';
import { CronModule } from './modules/cron/cron.module';
import { ExecutiveHubModule } from './modules/executive-hub/executive-hub.module';
import { FinancialsModule } from './modules/financials/financials.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { ConstructionModule } from './modules/construction/construction.module';
import { RealEstateModule } from './modules/real-estate/real-estate.module';
import { MaterialManagementModule } from './modules/material-management/material-management.module';
import { StaffModule } from './modules/staff/staff.module';
import { ReportsModule } from './modules/reports/reports.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { ActivityLogInterceptor } from './common/interceptors/activity-log.interceptor';
import { SettingsModule } from './modules/settings/settings.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { EmailModule } from './common/email/email.module';

@Module({
  imports: [
    DatabaseModule,
    EmailModule,
    ScheduleModule.forRoot(),
    AuthModule,
    SuperAdminModule,
    CronModule,
    ExecutiveHubModule,
    FinancialsModule,
    AccountingModule,
    PayrollModule,
    ConstructionModule,
    RealEstateModule,
    MaterialManagementModule,
    StaffModule,
    ReportsModule,
    SettingsModule,
    RbacModule,
    UploadsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: ActivityLogInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantResolverMiddleware).forRoutes('*');
  }
}
