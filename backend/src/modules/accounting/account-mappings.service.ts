import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MAPPING_KEYS, MAPPING_KEY_INDEX, MappingKeyDef } from './mapping-keys';

// Per-request cache so a single hook resolving several keys hits the DB
// once. Keyed by the tenantDb instance identity — safe because a fresh
// Prisma client is used per tenant per request.
type MappingRow = { key: string; accountCode: string };

@Injectable()
export class AccountMappingsService {

  /**
   * Returns every registered mapping key plus its current value. Keys
   * with no row in DB show their seeded default so the settings UI
   * always renders every knob, whether it's been touched or not.
   */
  async list(tenantDb: any) {
    const rows: MappingRow[] = await tenantDb.accountMapping.findMany({
      select: { key: true, accountCode: true, updatedAt: true, updatedById: true },
    });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return MAPPING_KEYS.map((def) => {
      const row = byKey.get(def.key);
      return {
        ...def,
        accountCode: (row as any)?.accountCode ?? def.defaultCode,
        isDefault: !row || (row as any).accountCode === def.defaultCode,
        updatedAt: (row as any)?.updatedAt ?? null,
        updatedById: (row as any)?.updatedById ?? null,
      };
    });
  }

  async get(tenantDb: any, key: string) {
    const def = MAPPING_KEY_INDEX.get(key);
    if (!def) throw new NotFoundException(`Unknown mapping key: ${key}`);
    const row = await tenantDb.accountMapping.findUnique({ where: { key } });
    return {
      ...def,
      accountCode: row?.accountCode ?? def.defaultCode,
      isDefault: !row || row.accountCode === def.defaultCode,
      updatedAt: row?.updatedAt ?? null,
      updatedById: row?.updatedById ?? null,
    };
  }

  async set(tenantDb: any, key: string, accountCode: string, userId?: string) {
    const def = MAPPING_KEY_INDEX.get(key);
    if (!def) throw new NotFoundException(`Unknown mapping key: ${key}`);
    if (!accountCode) throw new BadRequestException('accountCode is required');
    const account = await tenantDb.account.findUnique({ where: { code: accountCode } });
    if (!account) throw new BadRequestException(`Account ${accountCode} does not exist`);
    if (!account.isActive) throw new BadRequestException(`Account ${accountCode} is inactive`);
    if (def.suggestedTypes && def.suggestedTypes.length && !def.suggestedTypes.includes(account.type)) {
      // Warn-only — the API accepts it, but the UI can surface a caution
      // when someone deliberately picks a non-conventional account.
    }
    return tenantDb.accountMapping.upsert({
      where: { key },
      update: { accountCode, updatedById: userId ?? null },
      create: { key, accountCode, description: def.description, updatedById: userId ?? null },
    });
  }

  async reset(tenantDb: any, key: string) {
    const def = MAPPING_KEY_INDEX.get(key);
    if (!def) throw new NotFoundException(`Unknown mapping key: ${key}`);
    await tenantDb.accountMapping.deleteMany({ where: { key } });
    return this.get(tenantDb, key);
  }

  /**
   * Hot path called from every auto-posting hook. Resolves a mapping
   * key to an account code with tiered fallback:
   *   1. per-tenant configured row,
   *   2. seeded default from the key definition,
   *   3. explicit fallback argument (last resort).
   * Never throws — the caller uses the returned code with the
   * accounting service, which validates account existence itself.
   */
  async resolve(tenantDb: any, key: string, fallback?: string): Promise<string> {
    const def = MAPPING_KEY_INDEX.get(key);
    if (!def && !fallback) {
      throw new NotFoundException(`Unknown mapping key: ${key}`);
    }
    const row = await tenantDb.accountMapping.findUnique({
      where: { key },
      select: { accountCode: true },
    });
    return row?.accountCode ?? def?.defaultCode ?? fallback!;
  }

  /**
   * Batched resolve for hooks that need several keys at once
   * (e.g. sales-invoice posting reads AR + revenue + tax together).
   */
  async resolveMany(tenantDb: any, keys: string[]): Promise<Record<string, string>> {
    if (!keys.length) return {};
    const rows: MappingRow[] = await tenantDb.accountMapping.findMany({
      where: { key: { in: keys } },
      select: { key: true, accountCode: true },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.accountCode]));
    const out: Record<string, string> = {};
    for (const key of keys) {
      const def = MAPPING_KEY_INDEX.get(key);
      const code = byKey.get(key) ?? def?.defaultCode;
      if (!code) throw new NotFoundException(`No mapping or default for key: ${key}`);
      out[key] = code;
    }
    return out;
  }

  keys(): MappingKeyDef[] {
    return MAPPING_KEYS;
  }
}
