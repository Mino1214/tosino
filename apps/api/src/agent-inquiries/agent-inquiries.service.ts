import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AgentInquiryStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { CreateAgentInquiryDto } from './dto/create-agent-inquiry.dto';

@Injectable()
export class AgentInquiriesService {
  constructor(private prisma: PrismaService) {}

  private assertAdmin(actor: JwtPayload, platformId: string) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    if (
      actor.role === UserRole.PLATFORM_ADMIN &&
      actor.platformId === platformId
    )
      return;
    throw new ForbiddenException();
  }

  async createByAgent(actor: JwtPayload, dto: CreateAgentInquiryDto) {
    if (actor.role !== UserRole.MASTER_AGENT || !actor.platformId) {
      throw new ForbiddenException();
    }
    const agent = await this.prisma.user.findFirst({
      where: {
        id: actor.sub,
        platformId: actor.platformId,
        role: UserRole.MASTER_AGENT,
      },
      select: { id: true },
    });
    if (!agent) throw new ForbiddenException();
    return this.prisma.agentInquiry.create({
      data: {
        platformId: actor.platformId,
        agentUserId: actor.sub,
        subject: dto.subject.trim(),
        body: dto.body.trim(),
      },
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
      },
    });
  }

  listByAgent(actor: JwtPayload) {
    if (actor.role !== UserRole.MASTER_AGENT || !actor.platformId) {
      throw new ForbiddenException();
    }
    return this.prisma.agentInquiry.findMany({
      where: {
        platformId: actor.platformId,
        agentUserId: actor.sub,
      },
      select: {
        id: true,
        subject: true,
        body: true,
        status: true,
        adminReply: true,
        repliedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** 사이드바 배지 · 총판별 탭 집계 (미답변 OPEN만) */
  async pendingSummary(platformId: string, actor: JwtPayload) {
    this.assertAdmin(actor, platformId);
    const rows = await this.prisma.agentInquiry.findMany({
      where: { platformId, status: AgentInquiryStatus.OPEN },
      select: {
        agentUserId: true,
        agent: {
          select: {
            id: true,
            loginId: true,
            email: true,
            displayName: true,
            referralCode: true,
          },
        },
      },
    });
    const total = rows.length;
    type G = {
      agentUserId: string;
      label: string;
      email: string;
      referralCode: string | null;
      count: number;
    };
    const map = new Map<string, G>();
    for (const r of rows) {
      const id = r.agentUserId;
      const label =
        r.agent.displayName?.trim() ||
        r.agent.loginId ||
        r.agent.email ||
        id;
      const prev = map.get(id);
      if (prev) prev.count += 1;
      else
        map.set(id, {
          agentUserId: id,
          label,
          email: r.agent.email ?? r.agent.loginId,
          referralCode: r.agent.referralCode,
          count: 1,
        });
    }
    const groups = [...map.values()].sort((a, b) => b.count - a.count);
    return { total, groups };
  }

  async listForAdmin(
    platformId: string,
    actor: JwtPayload,
    statusRaw?: string,
  ) {
    this.assertAdmin(actor, platformId);
    let status: AgentInquiryStatus | undefined;
    if (statusRaw && statusRaw !== 'all') {
      if (!(Object.values(AgentInquiryStatus) as string[]).includes(statusRaw)) {
        throw new BadRequestException('유효하지 않은 status');
      }
      status = statusRaw as AgentInquiryStatus;
    }
    return this.prisma.agentInquiry.findMany({
      where: {
        platformId,
        ...(status ? { status } : {}),
      },
      select: {
        id: true,
        subject: true,
        body: true,
        status: true,
        adminReply: true,
        repliedAt: true,
        createdAt: true,
        updatedAt: true,
        agent: {
          select: {
            id: true,
            email: true,
            displayName: true,
            referralCode: true,
          },
        },
        repliedBy: {
          select: { id: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async reply(
    platformId: string,
    inquiryId: string,
    actor: JwtPayload,
    reply: string,
  ) {
    this.assertAdmin(actor, platformId);
    const row = await this.prisma.agentInquiry.findFirst({
      where: { id: inquiryId, platformId },
    });
    if (!row) throw new NotFoundException();
    if (row.status === AgentInquiryStatus.CLOSED) {
      throw new BadRequestException('종료된 문의입니다');
    }
    const text = reply.trim();
    return this.prisma.agentInquiry.update({
      where: { id: inquiryId },
      data: {
        adminReply: text,
        repliedAt: new Date(),
        repliedByUserId: actor.sub,
        status: AgentInquiryStatus.ANSWERED,
      },
      select: {
        id: true,
        status: true,
        adminReply: true,
        repliedAt: true,
      },
    });
  }

  async close(
    platformId: string,
    inquiryId: string,
    actor: JwtPayload,
    note?: string,
  ) {
    this.assertAdmin(actor, platformId);
    const row = await this.prisma.agentInquiry.findFirst({
      where: { id: inquiryId, platformId },
    });
    if (!row) throw new NotFoundException();
    const data: {
      status: AgentInquiryStatus;
      adminReply?: string;
      repliedAt?: Date;
      repliedByUserId?: string;
    } = { status: AgentInquiryStatus.CLOSED };
    const n = note?.trim();
    if (n) {
      data.adminReply = row.adminReply
        ? `${row.adminReply}\n\n[종료 메모]\n${n}`
        : n;
      if (!row.repliedAt) {
        data.repliedAt = new Date();
        data.repliedByUserId = actor.sub;
      }
    }
    return this.prisma.agentInquiry.update({
      where: { id: inquiryId },
      data,
      select: { id: true, status: true },
    });
  }
}
