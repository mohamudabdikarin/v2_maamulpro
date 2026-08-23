import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PayrollItemDto {
  @IsOptional() @IsString() staffId?: string;
  @IsString() @MaxLength(160) employeeName: string;
  @IsOptional() @IsString() @MaxLength(120) employeePosition?: string;
  @IsOptional() @IsIn(['GENERAL', 'CONSTRUCTION', 'REAL_ESTATE', 'MATERIAL_MANAGEMENT']) employeeDepartment?: string;
  @Type(() => Number) @IsNumber() @Min(0) baseSalary: number;
  @Type(() => Number) @IsNumber() @Min(0) bonuses: number;
  @Type(() => Number) @IsNumber() @Min(0) deductions: number;
  @Type(() => Number) @IsNumber() @Min(0) tax: number;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class SavePayrollDto {
  @IsString() @MaxLength(100) name: string;
  @Type(() => Number) @IsInt() @Min(2000) @Max(2100) year: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) month: number;
  @IsOptional() @IsString() payPeriod?: string;
  @IsOptional() @Type(() => Date) @IsDate() paymentDate?: Date;
  @IsOptional() @IsString() expenseAccountCode?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsIn(['DRAFT', 'PENDING_APPROVAL']) status?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PayrollItemDto)
  items: PayrollItemDto[];
}

export class PayrollTransitionDto {
  @IsIn(['submit', 'approve', 'reject', 'pay', 'reopen'])
  action: 'submit' | 'approve' | 'reject' | 'pay' | 'reopen';
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @IsOptional() @IsString() @MaxLength(30) accountId?: string;
}
