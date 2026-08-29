import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { AccountingService } from '../accounting/accounting.service';
import { AccountMappingsService } from '../accounting/account-mappings.service';
import {
  AccountDto,
  CategoryDto,
  CreateTransactionDto,
  TransactionQueryDto,
  UpdateTransactionDto,
} from './dto/financials.dto';

const NORMAL_BALANCE_BY_TYPE: Record<string, 'DEBIT' | 'CREDIT'> = {
  ASSET: 'DEBIT',
  EXPENSE: 'DEBIT',
  LIABILITY: 'CREDIT',
  EQUITY: 'CREDIT',
  INCOME: 'CREDIT',
};

@Injectable()
export class FinancialsService {
  private readonly logger = new Logger(FinancialsService.name);

  constructor(
    private readonly accounting: AccountingService,
    private readonly mappings: AccountMappingsService,
  ) {}

  async getTransactions(tenantDb: any, query: TransactionQueryDto) {
    if (!tenantDb) return [];
    const where: any = { deletedAt: null };
    if (query?.type) where.type = query.type;
    if (query?.status) where.status = query.status;
    if (query?.search) {
      where.OR = [
        { referenceId: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.propertyId) where.propertyId = query.propertyId;
    if (query.materialId) where.materialId = query.materialId;
    if (query.startDate || query.endDate) {
      where.date = { gte: query.startDate, lte: query.endDate };
    }
    const page = query.page || 1;
    const limit = query.limit || 25;
    const [data, total] = await Promise.all([
      tenantDb.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { category: true, project: true, property: true, deal: true, material: true },
        orderBy: { date: 'desc' },
      }),
      tenantDb.transaction.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async createTransaction(
    tenantDb: any,
    data: CreateTransactionDto & { idempotencyKey?: string; userId?: string; tenantId?: string },
  ) {
    if (!tenantDb) throw new BadRequestException('Tenant DB not available');

    return tenantDb.$transaction(async (tx: any) => {
      // 1. Idempotency check — matching referenceId returns the prior row.
      if (data.idempotencyKey) {
        const existing = await tx.transaction.findFirst({
          where: { referenceId: data.idempotencyKey },
        });
        if (existing) return existing;
      }

      const date = data.date ? new Date(data.date) : new Date();
      const status = (data.status as any) || 'PENDING';
      // Only post to the formal GL when the cashbook row is CLEARED.
      // PENDING rows stay UNPOSTED until cleared.
      let journalBatchId: string | null = null;
      let postingStatus: 'POSTED' | 'UNPOSTED' | 'FAILED' = 'UNPOSTED';
      if (status === 'CLEARED') {
        if (Boolean(data.debitAccountCode) !== Boolean(data.creditAccountCode)) {
          throw new BadRequestException('Both debit and credit account codes are required for an explicit posting');
        }
        try {
          let lines: { accountCode: string; debit: number; credit: number }[];
          if (data.debitAccountCode && data.creditAccountCode) {
            lines = [
              { accountCode: data.debitAccountCode, debit: data.amount, credit: 0 },
              { accountCode: data.creditAccountCode, debit: 0, credit: data.amount },
            ];
          } else {
            const resolved = await this.mappings.resolveMany(tenantDb, [
              'TRANSACTION_INCOME_CASH',
              'TRANSACTION_INCOME_REVENUE',
              'TRANSACTION_EXPENSE_CASH',
              'TRANSACTION_EXPENSE_ACCOUNT',
            ]);
            lines = data.type === 'INCOME'
              ? [
                  { accountCode: resolved.TRANSACTION_INCOME_CASH, debit: data.amount, credit: 0 },
                  { accountCode: resolved.TRANSACTION_INCOME_REVENUE, debit: 0, credit: data.amount },
                ]
              : [
                  { accountCode: resolved.TRANSACTION_EXPENSE_ACCOUNT, debit: data.amount, credit: 0 },
                  { accountCode: resolved.TRANSACTION_EXPENSE_CASH, debit: 0, credit: data.amount },
                ];
          }
          const batch = await this.accounting.postJournalBatch(tenantDb, {
            tenantId: data.tenantId || 'system',
            userId: data.userId,
            dto: {
              date,
              memo: data.description,
              sourceType: 'TRANSACTION',
              sourceRef: data.idempotencyKey,
              lines,
            },
            tx,
          });
          journalBatchId = batch.id;
          postingStatus = 'POSTED';
        } catch (err) {
          if (data.debitAccountCode && data.creditAccountCode) throw err;
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Auto-post failed for transaction (${data.type} ${data.amount}): ${message}`);
          postingStatus = 'UNPOSTED';
        }
      }

      const transaction = await tx.transaction.create({
        data: {
          referenceId: data.idempotencyKey || undefined,
          type: data.type,
          amount: data.amount,
          categoryId: data.categoryId || null,
          projectId: data.projectId || null,
          propertyId: data.propertyId || null,
          dealId: data.dealId || null,
          materialId: data.materialId || null,
          userId: data.userId || null,
          description: data.description,
          notes: data.notes,
          date,
          status,
          journalBatchId,
          postingStatus,
        },
      });

      return transaction;
    });
  }

  async updateTransaction(tenantDb: any, id: string, data: UpdateTransactionDto) {
    const existing = await tenantDb.transaction.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Transaction not found');
    if (data.version !== undefined && existing.version !== data.version) {
      throw new ConflictException('Transaction changed or no longer exists; reload and retry');
    }

    return tenantDb.$transaction(async (tx: any) => {
      if (existing.journalBatchId) {
        try {
          await this.accounting.reverseBatchWithinTx(tx, {
            userId: existing.userId || undefined,
            batchId: existing.journalBatchId,
            memo: `Superseded by update of transaction ${id}`,
          });
        } catch (err) {
          this.logger.warn(`Could not reverse batch ${existing.journalBatchId}: ${err instanceof Error ? err.message : err}`);
        }
      }

      const nextStatus = (data.status as any) || existing.status;
      const nextType = (data.type as any) || existing.type;
      const nextAmount = data.amount !== undefined ? Number(data.amount) : Number(existing.amount);
      const nextDate = data.date ? new Date(data.date) : existing.date;
      const nextDescription = data.description ?? existing.description;

      let journalBatchId: string | null = null;
      let postingStatus: 'POSTED' | 'UNPOSTED' | 'FAILED' = 'UNPOSTED';
      if (nextStatus === 'CLEARED') {
        try {
          const resolved = await this.mappings.resolveMany(tx, [
            'TRANSACTION_INCOME_CASH',
            'TRANSACTION_INCOME_REVENUE',
            'TRANSACTION_EXPENSE_CASH',
            'TRANSACTION_EXPENSE_ACCOUNT',
          ]);
          const lines =
            nextType === 'INCOME'
              ? [
                  { accountCode: resolved.TRANSACTION_INCOME_CASH, debit: nextAmount, credit: 0 },
                  { accountCode: resolved.TRANSACTION_INCOME_REVENUE, debit: 0, credit: nextAmount },
                ]
              : [
                  { accountCode: resolved.TRANSACTION_EXPENSE_ACCOUNT, debit: nextAmount, credit: 0 },
                  { accountCode: resolved.TRANSACTION_EXPENSE_CASH, debit: 0, credit: nextAmount },
                ];
          const batch = await this.accounting.postJournalBatch(tenantDb, {
            tenantId: 'system',
            userId: existing.userId || undefined,
            dto: { date: nextDate, memo: nextDescription, sourceType: 'TRANSACTION', sourceRef: existing.referenceId || id, lines },
            tx,
          });
          journalBatchId = batch.id;
          postingStatus = 'POSTED';
        } catch (err) {
          this.logger.warn(`Re-post failed for transaction ${id}: ${err instanceof Error ? err.message : err}`);
          postingStatus = 'UNPOSTED';
        }
      }

      const result = await tx.transaction.updateMany({
        where: { id, deletedAt: null, version: data.version },
        data: {
          type: nextType,
          status: nextStatus,
          amount: nextAmount,
          description: nextDescription,
          categoryId: data.categoryId !== undefined ? data.categoryId : existing.categoryId,
          projectId: data.projectId !== undefined ? data.projectId : existing.projectId,
          propertyId: data.propertyId !== undefined ? data.propertyId : existing.propertyId,
          dealId: data.dealId !== undefined ? data.dealId : existing.dealId,
          materialId: data.materialId !== undefined ? data.materialId : existing.materialId,
          notes: data.notes !== undefined ? data.notes : existing.notes,
          date: nextDate,
          journalBatchId,
          postingStatus,
          version: { increment: 1 },
        },
      });
      if (!result.count) {
        throw new ConflictException('Transaction changed or no longer exists; reload and retry');
      }
      return tx.transaction.findUnique({ where: { id } });
    });
  }

  async deleteTransaction(tenantDb: any, id: string) {
    const existing = await tenantDb.transaction.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Transaction not found');
    return tenantDb.$transaction(async (tx: any) => {
      if (existing.journalBatchId) {
        try {
          await this.accounting.reverseBatchWithinTx(tx, {
            userId: existing.userId || undefined,
            batchId: existing.journalBatchId,
            memo: `Soft-delete of transaction ${id}`,
          });
        } catch (err) {
          this.logger.warn(`Could not reverse batch on delete ${existing.journalBatchId}: ${err instanceof Error ? err.message : err}`);
        }
      }
      const result = await tx.transaction.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date(), postingStatus: 'UNPOSTED', journalBatchId: null, version: { increment: 1 } },
      });
      if (!result.count) throw new NotFoundException('Transaction not found');
      return { deleted: true };
    });
  }

  async getSummary(tenantDb: any, query: TransactionQueryDto) {
    const where: any = {
      deletedAt: null,
      status: 'CLEARED',
      // Legacy USAGE cashbook rows double-counted purchases; keep them out of company totals.
      NOT: { referenceId: { startsWith: 'invusage:' } },
    };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.startDate || query.endDate) where.date = { gte: query.startDate, lte: query.endDate };
    if (query.search) where.description = { contains: query.search, mode: 'insensitive' };
    const [income, expense, total] = await Promise.all([
      tenantDb.transaction.aggregate({ where: { ...where, type: 'INCOME' }, _sum: { amount: true }, _count: true }),
      tenantDb.transaction.aggregate({ where: { ...where, type: 'EXPENSE' }, _sum: { amount: true }, _count: true }),
      tenantDb.transaction.count({ where }),
    ]);
    const totalIncome = Number(income._sum.amount || 0);
    const totalExpense = Number(expense._sum.amount || 0);
    return { totalIncome, totalExpense, netBalance: totalIncome - totalExpense, totalCount: total };
  }

  listCategories(tenantDb: any) {
    return tenantDb.category.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
  }

  async createCategory(tenantDb: any, data: CategoryDto) {
    try {
      return await tenantDb.category.create({ data: { ...data, color: data.color || '#6366f1' } });
    } catch {
      throw new ConflictException('Category name or code already exists');
    }
  }

  async updateCategory(tenantDb: any, id: string, data: CategoryDto) {
    const result = await tenantDb.category.updateMany({
      where: { id, deletedAt: null },
      data,
    });
    if (!result.count) throw new NotFoundException('Category not found');
    return tenantDb.category.findUnique({ where: { id } });
  }

  async deleteCategory(tenantDb: any, id: string) {
    const used = await tenantDb.transaction.count({ where: { categoryId: id, deletedAt: null } });
    if (used) throw new ConflictException('Category is used by active transactions');
    const result = await tenantDb.category.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('Category not found');
    return { deleted: true };
  }

  listAccounts(tenantDb: any) {
    return tenantDb.account.findMany({ orderBy: { code: 'asc' } });
  }

  async createAccount(tenantDb: any, tenantId: string, data: AccountDto) {
    const existing = await tenantDb.account.findUnique({ where: { code: data.code } });
    if (existing) throw new ConflictException('Account code already exists');
    if (data.parentCode) {
      const parent = await tenantDb.account.findUnique({ where: { code: data.parentCode } });
      if (!parent) throw new BadRequestException('Parent account does not exist');
    }
    return tenantDb.account.create({
      data: {
        ...data,
        tenantId,
        normalBalance: NORMAL_BALANCE_BY_TYPE[data.type] || 'DEBIT',
      },
    });
  }

  async updateAccount(tenantDb: any, code: string, data: AccountDto) {
    if (data.code !== code) throw new BadRequestException('Account code cannot be changed');
    return tenantDb.account.update({
      where: { code },
      data: {
        ...data,
        normalBalance: NORMAL_BALANCE_BY_TYPE[data.type] || 'DEBIT',
      },
    });
  }

  async deleteAccount(tenantDb: any, code: string) {
    const [journals, children, payrolls] = await Promise.all([
      tenantDb.journalEntry.count({ where: { accountCode: code } }),
      tenantDb.account.count({ where: { parentCode: code } }),
      tenantDb.payroll.count({ where: { expenseAccountCode: code, deletedAt: null } }),
    ]);
    if (journals || children || payrolls) {
      throw new ConflictException('Account is referenced and cannot be deleted');
    }
    await tenantDb.account.delete({ where: { code } });
    return { deleted: true };
  }
}
