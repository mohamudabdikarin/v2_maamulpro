import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';

export class CreateCompanyDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsString() @Matches(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/) subdomain: string;
  @IsString() @MinLength(2) @MaxLength(120) adminName: string;
  @IsEmail() adminEmail: string;
  @IsString() @MinLength(10) @MaxLength(200) adminPassword: string;
  @IsOptional() @IsString() @Matches(/^postgres(?:ql)?:\/\//) @MaxLength(2000) dbUrl?: string;
  @IsOptional() @IsString() @MaxLength(80) companyType?: string;
  @IsOptional() @IsBoolean() constructionEnabled?: boolean;
  @IsOptional() @IsBoolean() realEstateEnabled?: boolean;
  @IsOptional() @IsBoolean() materialManagementEnabled?: boolean;
  @IsOptional() @IsString() planId?: string;
  @IsOptional() @IsIn(['MONTHLY', 'YEARLY']) billingCycle?: 'MONTHLY' | 'YEARLY';
}

export class UpdateCompanyDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) adminName?: string;
  @IsOptional() @IsEmail() adminEmail?: string;
  @IsOptional() @IsString() @MaxLength(80) companyType?: string;
  @IsOptional() @IsString() @MaxLength(500) phone?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(2000) logoUrl?: string;
  @IsOptional() @IsBoolean() constructionEnabled?: boolean;
  @IsOptional() @IsBoolean() realEstateEnabled?: boolean;
  @IsOptional() @IsBoolean() materialManagementEnabled?: boolean;
}

export class CreateSubscriptionPlanDto {
  @IsString() @MinLength(2) @MaxLength(50) key: string;
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsNumber() @Min(0) priceMonthly: number;
  @IsNumber() @Min(0) priceYearly: number;
  @IsOptional() @IsInt() @Min(0) constructionMax?: number;
  @IsOptional() @IsInt() @Min(0) propertiesMax?: number;
  @IsOptional() @IsInt() @Min(0) usersMax?: number;
  @IsOptional() @IsObject() features?: Record<string, boolean>;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateSubscriptionPlanDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsNumber() @Min(0) priceMonthly?: number;
  @IsOptional() @IsNumber() @Min(0) priceYearly?: number;
  @IsOptional() @IsInt() @Min(0) constructionMax?: number;
  @IsOptional() @IsInt() @Min(0) propertiesMax?: number;
  @IsOptional() @IsInt() @Min(0) usersMax?: number;
  @IsOptional() @IsObject() features?: Record<string, boolean>;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class AssignSubscriptionDto {
  @IsString() companyId: string;
  @IsString() planId: string;
  @IsOptional() @IsIn(['MONTHLY', 'YEARLY']) billingCycle?: 'MONTHLY' | 'YEARLY';
}

export class InvoicePaymentDto {
  @IsOptional() @IsString() @MaxLength(80) paymentMethod?: string;
}

export class SubscriptionNotesDto {
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class AutoRenewDto {
  @IsBoolean() autoRenew: boolean;
}
