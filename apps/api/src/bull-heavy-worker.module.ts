import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { CompSettlementBullModule } from './platforms/comp-settlement-bull.module';
import { PrismaModule } from './prisma/prisma.module';
import { SyncModule } from './sync/sync.module';
import { UsdtDepositModule } from './usdt-deposit/usdt-deposit.module';

/**
 * HTTP 없이 `sync` / `usdt-deposit` / `comp-settlement` 를 한 프로세스에서 처리(선택).
 * PM2 기본은 큐별 전용 워커 3개 — 한 PC에서 프로세스 줄이려면 이 엔트리 사용.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const urlStr = config.get<string>('REDIS_URL') || 'redis://127.0.0.1:6379';
        const u = new URL(urlStr);
        return {
          connection: {
            host: u.hostname,
            port: Number(u.port || 6379),
            password: u.password || undefined,
            username: u.username || undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
    PrismaModule,
    SyncModule,
    UsdtDepositModule,
    CompSettlementBullModule,
  ],
})
export class BullHeavyWorkerModule {}
