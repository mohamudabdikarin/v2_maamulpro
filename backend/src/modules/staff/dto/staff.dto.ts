import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  STRONG_PASSWORD_MESSAGE,
  STRONG_PASSWORD_PATTERN,
} from '../../../common/security/password-policy';

export class CreateStaffDto {
  @IsString() @MaxLength(100) firstName: string;
  @IsString() @MaxLength(100) lastName: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(120) position?: string;
  @IsOptional() @IsIn(['GENERAL', 'CONSTRUCTION', 'REAL_ESTATE', 'MATERIAL_MANAGEMENT']) department?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) salary?: number;
  @IsOptional() @Type(() => Date) @IsDate() hireDate?: Date;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED']) status?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsString() @MaxLength(2048) photoUrl?: string;
  @IsOptional() @IsString() workerTypeId?: string;
  @IsOptional() @IsString() assignedProjectId?: string;
  @IsOptional() @IsBoolean() createAccount?: boolean;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsIn([
    'GENERAL_MANAGER', 'ADMIN', 'MANAGER', 'STAFF',
    'CONSTRUCTION_MANAGER', 'SITE_ENGINEER', 'PROJECT_SUPERVISOR',
    'PROCUREMENT_OFFICER', 'STOREKEEPER', 'MANPOWER_SUPERVISOR',
    'REAL_ESTATE_MANAGER', 'SALES_AGENT', 'RENTAL_OFFICER', 'PROPERTY_SUPERVISOR',
    'MATERIAL_MANAGER', 'SALES_STAFF', 'INVENTORY_OFFICER', 'SUPPLIER_OFFICER', 'DELIVERY_OFFICER',
  ]) role?: string;
  @IsOptional()
  @IsString()
  @Matches(STRONG_PASSWORD_PATTERN, { message: STRONG_PASSWORD_MESSAGE })
  temporaryPassword?: string;
}

export class UpdateStaffDto {
  @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(120) position?: string;
  @IsOptional() @IsIn(['GENERAL', 'CONSTRUCTION', 'REAL_ESTATE', 'MATERIAL_MANAGEMENT']) department?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) salary?: number;
  @IsOptional() @Type(() => Date) @IsDate() hireDate?: Date;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED']) status?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsString() @MaxLength(2048) photoUrl?: string;
  @IsOptional() @IsString() workerTypeId?: string;
  @IsOptional() @IsString() assignedProjectId?: string;
}

export class StaffAccountDto {
  @IsEmail() email: string;
  @IsIn([
    'GENERAL_MANAGER', 'ADMIN', 'MANAGER', 'STAFF',
    'CONSTRUCTION_MANAGER', 'SITE_ENGINEER', 'PROJECT_SUPERVISOR',
    'PROCUREMENT_OFFICER', 'STOREKEEPER', 'MANPOWER_SUPERVISOR',
    'REAL_ESTATE_MANAGER', 'SALES_AGENT', 'RENTAL_OFFICER', 'PROPERTY_SUPERVISOR',
    'MATERIAL_MANAGER', 'SALES_STAFF', 'INVENTORY_OFFICER', 'SUPPLIER_OFFICER', 'DELIVERY_OFFICER',
  ]) role: string;
  @IsString()
  @Matches(STRONG_PASSWORD_PATTERN, { message: STRONG_PASSWORD_MESSAGE })
  temporaryPassword: string;
}

export class StaffEmailDto {
  @IsEmail() email: string;
}

export class StaffPasswordDto {
  @IsString()
  @Matches(STRONG_PASSWORD_PATTERN, { message: STRONG_PASSWORD_MESSAGE })
  temporaryPassword: string;
}

export class AccountStatusDto {
  @IsBoolean() isActive: boolean;
}
