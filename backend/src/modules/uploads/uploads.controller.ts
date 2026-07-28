import { Body, Controller, Delete, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DeleteUploadDto } from './dto/delete-upload.dto';
import { UploadsService } from './uploads.service';

@Controller('api/uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('images')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  uploadImage(
    @UploadedFile() file: any,
    @Query('folder') folder: string | undefined,
    @CurrentUser() user: any,
  ) {
    return this.uploads.uploadImage(file, folder, user.companyId);
  }

  @Delete('images')
  deleteImage(@Body() body: DeleteUploadDto, @CurrentUser() user: any) {
    return this.uploads.deleteImage(body.url, user.companyId, user.isSuperAdmin);
  }
}
