import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { ReplaceAnnouncementsDto } from './dto/replace-announcements.dto';
import { resolvePublicMediaUrl } from '../common/utils/media-url.util';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  assertPlatform(actor: JwtPayload, platformId: string) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    if (actor.platformId !== platformId) throw new ForbiddenException();
    if (actor.role !== UserRole.PLATFORM_ADMIN) throw new ForbiddenException();
  }

  async list(platformId: string, actor: JwtPayload) {
    this.assertPlatform(actor, platformId);
    const rows = await this.prisma.platformAnnouncement.findMany({
      where: { platformId },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((r) => ({
      ...r,
      resolvedUrl: resolvePublicMediaUrl(r.imageUrl),
    }));
  }

  async replace(platformId: string, actor: JwtPayload, dto: ReplaceAnnouncementsDto) {
    this.assertPlatform(actor, platformId);
    const items = dto.items.slice(0, 4);
    await this.prisma.$transaction(async (tx) => {
      await tx.platformAnnouncement.deleteMany({ where: { platformId } });
      if (items.length > 0) {
        await tx.platformAnnouncement.createMany({
          data: items.map((it, i) => ({
            platformId,
            imageUrl: it.imageUrl.trim(),
            sortOrder: i,
            active: it.active !== false,
            mandatoryRead: it.mandatoryRead === true,
            imageWidth: it.imageWidth ?? null,
            imageHeight: it.imageHeight ?? null,
          })),
        });
      }
    });
    return this.list(platformId, actor);
  }
}
