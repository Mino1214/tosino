import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, IpAccessListKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';

@Injectable()
export class IpAccessService {
  constructor(private prisma: PrismaService) {}

  private assertSuper(actor: JwtPayload) {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException();
    }
  }

  private normalizeCidr(raw: string): string {
    const s = raw.trim().toLowerCase();
    if (!s) throw new BadRequestException('CIDR 또는 IP를 입력하세요');
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipv4.test(s)) {
      throw new BadRequestException('IPv4 또는 IPv4/CIDR 형식만 지원합니다');
    }
    return s;
  }

  async list(
    actor: JwtPayload,
    query: { platformId?: string; kind?: IpAccessListKind },
  ) {
    this.assertSuper(actor);
    const rows = await this.prisma.ipAccessRule.findMany({
      where: {
        ...(query.platformId
          ? { OR: [{ platformId: query.platformId }, { isGlobal: true }] }
          : {}),
        ...(query.kind ? { kind: query.kind } : {}),
      },
      orderBy: [{ isGlobal: 'desc' }, { createdAt: 'desc' }],
      include: {
        platform: { select: { id: true, slug: true, name: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      isGlobal: r.isGlobal,
      platformId: r.platformId,
      platform: r.platform,
      kind: r.kind,
      cidr: r.cidr,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async create(
    actor: JwtPayload,
    body: {
      isGlobal: boolean;
      platformId?: string | null;
      kind: IpAccessListKind;
      cidr: string;
      note?: string | null;
    },
  ) {
    this.assertSuper(actor);
    if (body.isGlobal && body.platformId) {
      throw new BadRequestException('전역 규칙에는 솔루션을 지정할 수 없습니다');
    }
    if (!body.isGlobal) {
      const pid = body.platformId?.trim();
      if (!pid) {
        throw new BadRequestException('솔루션별 규칙에는 platformId가 필요합니다');
      }
      const p = await this.prisma.platform.findUnique({
        where: { id: pid },
        select: { id: true },
      });
      if (!p) throw new NotFoundException('솔루션을 찾을 수 없습니다');
    }
    const cidr = this.normalizeCidr(body.cidr);
    const dup = await this.prisma.ipAccessRule.findFirst({
      where: {
        kind: body.kind,
        cidr,
        isGlobal: body.isGlobal,
        platformId: body.isGlobal ? null : body.platformId!.trim(),
      },
    });
    if (dup) {
      throw new BadRequestException('동일한 규칙이 이미 있습니다');
    }
    const row = await this.prisma.ipAccessRule.create({
      data: {
        isGlobal: body.isGlobal,
        platformId: body.isGlobal ? null : body.platformId!.trim(),
        kind: body.kind,
        cidr,
        note: body.note?.trim() || null,
      },
      include: {
        platform: { select: { id: true, slug: true, name: true } },
      },
    });
    return {
      id: row.id,
      isGlobal: row.isGlobal,
      platformId: row.platformId,
      platform: row.platform,
      kind: row.kind,
      cidr: row.cidr,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async remove(actor: JwtPayload, id: string) {
    this.assertSuper(actor);
    const row = await this.prisma.ipAccessRule.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!row) throw new NotFoundException();
    await this.prisma.ipAccessRule.delete({ where: { id } });
    return { ok: true as const };
  }
}
