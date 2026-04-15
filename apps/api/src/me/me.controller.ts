import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LedgerEntryType, UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { WalletRequestsService } from '../wallet-requests/wallet-requests.service';
import { CreateWalletRequestDto } from '../wallet-requests/dto/create-wallet-request.dto';
import { ForbiddenException } from '@nestjs/common';
import { UpdateUserMemoDto } from '../users/dto/update-user-memo.dto';
import { VinusService } from '../vinus/vinus.service';
import { VinusLaunchDto } from '../vinus/dto/vinus-launch.dto';
import { UpdatePayoutAccountDto } from './dto/update-payout-account.dto';
import { RollingObligationService } from '../rolling/rolling-obligation.service';
import { PointsService } from '../points/points.service';
import { resolvePublicMediaUrl } from '../common/utils/media-url.util';
import { RedeemPointsDto } from './dto/redeem-points.dto';
import { UpdateUsdtWalletDto } from './dto/update-usdt-wallet.dto';

@Controller('me')
@UseGuards(AuthGuard('jwt'))
export class MeController {
  constructor(
    private prisma: PrismaService,
    private walletRequests: WalletRequestsService,
    private vinus: VinusService,
    private rolling: RollingObligationService,
    private points: PointsService,
  ) {}

  private assertEndUser(payload: JwtPayload) {
    if (payload.role !== UserRole.USER) {
      throw new ForbiddenException('솔루션 회원 전용입니다');
    }
  }

  @Get('profile')
  async profile(@CurrentUser() user: JwtPayload) {
    const row = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        platformId: true,
        registrationStatus: true,
        referralCode: true,
        userMemo: true,
        agentMemo: true,
        signupMode: true,
        signupReferralInput: true,
        bankCode: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
        usdtWalletAddress: true,
      },
    });
    return row;
  }

  @Patch('payout-account')
  async updateMyPayoutAccount(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePayoutAccountDto,
  ) {
    this.assertEndUser(user);

    const me = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { signupMode: true },
    });
    if (me?.signupMode === 'anonymous') {
      throw new BadRequestException(
        '무기명 회원은 원화 계좌 대신 테더 지갑 주소를 사용합니다',
      );
    }

    const bankCode = dto.bankCode.trim();
    const bankAccountNumber = dto.bankAccountNumber.trim();
    const bankAccountHolder = dto.bankAccountHolder.trim();

    if (!bankCode || !bankAccountNumber || !bankAccountHolder) {
      throw new BadRequestException(
        '은행명, 계좌번호, 예금주를 모두 입력하세요',
      );
    }

    await this.prisma.user.update({
      where: { id: user.sub },
      data: {
        bankCode,
        bankAccountNumber,
        bankAccountHolder,
      },
    });

    return { ok: true };
  }

  @Patch('usdt-wallet')
  async updateMyUsdtWallet(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateUsdtWalletDto,
  ) {
    this.assertEndUser(user);

    const walletAddress = dto.usdtWalletAddress.trim();
    if (!walletAddress || walletAddress.length < 20) {
      throw new BadRequestException('테더 지갑 주소를 다시 확인해주세요');
    }

    await this.prisma.user.update({
      where: { id: user.sub },
      data: {
        usdtWalletAddress: walletAddress,
      },
    });

    return { ok: true };
  }

  @Patch('user-memo')
  async updateMyUserMemo(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateUserMemoDto,
  ) {
    if (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException(
        '플랫폼 관리 화면에서 회원별 메모를 수정하세요',
      );
    }
    const v = dto.userMemo.trim();
    await this.prisma.user.update({
      where: { id: user.sub },
      data: { userMemo: v.length ? v : null },
    });
    return { ok: true };
  }

  @Get('wallet')
  async wallet(@CurrentUser() user: JwtPayload) {
    this.assertEndUser(user);
    const w = await this.prisma.wallet.findUnique({
      where: { userId: user.sub },
    });
    return {
      balance: w?.balance?.toFixed(2) ?? '0.00',
      pointBalance: w?.pointBalance?.toFixed(2) ?? '0.00',
    };
  }

  @Get('deposit-account')
  async depositAccount(@CurrentUser() user: JwtPayload) {
    this.assertEndUser(user);
    if (!user.platformId) {
      throw new ForbiddenException('플랫폼 소속 회원만 이용할 수 있습니다');
    }

    const [me, platform] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: user.sub },
        select: {
          signupMode: true,
          bankCode: true,
          bankAccountNumber: true,
          bankAccountHolder: true,
        },
      }),
      this.prisma.platform.findUnique({
        where: { id: user.platformId },
        select: {
          semiVirtualEnabled: true,
          semiVirtualRecipientPhone: true,
          semiVirtualAccountHint: true,
          semiVirtualBankName: true,
          semiVirtualAccountNumber: true,
          semiVirtualAccountHolder: true,
        },
      }),
    ]);

    if (!me || !platform) {
      throw new NotFoundException('입금 계좌 정보를 찾을 수 없습니다');
    }

    return {
      mode: me.signupMode === 'anonymous' ? 'USDT' : 'KRW',
      autoCreditEnabled: platform.semiVirtualEnabled,
      depositAccount: {
        bankName: platform.semiVirtualBankName,
        accountNumber: platform.semiVirtualAccountNumber,
        accountHolder: platform.semiVirtualAccountHolder,
        accountHint: platform.semiVirtualAccountHint,
        recipientPhone: platform.semiVirtualRecipientPhone,
      },
      registeredAccount: {
        bankCode: me.bankCode,
        accountNumber: me.bankAccountNumber,
        accountHolder: me.bankAccountHolder,
        ready: Boolean(
          me.bankCode && me.bankAccountNumber && me.bankAccountHolder,
        ),
      },
    };
  }

  @Get('rolling-summary')
  rollingSummary(@CurrentUser() user: JwtPayload) {
    this.assertEndUser(user);
    return this.rolling.getSummaryForUser(user.sub);
  }

  @Get('betting-history')
  async bettingHistory(@CurrentUser() user: JwtPayload) {
    this.assertEndUser(user);
    // BET 엔트리 최대 80건
    const bets = await this.prisma.ledgerEntry.findMany({
      where: { userId: user.sub, type: LedgerEntryType.BET },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
    if (bets.length === 0) return [];

    // 같은 reference 의 WIN 엔트리를 한 번에 조회
    const refs = bets.map((b) => b.reference).filter(Boolean) as string[];
    const wins = refs.length > 0
      ? await this.prisma.ledgerEntry.findMany({
          where: {
            userId: user.sub,
            type: LedgerEntryType.WIN,
            reference: { in: refs },
          },
        })
      : [];
    const winMap = new Map<string, typeof wins[0]>();
    for (const w of wins) {
      if (w.reference) winMap.set(w.reference, w);
    }

    const now = Date.now();
    return bets.map((b) => {
      const meta = (b.metaJson as Record<string, unknown>) || {};
      const cmd = typeof meta.command === 'string' ? meta.command : '';
      const vertical = typeof meta.vertical === 'string' ? meta.vertical : '';
      const category =
        cmd === 'sports-bet' || vertical === 'sports'
          ? 'sports'
          : vertical === 'minigame' || cmd === 'minigame-bet'
            ? 'minigame'
            : 'casino';

      const gameLabel =
        typeof meta.gameName === 'string'
          ? meta.gameName
          : typeof meta.providerName === 'string'
            ? `${meta.providerName}`
            : cmd || '카지노 게임';

      const win = b.reference ? winMap.get(b.reference) : undefined;
      const betAmt = b.amount.abs().toNumber();
      const winAmt = win ? win.amount.toNumber() : 0;

      // 5분 이내이고 WIN 없으면 pending, 이후면 lose
      const isRecent = now - b.createdAt.getTime() < 5 * 60 * 1000;
      let status: 'pending' | 'win' | 'lose' | 'cancel' = 'pending';
      if (win) {
        status = winAmt > 0 ? 'win' : 'lose';
      } else if (!isRecent) {
        status = 'lose';
      }

      return {
        id: b.id,
        createdAt: b.createdAt.toISOString(),
        betAmount: betAmt.toFixed(2),
        winAmount: win ? winAmt.toFixed(2) : null,
        netResult: win ? (winAmt - betAmt).toFixed(2) : (-betAmt).toFixed(2),
        reference: b.reference,
        category,
        gameLabel,
        status,
        vertical,
      };
    });
  }

  @Get('session-guards')
  async sessionGuards(@CurrentUser() user: JwtPayload) {
    this.assertEndUser(user);
    if (!user.platformId) {
      throw new ForbiddenException('플랫폼 소속 회원만 이용할 수 있습니다');
    }
    const mandatory = await this.prisma.platformAnnouncement.findMany({
      where: {
        platformId: user.platformId,
        active: true,
        mandatoryRead: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
    const reads = await this.prisma.announcementRead.findMany({
      where: { userId: user.sub },
      select: { announcementId: true },
    });
    const readSet = new Set(reads.map((x) => x.announcementId));
    const unread = mandatory.filter((a) => !readSet.has(a.id));
    return {
      unreadMandatory: unread.map((a) => ({
        id: a.id,
        imageUrl: resolvePublicMediaUrl(a.imageUrl),
      })),
    };
  }

  @Post('announcements/:announcementId/ack')
  async ackAnnouncement(
    @CurrentUser() user: JwtPayload,
    @Param('announcementId') announcementId: string,
  ) {
    this.assertEndUser(user);
    if (!user.platformId) {
      throw new ForbiddenException('플랫폼 소속 회원만 이용할 수 있습니다');
    }
    const ann = await this.prisma.platformAnnouncement.findFirst({
      where: { id: announcementId, platformId: user.platformId, active: true },
    });
    if (!ann) throw new NotFoundException();
    await this.prisma.announcementRead.upsert({
      where: {
        userId_announcementId: {
          userId: user.sub,
          announcementId,
        },
      },
      create: { userId: user.sub, announcementId },
      update: { readAt: new Date() },
    });
    return { ok: true };
  }

  @Post('points/attend')
  attendPoints(@CurrentUser() user: JwtPayload) {
    this.assertEndUser(user);
    if (!user.platformId) {
      throw new ForbiddenException('플랫폼 소속 회원만 이용할 수 있습니다');
    }
    return this.points.attend(user.sub, user.platformId);
  }

  @Post('points/redeem')
  redeemPoints(@CurrentUser() user: JwtPayload, @Body() dto: RedeemPointsDto) {
    this.assertEndUser(user);
    if (!user.platformId) {
      throw new ForbiddenException('플랫폼 소속 회원만 이용할 수 있습니다');
    }
    return this.points.redeem(
      user.sub,
      user.platformId,
      dto.points,
      dto.currency,
    );
  }

  @Get('points/ledger')
  pointLedger(@CurrentUser() user: JwtPayload) {
    this.assertEndUser(user);
    return this.points.listLedger(user.sub);
  }

  @Post('wallet-requests')
  createRequest(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateWalletRequestDto,
  ) {
    this.assertEndUser(user);
    return this.walletRequests.createForUser(
      user.sub,
      user.platformId,
      dto.type,
      dto.amount,
      dto.note,
      dto.depositorName,
      dto.currency === 'USDT' ? 'USDT' : 'KRW',
    );
  }

  @Get('wallet-requests')
  listRequests(@CurrentUser() user: JwtPayload) {
    this.assertEndUser(user);
    return this.walletRequests.listMine(user.sub);
  }

  @Get('wallet-requests/active-deposit')
  getActiveDeposit(@CurrentUser() user: JwtPayload) {
    this.assertEndUser(user);
    if (!user.platformId) throw new ForbiddenException();
    return this.walletRequests.getActivePendingDeposit(user.sub, user.platformId);
  }

  @Delete('wallet-requests/:id')
  cancelRequest(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    this.assertEndUser(user);
    return this.walletRequests.cancelMine(user.sub, id);
  }

  /** Vinus Gaming 라이브 카지노 실행 URL (토큰 발급 후 play-game 호출) */
  @Post('casino/vinus/launch')
  async launchVinusCasino(
    @CurrentUser() user: JwtPayload,
    @Body() dto: VinusLaunchDto,
  ) {
    this.assertEndUser(user);
    if (!user.platformId) {
      throw new ForbiddenException('플랫폼 소속 회원만 이용할 수 있습니다');
    }
    return this.vinus.launch(user.sub, user.platformId, dto);
  }
}
