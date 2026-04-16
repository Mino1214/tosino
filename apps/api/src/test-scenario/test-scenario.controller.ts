import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { TestScenarioService } from './test-scenario.service';

@Controller('test-scenario')
@UseGuards(AuthGuard('jwt'))
export class TestScenarioController {
  constructor(private readonly svc: TestScenarioService) {}

  /**
   * POST /api/test-scenario/run
   * 전체 시나리오 실행 (fromStep 지정 가능)
   *
   * body: { fromStep: 1..9, toStep?: 1..9, platformId: string, currencies?: ("KRW"|"USDT")[] }
   */
  @Post('run')
  async run(
    @CurrentUser() user: JwtPayload,
    @Body()
    dto: {
      fromStep?: number;
      toStep?: number;
      platformId: string;
      currencies?: ('KRW' | 'USDT')[];
    },
  ) {
    this.assertAdmin(user);
    const fromStep = Math.max(1, Math.min(9, dto.fromStep ?? 1));
    const toStep = Math.max(fromStep, Math.min(9, dto.toStep ?? 9));
    const currencies = dto.currencies ?? ['KRW', 'USDT'];
    return this.svc.run(fromStep, toStep, dto.platformId, currencies);
  }

  /**
   * GET /api/test-scenario/state?platformId=xxx
   * 현재 테스트 데이터 상태 조회 (요약)
   */
  @Get('state')
  async state(
    @CurrentUser() user: JwtPayload,
    @Query('platformId') platformId: string,
  ) {
    this.assertAdmin(user);
    return this.svc['loadState'](platformId);
  }

  /**
   * GET /api/test-scenario/state/detail?platformId=xxx
   * 테스트 데이터 상세 조회 (계정·잔액·베팅내역·입출금·롤링·포인트 전체)
   */
  @Get('state/detail')
  async stateDetail(
    @CurrentUser() user: JwtPayload,
    @Query('platformId') platformId: string,
  ) {
    this.assertAdmin(user);
    return this.svc.loadDetailedState(platformId);
  }

  /**
   * DELETE /api/test-scenario/cleanup/:platformId
   * 테스트 데이터 전체 삭제 (loginId가 test_ 로 시작하는 유저)
   */
  @Delete('cleanup/:platformId')
  async cleanup(
    @CurrentUser() user: JwtPayload,
    @Param('platformId') platformId: string,
  ) {
    this.assertAdmin(user);
    return this.svc.cleanup(platformId);
  }

  /**
   * GET /api/test-scenario/steps
   * 사용 가능한 스텝 목록
   */
  @Get('steps')
  steps() {
    return {
      steps: [
        { step: 1, name: 'SETUP', desc: '총판(최상위2+하위4) + KRW유저 9명 + USDT유저 3명 생성, 플랫폼 롤링 설정' },
        { step: 2, name: 'DEPOSIT_REQUEST', desc: 'KRW 입금신청 + USDT 입금 시뮬레이션 (최소미달 포함)' },
        { step: 3, name: 'DEPOSIT_APPROVE', desc: 'KRW 반가상 자동승인 + USDT 최소금액 이상 자동크레딧' },
        { step: 4, name: 'CASINO_PLAY', desc: '8라운드 카지노 시뮬레이션 (승3+패5), BET/WIN 원장 + 롤링 적립' },
        { step: 5, name: 'ROLLING_FULFILL', desc: '롤링 잔여량만큼 추가 베팅해서 출금조건 충족' },
        { step: 6, name: 'COMP_POINTS', desc: '테스트 유저 전체에 500포인트 일괄지급' },
        { step: 7, name: 'WITHDRAWAL_REQUEST', desc: '출금신청 (잔액 80%, KRW/USDT 각각)' },
        { step: 8, name: 'WITHDRAWAL_APPROVE', desc: '출금승인 + 업비트 시세 기준 USDT 환산금액 표기' },
        {
          step: 9,
          name: 'AGENT_SETTLEMENT',
          desc: '총판 정산 시뮬(다운라인 승인 입금−출금 × 실효요율 → 총판 지갑 ADJUSTMENT)',
        },
      ],
      usage:
        'POST /api/test-scenario/run { "fromStep": 1, "toStep": 9, "platformId": "...", "currencies": ["KRW","USDT"] }',
      cleanup: 'DELETE /api/test-scenario/cleanup/:platformId',
    };
  }

  private assertAdmin(user: JwtPayload) {
    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new Error('관리자만 사용할 수 있습니다');
    }
  }
}
