import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient as CentralPrismaClient } from '../../generated/central/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  connectionTimeoutMillis,
  databaseEndpointLabel,
  getCentralDatabaseUrls,
  poolSetting,
} from './database-url';

@Injectable()
export class CentralPrismaService extends CentralPrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CentralPrismaService.name);
  private readonly connectionPool: Pool;

  constructor() {
    const { runtimeUrl } = getCentralDatabaseUrls();
    const pool = new Pool({
      connectionString: runtimeUrl,
      max: poolSetting('NEON_CENTRAL_POOL_MAX', 5),
      min: 0,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: connectionTimeoutMillis(),
      keepAlive: true,
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.connectionPool = pool;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log(`Connected to central database through ${databaseEndpointLabel(getCentralDatabaseUrls().runtimeUrl)}`);
    } catch (error: any) {
      this.logger.warn(`Central database warm-up failed; the first request will retry: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.connectionPool.end().catch(() => undefined);
    this.logger.log('Disconnected Central Registry PostgreSQL Database');
  }
}
