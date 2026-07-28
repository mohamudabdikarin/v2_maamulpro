import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { del, put } from '@vercel/blob';
import { randomUUID } from 'crypto';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_FOLDERS = new Set(['avatars', 'staff', 'projects', 'properties', 'materials', 'branding']);

@Injectable()
export class UploadsService {
  async uploadImage(file: any, folder: string | undefined, companyId?: string) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new ServiceUnavailableException('Persistent blob storage is not configured');
    if (!file) throw new BadRequestException('Image file is required');
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP and GIF images are allowed');
    }
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('Image must be 5 MB or smaller');
    const safeFolder = folder && ALLOWED_FOLDERS.has(folder) ? folder : 'uploads';
    const extension = this.extension(file.originalname, file.mimetype);
    const owner = companyId || 'platform';
    const pathname = `${owner}/${safeFolder}/${Date.now()}-${randomUUID()}.${extension}`;
    const blob = await put(pathname, file.buffer, {
      access: 'public',
      addRandomSuffix: false,
      token,
      contentType: file.mimetype,
    });
    return { url: blob.url, pathname: blob.pathname, contentType: blob.contentType };
  }

  async deleteImage(url: string, companyId?: string, isSuperAdmin = false) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new ServiceUnavailableException('Persistent blob storage is not configured');
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('Invalid blob URL');
    }
    if (!parsed.hostname.endsWith('.blob.vercel-storage.com')) {
      throw new BadRequestException('Only managed Vercel Blob images can be deleted');
    }
    const pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    if (!isSuperAdmin && (!companyId || !pathname.startsWith(`${companyId}/`))) {
      throw new BadRequestException('Image does not belong to the signed-in company');
    }
    await del(url, { token });
    return { deleted: true };
  }

  private extension(filename: string, mimetype: string) {
    const fromName = filename.split('.').pop()?.toLowerCase();
    if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fromName)) return fromName;
    return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' } as Record<string, string>)[mimetype] || 'jpg';
  }
}
