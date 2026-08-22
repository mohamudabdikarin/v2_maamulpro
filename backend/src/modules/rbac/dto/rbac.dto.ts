import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{1,49}$/)
  key: string;

  @IsString() @MaxLength(100) name: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsArray() @ArrayUnique() @IsString({ each: true }) permissionIds: string[];
}

export class UpdateRoleDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) permissionIds?: string[];
}

export class AssignUserRolesDto {
  @IsArray() @ArrayUnique() @IsString({ each: true }) roleIds: string[];
}

export class SetDirectPermissionDto {
  @IsString() permissionId: string;
  @IsIn(['ALLOW', 'DENY']) effect: 'ALLOW' | 'DENY';
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class SetApprovalLimitDto {
  @Type(() => Number) @IsNumber() @Min(0) approvalLimit: number;
}
