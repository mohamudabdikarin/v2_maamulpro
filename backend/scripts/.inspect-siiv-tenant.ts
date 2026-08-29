import * as dotenv from 'dotenv';
import * as path from 'node:path';
import { CentralPrismaService } from '../src/common/database/central-prisma.service';
import { TenantConnectionManager } from '../src/common/database/tenant-connection.manager';
import { revealDatabaseUrl } from '../src/common/database/database-credentials';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const targetDatabase = process.argv[2] || 'tenant_hiiraan';
  const central = new CentralPrismaService() as any;
  const manager = new TenantConnectionManager();
  try {
    await central.$connect();
    const companies = await central.company.findMany({
      select: {
        id: true, name: true, subdomain: true, status: true, mode: true,
        constructionEnabled: true, realEstateEnabled: true, materialManagementEnabled: true, dbUrl: true,
      },
    });
    const resolved = companies.map((company: any) => {
      const url = revealDatabaseUrl(company.dbUrl);
      return { company, url, databaseName: decodeURIComponent(new URL(url).pathname.replace(/^\/+/, '')) };
    });
    const match = resolved.find(({ databaseName }: any) => databaseName === targetDatabase);
    if (!match) throw new Error(`No company is routed to database ${targetDatabase}`);

    const db = manager.getTenantDb(match.url) as any;
    const delegates = [
      'user', 'staff', 'project', 'projectTask', 'workerType', 'dailyOperationalExpense',
      'workerLedgerEntry', 'constructionMaterial', 'constructionInventoryTransaction',
      'workforceContract', 'workforceContractPayment', 'payroll', 'payrollItem',
      'category', 'transaction', 'account', 'accountMapping', 'journalBatch', 'journalEntry',
      'supplier', 'purchaseOrder', 'material', 'inventoryTransaction',
    ];
    const counts = Object.fromEntries(await Promise.all(delegates.map(async (name) => [name, await db[name].count()])));
    const owner = await db.user.findFirst({
      where: { deletedAt: null, isActive: true, role: { in: ['COMPANY_OWNER', 'SUPER_ADMIN'] } },
      select: { id: true, role: true },
    });
    const sourceMatches = {
      projects: await db.project.count({ where: { deletedAt: null, name: { contains: 'Siiv', mode: 'insensitive' } } }),
      staff: await db.staff.count({ where: { deletedAt: null, notes: { contains: 'EMP-', mode: 'insensitive' } } }),
      transactions: await db.transaction.count({ where: { deletedAt: null, referenceId: { startsWith: 'siiv:' } } }),
      contracts: await db.workforceContract.count({ where: { deletedAt: null, notes: { contains: 'LC-', mode: 'insensitive' } } }),
      materials: await db.constructionMaterial.count({ where: { deletedAt: null, materialType: { contains: 'MAT-', mode: 'insensitive' } } }),
    };
    const existing = {
      projects: await db.project.findMany({ where: { deletedAt: null }, select: { id: true, name: true, status: true, budget: true, progress: true } }),
      staff: await db.staff.findMany({ where: { deletedAt: null }, select: { id: true, firstName: true, lastName: true, department: true, position: true } }),
      contracts: await db.workforceContract.findMany({ where: { deletedAt: null }, select: { id: true, title: true, projectId: true, status: true, originalBudget: true, totalPaid: true } }),
      transactions: await db.transaction.findMany({ where: { deletedAt: null }, select: { referenceId: true, type: true, status: true, amount: true, description: true } }),
      mappings: await db.accountMapping.findMany({ select: { key: true, accountCode: true }, orderBy: { key: 'asc' } }),
    };
    const bankEntries = await db.journalEntry.aggregate({
      where: { accountCode: '1120', date: { lt: new Date('2026-01-01T00:00:00.000Z') } },
      _sum: { debit: true, credit: true },
    });
    console.log(JSON.stringify({
      company: {
        id: match.company.id, name: match.company.name, subdomain: match.company.subdomain,
        status: match.company.status, mode: match.company.mode, databaseName: match.databaseName,
        modules: {
          construction: match.company.constructionEnabled,
          realEstate: match.company.realEstateEnabled,
          materialManagement: match.company.materialManagementEnabled,
        },
      },
      actingUser: owner,
      counts,
      sourceMatches,
      existing,
      openingBankBalance: Number(bankEntries._sum.debit || 0) - Number(bankEntries._sum.credit || 0),
    }, null, 2));
  } finally {
    await manager.onModuleDestroy();
    await central.onModuleDestroy();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
