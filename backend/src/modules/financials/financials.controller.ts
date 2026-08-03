import { Controller, Get, Post, Body, Query, UseGuards, Headers, Patch, Delete, Param } from '@nestjs/common';
import { FinancialsService } from './financials.service';
import { GetTenantDb } from '../../common/decorators/tenant-context.decorator';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GetTenantContext } from '../../common/decorators/tenant-context.decorator';
import {
  AccountDto,
  CategoryDto,
  CreateTransactionDto,
  TransactionQueryDto,
  UpdateTransactionDto,
} from './dto/financials.dto';

@Controller('api/financials')
@UseGuards(TenantAccessGuard)
export class FinancialsController {
  constructor(private readonly financialsService: FinancialsService) {}

  @Get('transactions')
  @RequirePermissions('transactions.read')
  async getTransactions(
    @GetTenantDb() tenantDb: any,
    @Query() query: TransactionQueryDto,
  ) {
    return this.financialsService.getTransactions(tenantDb, query);
  }

  @Post('transactions')
  @RequirePermissions('transactions.create')
  async createTransaction(
    @GetTenantDb() tenantDb: any,
    @GetTenantContext('companyId') tenantId: string,
    @Body() body: CreateTransactionDto,
    @CurrentUser('id') userId: string,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.financialsService.createTransaction(tenantDb, {
      ...body,
      idempotencyKey,
      userId,
      tenantId,
    });
  }

  @Patch('transactions/:id')
  @RequirePermissions('transactions.update')
  updateTransaction(@GetTenantDb() db: any, @Param('id') id: string, @Body() body: UpdateTransactionDto) {
    return this.financialsService.updateTransaction(db, id, body);
  }

  @Delete('transactions/:id')
  @RequirePermissions('transactions.delete')
  deleteTransaction(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.financialsService.deleteTransaction(db, id);
  }

  @Get('summary')
  @RequirePermissions('financials.read')
  getSummary(@GetTenantDb() db: any, @Query() query: TransactionQueryDto) {
    return this.financialsService.getSummary(db, query);
  }

  @Get('categories')
  @RequirePermissions('financials.read')
  listCategories(@GetTenantDb() db: any) { return this.financialsService.listCategories(db); }

  @Post('categories')
  @RequirePermissions('transactions.create')
  createCategory(@GetTenantDb() db: any, @Body() body: CategoryDto) { return this.financialsService.createCategory(db, body); }

  @Patch('categories/:id')
  @RequirePermissions('transactions.update')
  updateCategory(@GetTenantDb() db: any, @Param('id') id: string, @Body() body: CategoryDto) { return this.financialsService.updateCategory(db, id, body); }

  @Delete('categories/:id')
  @RequirePermissions('transactions.delete')
  deleteCategory(@GetTenantDb() db: any, @Param('id') id: string) { return this.financialsService.deleteCategory(db, id); }

  @Get('accounts')
  @RequirePermissions('financials.read')
  listAccounts(@GetTenantDb() db: any) { return this.financialsService.listAccounts(db); }

  @Post('accounts')
  @RequirePermissions('transactions.create')
  createAccount(@GetTenantDb() db: any, @GetTenantContext('companyId') companyId: string, @Body() body: AccountDto) {
    return this.financialsService.createAccount(db, companyId, body);
  }

  @Patch('accounts/:code')
  @RequirePermissions('transactions.update')
  updateAccount(@GetTenantDb() db: any, @Param('code') code: string, @Body() body: AccountDto) {
    return this.financialsService.updateAccount(db, code, body);
  }

  @Delete('accounts/:code')
  @RequirePermissions('transactions.delete')
  deleteAccount(@GetTenantDb() db: any, @Param('code') code: string) {
    return this.financialsService.deleteAccount(db, code);
  }
}
