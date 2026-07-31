import { Body, Controller, Delete, Get, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Readable } from 'node:stream';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { DeleteUploadDto } from './dto/delete-upload.dto';
import { UploadsService } from './uploads.service';

@UseGuards(TenantAccessGuard)
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

  @Get('images/content')
  async readImage(
    @Query('url') url: string,
    @CurrentUser() user: any,
    @Res() response: Response,
  ) {
    const result = await this.uploads.readPrivateImage(
      url,
      user.companyId,
      user.isSuperAdmin,
    );
    response.setHeader('Content-Type', result.blob.contentType || 'application/octet-stream');
    response.setHeader('Cache-Control', 'private, max-age=300');
    Readable.fromWeb(result.stream as any).pipe(response);
  }
}
