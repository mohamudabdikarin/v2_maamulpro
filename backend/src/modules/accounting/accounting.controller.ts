import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountMappingsService } from './account-mappings.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import {
  GetTenantContext,
  GetTenantDb,
} from '../../common/decorators/tenant-context.decorator';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import {
  AccountBalanceQueryDto,
  CreateJournalBatchDto,
  CreateAccountingPeriodDto,
  GeneralLedgerQueryDto,
  JournalBatchQueryDto,
  ReportRangeQueryDto,
  TrialBalanceQueryDto,
  UpsertAccountDto,
} from './dto/accounting.dto';

@Controller('api/accounting')
@UseGuards(TenantAccessGuard)
export class AccountingController {
  constructor(
    private readonly accounting: AccountingService,
    private readonly mappings: AccountMappingsService,
  ) {}

  @Get('periods')
  @RequirePermissions('accounting.read')
  listPeriods(@GetTenantDb() db: any) { return this.accounting.listPeriods(db); }

  @Post('periods')
  @RequirePermissions('accounting.approve')
  createPeriod(@GetTenantDb() db: any, @Body() dto: CreateAccountingPeriodDto) { return this.accounting.createPeriod(db, dto); }

  @Post('periods/:id/lock')
  @RequirePermissions('accounting.approve')
  lockPeriod(@GetTenantDb() db: any, @Param('id') id: string, @CurrentUser('id') userId: string) { return this.accounting.setPeriodLock(db, id, true, userId); }

  @Post('periods/:id/unlock')
  @RequirePermissions('accounting.approve')
  unlockPeriod(@GetTenantDb() db: any, @Param('id') id: string) { return this.accounting.setPeriodLock(db, id, false); }

  // ── Account Mappings ───────────────────────────────────────

  @Get('mappings')
  @RequirePermissions('accounting.read')
  listMappings(@GetTenantDb() db: any) {
    return this.mappings.list(db);
  }

  @Get('mappings/:key')
  @RequirePermissions('accounting.read')
  getMapping(@GetTenantDb() db: any, @Param('key') key: string) {
    return this.mappings.get(db, key);
  }

  @Patch('mappings/:key')
  @RequirePermissions('accounting.manage')
  setMapping(
    @GetTenantDb() db: any,
    @CurrentUser('id') userId: string,
    @Param('key') key: string,
    @Body('accountCode') accountCode: string,
  ) {
    return this.mappings.set(db, key, accountCode, userId);
  }

  @Delete('mappings/:key')
  @RequirePermissions('accounting.manage')
  resetMapping(@GetTenantDb() db: any, @Param('key') key: string) {
    return this.mappings.reset(db, key);
  }

  // ── Chart of Accounts ──────────────────────────────────────

  @Get('accounts')
  @RequirePermissions('accounting.read')
  listAccounts(@GetTenantDb() db: any) {
    return this.accounting.listAccounts(db);
  }

  @Get('accounts/tree')
  @RequirePermissions('accounting.read')
  getTree(@GetTenantDb() db: any) {
    return this.accounting.getChartOfAccountsTree(db);
  }

  @Get('accounts/:code/balance')
  @RequirePermissions('accounting.read')
  getBalance(
    @GetTenantDb() db: any,
    @Param('code') code: string,
    @Query() q: AccountBalanceQueryDto,
  ) {
    return this.accounting.getAccountBalance(db, code, q);
  }

  @Get('accounts/:code/ledger')
  @RequirePermissions('accounting.read')
  getLedger(
    @GetTenantDb() db: any,
    @Param('code') code: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.accounting.getAccountLedger(db, code, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('accounts')
  @RequirePermissions('accounting.manage')
  create(
    @GetTenantDb() db: any,
    @GetTenantContext('companyId') tenantId: string,
    @Body() body: UpsertAccountDto,
  ) {
    return this.accounting.upsertAccount(db, tenantId, body);
  }

  @Patch('accounts/:code')
  @RequirePermissions('accounting.manage')
  update(
    @GetTenantDb() db: any,
    @GetTenantContext('companyId') tenantId: string,
    @Param('code') code: string,
    @Body() body: UpsertAccountDto,
  ) {
    if (body.code && body.code !== code) {
      throw new Error('Account code cannot be changed');
    }
    return this.accounting.upsertAccount(db, tenantId, { ...body, code });
  }

  @Patch('accounts/:code/active')
  @RequirePermissions('accounting.manage')
  setActive(
    @GetTenantDb() db: any,
    @Param('code') code: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.accounting.setAccountActive(db, code, !!isActive);
  }

  @Delete('accounts/:code')
  @RequirePermissions('accounting.manage')
  remove(@GetTenantDb() db: any, @Param('code') code: string) {
    return this.accounting.deleteAccount(db, code);
  }

  // ── Journal Batches ────────────────────────────────────────

  @Get('journals')
  @RequirePermissions('accounting.read')
  list(@GetTenantDb() db: any, @Query() q: JournalBatchQueryDto) {
    return this.accounting.listJournalBatches(db, q);
  }

  @Get('journals/:id')
  @RequirePermissions('accounting.read')
  get(@GetTenantDb() db: any, @Param('id') id: string) {
    return this.accounting.getJournalBatch(db, id);
  }

  @Post('journals')
  @RequirePermissions('accounting.post')
  post(
    @GetTenantDb() db: any,
    @GetTenantContext('companyId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateJournalBatchDto,
  ) {
    return this.accounting.postJournalBatch(db, { tenantId, userId, dto });
  }

  @Post('journals/:id/reverse')
  @RequirePermissions('accounting.post')
  reverse(
    @GetTenantDb() db: any,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body('memo') memo?: string,
  ) {
    return this.accounting.reverseBatch(db, { userId, batchId: id, memo });
  }

  // ── Financial Reports ──────────────────────────────────────

  @Get('reports/trial-balance')
  @RequirePermissions('accounting.read')
  trialBalance(@GetTenantDb() db: any, @Query() q: TrialBalanceQueryDto) {
    return this.accounting.getTrialBalance(db, { asOf: q.asOf });
  }

  @Get('reports/income-statement')
  @RequirePermissions('accounting.read')
  incomeStatement(@GetTenantDb() db: any, @Query() q: ReportRangeQueryDto) {
    return this.accounting.getIncomeStatement(db, { startDate: q.startDate, endDate: q.endDate });
  }

  @Get('reports/balance-sheet')
  @RequirePermissions('accounting.read')
  balanceSheet(@GetTenantDb() db: any, @Query() q: TrialBalanceQueryDto) {
    return this.accounting.getBalanceSheet(db, { asOf: q.asOf });
  }

  @Get('reports/general-ledger')
  @RequirePermissions('accounting.read')
  generalLedger(@GetTenantDb() db: any, @Query() q: GeneralLedgerQueryDto) {
    const codes = q.accountCodes
      ? q.accountCodes.split(',').map((c) => c.trim()).filter(Boolean)
      : undefined;
    return this.accounting.getGeneralLedger(db, {
      startDate: q.startDate,
      endDate: q.endDate,
      accountCodes: codes,
    });
  }
}
