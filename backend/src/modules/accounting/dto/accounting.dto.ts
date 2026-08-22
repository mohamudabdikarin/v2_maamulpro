import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const NORMAL_BALANCES = ['DEBIT', 'CREDIT'] as const;
export type NormalBalance = (typeof NORMAL_BALANCES)[number];

export const BATCH_STATUSES = ['POSTED', 'PENDING_APPROVAL', 'REVERSED', 'VOID'] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export class UpsertAccountDto {
  @IsOptional() @IsString() @MaxLength(30) code?: string;
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(30) parentCode?: string;
  @IsIn(ACCOUNT_TYPES) type!: AccountType;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsIn(NORMAL_BALANCES) normalBalance?: NormalBalance;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() allowNegative?: boolean;
}

export class JournalLineDto {
  @IsString() @MaxLength(30) accountCode!: string;
  @Type(() => Number) @IsNumber() @Min(0) debit!: number;
  @Type(() => Number) @IsNumber() @Min(0) credit!: number;
  @IsOptional() @IsString() @MaxLength(500) memo?: string;
  @IsOptional() @IsString() @MaxLength(200) contactName?: string;
}

export class CreateJournalBatchDto {
  @IsOptional() @Type(() => Date) @IsDate() date?: Date;
  @IsOptional() @IsString() @MaxLength(500) memo?: string;
  @IsOptional() @IsString() @MaxLength(50) sourceType?: string;
  @IsOptional() @IsString() @MaxLength(100) sourceId?: string;
  @IsOptional() @IsString() @MaxLength(200) sourceRef?: string;
  @IsArray() @ArrayMinSize(2) @ValidateNested({ each: true }) @Type(() => JournalLineDto)
  lines!: JournalLineDto[];
}

export class JournalBatchQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() sourceType?: string;
  @IsOptional() @IsIn(BATCH_STATUSES) status?: BatchStatus;
  @IsOptional() @Type(() => Date) @IsDate() startDate?: Date;
  @IsOptional() @Type(() => Date) @IsDate() endDate?: Date;
}

export class AccountBalanceQueryDto {
  @IsOptional() @Type(() => Date) @IsDate() asOf?: Date;
}

export class TrialBalanceQueryDto {
  @IsOptional() @Type(() => Date) @IsDate() asOf?: Date;
}

export class ReportRangeQueryDto {
  @IsOptional() @Type(() => Date) @IsDate() startDate?: Date;
  @IsOptional() @Type(() => Date) @IsDate() endDate?: Date;
}

export class GeneralLedgerQueryDto {
  @IsOptional() @Type(() => Date) @IsDate() startDate?: Date;
  @IsOptional() @Type(() => Date) @IsDate() endDate?: Date;
  @IsOptional() @IsString() accountCodes?: string;
}

export class CreateAccountingPeriodDto {
  @IsString() @MaxLength(120) name!: string;
  @Type(() => Date) @IsDate() startDate!: Date;
  @Type(() => Date) @IsDate() endDate!: Date;
}
