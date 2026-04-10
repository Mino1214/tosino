import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
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

@Controller('me')
@UseGuards(AuthGuard('jwt'))
export class MeController {
  constructor(
    private prisma: PrismaService,
    private walletRequests: WalletRequestsService,
    private vinus: VinusService,
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
        bankCode: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
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
    return { balance: w?.balance?.toFixed(2) ?? '0.00' };
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
    );
  }

  @Get('wallet-requests')
  listRequests(@CurrentUser() user: JwtPayload) {
    this.assertEndUser(user);
    return this.walletRequests.listMine(user.sub);
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
