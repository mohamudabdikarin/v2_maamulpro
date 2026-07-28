import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import {
  AccountDto,
  CategoryDto,
  CreateTransactionDto,
  TransactionQueryDto,
  UpdateTransactionDto,
} from './dto/financials.dto';

@Injectable()
export class FinancialsService {

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
        include: { category: true, project: true, property: true, deal: true },
        orderBy: { date: 'desc' },
      }),
      tenantDb.transaction.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async createTransaction(
    tenantDb: any,
    data: CreateTransactionDto & { idempotencyKey?: string; userId?: string },
  ) {
    if (!tenantDb) throw new BadRequestException('Tenant DB not available');

    return tenantDb.$transaction(async (tx: any) => {
      // 1. Double transaction check if idempotencyKey supplied
      if (data.idempotencyKey) {
        const existing = await tx.transaction.findFirst({
          where: { referenceId: data.idempotencyKey },
        });
        if (existing) return existing;
      }

      // Create the unified ledger entry. Account journals are maintained by
      // the source-specific ledger workflows, not by the core transaction row.
      const transaction = await tx.transaction.create({
        data: {
          referenceId: data.idempotencyKey || undefined,
          type: data.type,
          amount: data.amount,
          categoryId: data.categoryId || null,
          projectId: data.projectId || null,
          propertyId: data.propertyId || null,
          dealId: data.dealId || null,
          userId: data.userId || null,
          description: data.description,
          notes: data.notes,
          date: data.date ? new Date(data.date) : new Date(),
          status: (data.status as any) || 'PENDING',
        },
      });

      return transaction;
    });
  }

  async updateTransaction(tenantDb: any, id: string, data: UpdateTransactionDto) {
    const result = await tenantDb.transaction.updateMany({
      where: { id, version: data.version, deletedAt: null },
      data: {
        type: data.type,
        status: data.status,
        amount: data.amount,
        description: data.description,
        categoryId: data.categoryId,
        projectId: data.projectId,
        propertyId: data.propertyId,
        dealId: data.dealId,
        notes: data.notes,
        date: data.date,
        version: { increment: 1 },
      },
    });
    if (!result.count) {
      throw new ConflictException('Transaction changed or no longer exists; reload and retry');
    }
    return tenantDb.transaction.findUnique({ where: { id } });
  }

  async deleteTransaction(tenantDb: any, id: string) {
    const result = await tenantDb.transaction.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
    if (!result.count) throw new NotFoundException('Transaction not found');
    return { deleted: true };
  }

  async getSummary(tenantDb: any, query: TransactionQueryDto) {
    const where: any = { deletedAt: null };
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
    return tenantDb.account.create({ data: { ...data, tenantId } });
  }

  async updateAccount(tenantDb: any, code: string, data: AccountDto) {
    if (data.code !== code) throw new BadRequestException('Account code cannot be changed');
    return tenantDb.account.update({ where: { code }, data });
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
