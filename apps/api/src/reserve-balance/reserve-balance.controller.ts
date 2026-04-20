import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import {
  ReserveBalanceService,
  ReserveTxType,
} from './reserve-balance.service';

/**
 * 마스터어드민 전용 알(크레딧) 가상 잔액 관리 API.
 * - 실제 돈/정산 금액에 영향 없음. 전부 관리자용 수치.
 */
@Controller('hq/credits/reserve')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class ReserveBalanceController {
  constructor(private readonly svc: ReserveBalanceService) {}

  @Get(':platformId/summary')
  getSummary(@Param('platformId') platformId: string) {
    return this.svc.getSummary(platformId);
  }

  @Get(':platformId/logs')
  listLogs(
    @Param('platformId') platformId: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const typedType =
      type === 'DEDUCT' ||
      type === 'RESTORE' ||
      type === 'ADJUST' ||
      type === 'ROLLBACK'
        ? (type as ReserveTxType)
        : undefined;
    return this.svc.listLogs(platformId, {
      type: typedType,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Patch(':platformId/settings')
  async updateSettings(
    @Param('platformId') platformId: string,
    @Body()
    body: {
      /** 마스터 스위치: true=운영 실시간 반영, false=테스트/수동만 */
      enabled?: boolean;
      restoreEnabled?: boolean;
      ratePct?: number | null;
    },
  ) {
    if (typeof body.enabled === 'boolean') {
      await this.svc.setEnabled(platformId, body.enabled);
    }
    if (typeof body.restoreEnabled === 'boolean') {
      await this.svc.setRestoreEnabled(platformId, body.restoreEnabled);
    }
    if (body.ratePct !== undefined) {
      await this.svc.setReserveRate(platformId, body.ratePct);
    }
    return this.svc.getSummary(platformId);
  }

  /**
   * 수동 테스트/보정용 엔드포인트.
   * 실제 베팅 이벤트는 서비스 내부에서 호출되며, 이 API 는 관리자가 검증/시연 시 사용.
   */
  @Post(':platformId/events')
  async postEvent(
    @Param('platformId') platformId: string,
    @Body()
    body: {
      type: 'DEDUCT' | 'RESTORE' | 'ADJUST';
      baseAmount: number;
      rate?: number;
      relatedUserId?: string;
      relatedGameId?: string;
      relatedBetId?: string;
      eventKey?: string;
      note?: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    if (!body || typeof body.baseAmount !== 'number') {
      throw new BadRequestException('baseAmount required');
    }
    const input = {
      baseAmount: body.baseAmount,
      rate: body.rate,
      relatedUserId: body.relatedUserId,
      relatedGameId: body.relatedGameId,
      relatedBetId: body.relatedBetId,
      eventKey: body.eventKey,
      note: body.note,
      createdByUserId: user.sub,
    };
    if (body.type === 'DEDUCT') return this.svc.deduct(platformId, input);
    if (body.type === 'RESTORE') return this.svc.restore(platformId, input);
    if (body.type === 'ADJUST') return this.svc.adjust(platformId, input);
    throw new BadRequestException(`unsupported type: ${body.type}`);
  }

  /** 플랫폼 알(가상 크레딧) 회수 — 잔액·상한(initial) 동시 감소 */
  @Post(':platformId/hq-recover')
  async hqRecover(
    @Param('platformId') platformId: string,
    @Body() body: { amountKrw?: number; note?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    if (body?.amountKrw == null || typeof body.amountKrw !== 'number') {
      throw new BadRequestException('amountKrw required');
    }
    return this.svc.hqRecoverCredit(
      platformId,
      body.amountKrw,
      body.note ?? null,
      user.sub,
    );
  }

  @Post(':platformId/rollback/:eventKey')
  rollback(
    @Param('platformId') _platformId: string,
    @Param('eventKey') eventKey: string,
    @Body() body: { note?: string } | undefined,
  ) {
    return this.svc.rollbackByEventKey(eventKey, body?.note ?? null);
  }
}

/**
 * 플랫폼 관리자(솔루션 어드민) 전용 알(크레딧) 가상 잔액 조회 API.
 * 자신이 속한 platformId 에 대해서만 summary / logs 를 읽을 수 있다 (수정 불가).
 */
@Controller('platforms')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN, UserRole.SUPER_ADMIN)
export class PlatformReserveReadController {
  constructor(private readonly svc: ReserveBalanceService) {}

  private assertScope(user: JwtPayload, platformId: string) {
    if (user.role === UserRole.SUPER_ADMIN) return;
    if (!user.platformId || user.platformId !== platformId) {
      throw new ForbiddenException('scope mismatch');
    }
  }

  @Get(':platformId/reserve/summary')
  getSummary(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    this.assertScope(user, platformId);
    return this.svc.getSummary(platformId);
  }

  @Get(':platformId/reserve/logs')
  listLogs(
    @Param('platformId') platformId: string,
    @CurrentUser() user: JwtPayload,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.assertScope(user, platformId);
    const typedType =
      type === 'DEDUCT' ||
      type === 'RESTORE' ||
      type === 'ADJUST' ||
      type === 'ROLLBACK'
        ? (type as ReserveTxType)
        : undefined;
    return this.svc.listLogs(platformId, {
      type: typedType,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }
}
