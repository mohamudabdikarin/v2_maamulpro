import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

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
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() @MinLength(12) temporaryPassword?: string;
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
  @IsString() role: string;
  @IsString() @MinLength(12) temporaryPassword: string;
}

export class StaffEmailDto {
  @IsEmail() email: string;
}

export class StaffPasswordDto {
  @IsString() @MinLength(12) temporaryPassword: string;
}

export class AccountStatusDto {
  @IsBoolean() isActive: boolean;
}
