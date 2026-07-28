import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportScheduleDto {
  @IsString() reportId: string;
  @IsString() @MaxLength(180) name: string;
  @IsIn(['WEEKLY', 'MONTHLY', 'YEARLY']) frequency: string;
  @IsOptional() @IsString() @MaxLength(2000) recipients?: string;
  @IsOptional() @IsString() @MaxLength(4000) filters?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Date) @IsDate() nextRunAt?: Date;
}
