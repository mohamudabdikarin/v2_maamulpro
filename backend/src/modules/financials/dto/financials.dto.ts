import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class TransactionQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(['INCOME', 'EXPENSE']) type?: string;
  @IsOptional() @IsIn(['PENDING', 'PROCESSING', 'CLEARED', 'CANCELLED']) status?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() propertyId?: string;
  @IsOptional() @Type(() => Date) @IsDate() startDate?: Date;
  @IsOptional() @Type(() => Date) @IsDate() endDate?: Date;
}

export class CreateTransactionDto {
  @IsIn(['INCOME', 'EXPENSE']) type: 'INCOME' | 'EXPENSE';
  @IsOptional() @IsIn(['PENDING', 'PROCESSING', 'CLEARED', 'CANCELLED']) status?: string;
  @Type(() => Number) @IsNumber() @Min(0.01) amount: number;
  @IsString() @MaxLength(500) description: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() propertyId?: string;
  @IsOptional() @IsString() dealId?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @Type(() => Date) @IsDate() date?: Date;
}

export class UpdateTransactionDto {
  @IsOptional() @IsIn(['INCOME', 'EXPENSE']) type?: 'INCOME' | 'EXPENSE';
  @IsOptional() @IsIn(['PENDING', 'PROCESSING', 'CLEARED', 'CANCELLED']) status?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() propertyId?: string;
  @IsOptional() @IsString() dealId?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @Type(() => Date) @IsDate() date?: Date;
  @Type(() => Number) @IsNumber() @Min(0) version: number;
}

export class CategoryDto {
  @IsString() @MaxLength(100) name: string;
  @IsOptional() @IsString() @MaxLength(20) code?: string;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}

export class AccountDto {
  @IsString() @MaxLength(30) code: string;
  @IsString() @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(30) parentCode?: string;
  @IsIn(['INCOME', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY'])
  type: 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY';
}
