import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsOptional() @IsString() @MaxLength(160) companyName?: string;
  @IsOptional() @IsString() @MaxLength(2048) logoUrl?: string;
  @IsOptional() @IsEmail() companyEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) companyPhone?: string;
  @IsOptional() @IsString() @MaxLength(500) companyAddress?: string;
  @IsOptional() @IsString() @MaxLength(2000) companyDescription?: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(2048) avatarUrl?: string;
}

export class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(12) newPassword: string;
}

export class UpdateLanguageDto {
  @IsIn(['en', 'so']) language: 'en' | 'so';
}
