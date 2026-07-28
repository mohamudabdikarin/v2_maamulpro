import { Global, Module } from '@nestjs/common';
import { CentralPrismaService } from './central-prisma.service';
import { NeonManagementService } from './neon-management.service';
import { TenantConnectionManager } from './tenant-connection.manager';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { SubscriptionLifecycleService } from '../subscriptions/subscription-lifecycle.service';

@Global()
@Module({
  providers: [
    CentralPrismaService,
    TenantConnectionManager,
    TenantProvisioningService,
    NeonManagementService,
    SubscriptionEntitlementService,
    SubscriptionLifecycleService,
  ],
  exports: [
    CentralPrismaService,
    TenantConnectionManager,
    TenantProvisioningService,
    NeonManagementService,
    SubscriptionEntitlementService,
    SubscriptionLifecycleService,
  ],
})
export class DatabaseModule {}
