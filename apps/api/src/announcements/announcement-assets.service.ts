import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import imageSize from 'image-size';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { resolvePublicMediaUrl } from '../common/utils/media-url.util';

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

@Injectable()
export class AnnouncementAssetsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private uploadRoot(): string {
    return (
      this.config.get<string>('UPLOAD_DIR') ||
      join(process.cwd(), 'uploads')
    );
  }

  assertPlatform(actor: JwtPayload, platformId: string) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    if (actor.platformId !== platformId) throw new ForbiddenException();
    if (actor.role !== UserRole.PLATFORM_ADMIN) throw new ForbiddenException();
  }

  private toPublicPath(storagePath: string): string {
    const p = storagePath.replace(/^\/+/, '');
    return `/uploads/${p}`;
  }

  async list(platformId: string, actor: JwtPayload) {
    this.assertPlatform(actor, platformId);
    const rows = await this.prisma.platformAnnouncementAsset.findMany({
      where: { platformId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      width: r.width,
      height: r.height,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      originalName: r.originalName,
      createdAt: r.createdAt.toISOString(),
      publicPath: this.toPublicPath(r.storagePath),
      url: resolvePublicMediaUrl(this.toPublicPath(r.storagePath)),
    }));
  }

  async saveUpload(
    platformId: string,
    actor: JwtPayload,
    file: Express.Multer.File,
  ) {
    this.assertPlatform(actor, platformId);
    if (!file?.buffer?.length) {
      throw new BadRequestException('파일이 비어 있습니다');
    }
    let dims: { width?: number; height?: number };
    try {
      dims = imageSize(file.buffer) as { width?: number; height?: number };
    } catch {
      throw new BadRequestException('이미지 크기를 읽을 수 없습니다');
    }
    if (!dims.width || !dims.height) {
      throw new BadRequestException('이미지 너비·높이를 확인할 수 없습니다');
    }
    const orig = file.originalname || 'image';
    const rawExt = orig.includes('.')
      ? orig.slice(orig.lastIndexOf('.')).toLowerCase()
      : '';
    const ext = ALLOWED_EXT.has(rawExt) ? rawExt : '.png';
    const fileName = `${randomUUID()}${ext}`;
    const storagePath = `announcements/${platformId}/${fileName}`;
    const dir = join(this.uploadRoot(), 'announcements', platformId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(this.uploadRoot(), storagePath), file.buffer);
    const row = await this.prisma.platformAnnouncementAsset.create({
      data: {
        platformId,
        storagePath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        width: dims.width,
        height: dims.height,
        originalName: orig.slice(0, 200),
      },
    });
    const publicPath = this.toPublicPath(row.storagePath);
    return {
      id: row.id,
      width: row.width,
      height: row.height,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      originalName: row.originalName,
      createdAt: row.createdAt.toISOString(),
      publicPath,
      url: resolvePublicMediaUrl(publicPath),
    };
  }

  async remove(assetId: string, platformId: string, actor: JwtPayload) {
    this.assertPlatform(actor, platformId);
    const row = await this.prisma.platformAnnouncementAsset.findFirst({
      where: { id: assetId, platformId },
    });
    if (!row) throw new NotFoundException('파일 없음');
    const abs = join(this.uploadRoot(), row.storagePath);
    try {
      await unlink(abs);
    } catch {
      /* 이미 없으면 무시 */
    }
    await this.prisma.platformAnnouncementAsset.delete({ where: { id: row.id } });
    return { ok: true };
  }
}
