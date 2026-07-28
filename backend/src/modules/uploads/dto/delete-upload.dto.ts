import { IsUrl } from 'class-validator';

export class DeleteUploadDto {
  @IsUrl({ require_protocol: true }) url: string;
}
