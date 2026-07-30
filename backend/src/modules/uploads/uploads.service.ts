import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { del, get, put } from '@vercel/blob';
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
    const detectedType = this.detectImageType(file.buffer);
    if (!detectedType || detectedType.mimetype !== file.mimetype) {
      throw new BadRequestException('The uploaded file content does not match its image type');
    }
    const safeFolder = folder && ALLOWED_FOLDERS.has(folder) ? folder : 'uploads';
    const extension = detectedType.extension;
    const owner = companyId || 'platform';
    const pathname = `${owner}/${safeFolder}/${Date.now()}-${randomUUID()}.${extension}`;
    const access = safeFolder === 'branding' ? 'public' as const : 'private' as const;
    const blob = await put(pathname, file.buffer, {
      access,
      addRandomSuffix: false,
      token,
      contentType: file.mimetype,
    });
    return { url: blob.url, pathname: blob.pathname, contentType: blob.contentType };
  }

  async readPrivateImage(url: string, companyId?: string, isSuperAdmin = false) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new ServiceUnavailableException('Persistent blob storage is not configured');
    const pathname = this.ownedPathname(url, companyId, isSuperAdmin);
    const blob = await get(pathname, { access: 'private', token });
    if (!blob?.stream) throw new NotFoundException('Image was not found');
    return blob;
  }

  async deleteImage(url: string, companyId?: string, isSuperAdmin = false) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new ServiceUnavailableException('Persistent blob storage is not configured');
    this.ownedPathname(url, companyId, isSuperAdmin);
    await del(url, { token });
    return { deleted: true };
  }

  private ownedPathname(url: string, companyId?: string, isSuperAdmin = false) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('Invalid blob URL');
    }
    if (!parsed.hostname.endsWith('.blob.vercel-storage.com')) {
      throw new BadRequestException('Only managed Vercel Blob images are supported');
    }
    const pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    if (!isSuperAdmin && (!companyId || !pathname.startsWith(`${companyId}/`))) {
      throw new BadRequestException('Image does not belong to the signed-in company');
    }
    return pathname;
  }

  private detectImageType(buffer: Buffer): { mimetype: string; extension: string } | null {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
    if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
      return { mimetype: 'image/jpeg', extension: 'jpg' };
    }
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return { mimetype: 'image/png', extension: 'png' };
    }
    const header = buffer.subarray(0, 12).toString('ascii');
    if (header.startsWith('GIF87a') || header.startsWith('GIF89a')) {
      return { mimetype: 'image/gif', extension: 'gif' };
    }
    if (header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP') {
      return { mimetype: 'image/webp', extension: 'webp' };
    }
    return null;
  }
}
