import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import {
  DatabaseConnectionPair,
  getCentralDatabaseUrls,
  getDatabaseConnectionPair,
  withDatabaseName,
} from './database-url';

export type NeonTenantDatabase = DatabaseConnectionPair & {
  databaseName?: string;
  createdByMaamulPro: boolean;
};

@Injectable()
export class NeonManagementService {
  private readonly logger = new Logger(NeonManagementService.name);

  status() {
    return {
      provider: 'neon',
      automaticProvisioning: this.isConfigured(),
      encryptedTenantCredentials: Boolean(process.env.TENANT_DATABASE_ENCRYPTION_KEY),
      runtimeConnection: 'pooled',
      migrationConnection: 'direct',
    };
  }

  async resolveTenantDatabase(subdomain: string, suppliedUrl?: string): Promise<NeonTenantDatabase> {
    if (suppliedUrl?.trim()) {
      return { ...getDatabaseConnectionPair(suppliedUrl), createdByMaamulPro: false };
    }
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'Provide a Neon database URL or configure NEON_API_KEY, NEON_PROJECT_ID and NEON_BRANCH_ID',
      );
    }
    return this.createTenantDatabase(subdomain);
  }

  async deleteCreatedDatabase(database?: NeonTenantDatabase) {
    if (!database?.createdByMaamulPro || !database.databaseName) return;
    const prefix = this.databasePrefix();
    if (!database.databaseName.startsWith(prefix)) {
      throw new Error('Refusing to delete a Neon database outside the configured tenant prefix');
    }
    const response = await fetch(this.databaseApiUrl(database.databaseName), {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Neon cleanup failed (${response.status})`);
    }
    this.logger.warn(`Removed failed onboarding database ${database.databaseName}`);
  }

  private async createTenantDatabase(subdomain: string): Promise<NeonTenantDatabase> {
    const suffix = subdomain.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const databaseName = `${this.databasePrefix()}${suffix}`.slice(0, 63);
    if (!suffix || ['postgres', 'template0', 'template1'].includes(databaseName)) {
      throw new BadRequestException('Unable to derive a safe Neon database name from the subdomain');
    }
    const response = await fetch(this.databaseApiUrl(), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        database: { name: databaseName, owner_name: this.databaseOwner() },
      }),
    });
    if (response.status === 409) {
      throw new ConflictException(`Neon database '${databaseName}' already exists`);
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as any;
      throw new BadRequestException(payload?.message || `Neon database creation failed (${response.status})`);
    }

    const baseUrl = process.env.NEON_TENANT_BASE_URL || getCentralDatabaseUrls().directUrl;
    const base = new URL(baseUrl);
    if (decodeURIComponent(base.username) !== this.databaseOwner()) {
      await this.deleteCreatedDatabase({
        ...getDatabaseConnectionPair(withDatabaseName(baseUrl, databaseName)),
        databaseName,
        createdByMaamulPro: true,
      }).catch(() => undefined);
      throw new BadRequestException('NEON_TENANT_BASE_URL must use the configured NEON_DB_ROLE role');
    }
    this.logger.log(`Created isolated Neon tenant database ${databaseName}`);
    return {
      ...getDatabaseConnectionPair(withDatabaseName(baseUrl, databaseName)),
      databaseName,
      createdByMaamulPro: true,
    };
  }

  private isConfigured() {
    return ['NEON_API_KEY', 'NEON_PROJECT_ID', 'NEON_BRANCH_ID']
      .every((key) => Boolean(process.env[key]));
  }

  private databaseOwner() {
    // NEON_DATABASE_OWNER is kept only to avoid breaking the first v2 environment.
    return String(process.env.NEON_DB_ROLE || process.env.NEON_DATABASE_OWNER || 'neondb_owner').trim();
  }

  private databasePrefix() {
    const prefix = String(process.env.NEON_TENANT_DATABASE_PREFIX || 'tenant_').toLowerCase();
    if (!/^[a-z][a-z0-9_]{0,30}$/.test(prefix)) {
      throw new Error('NEON_TENANT_DATABASE_PREFIX must be a safe PostgreSQL identifier prefix');
    }
    return prefix;
  }

  private databaseApiUrl(databaseName?: string) {
    const base = `https://console.neon.tech/api/v2/projects/${encodeURIComponent(process.env.NEON_PROJECT_ID!)}/branches/${encodeURIComponent(process.env.NEON_BRANCH_ID!)}/databases`;
    return databaseName ? `${base}/${encodeURIComponent(databaseName)}` : base;
  }

  private headers() {
    return {
      accept: 'application/json',
      authorization: `Bearer ${process.env.NEON_API_KEY}`,
      'content-type': 'application/json',
    };
  }
}
