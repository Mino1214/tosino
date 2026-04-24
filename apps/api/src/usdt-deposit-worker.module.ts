import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { UsdtDepositModule } from './usdt-deposit/usdt-deposit.module';

/** `usdt-deposit` 큐 소비·입금 폴링 주기 전용. */
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
    UsdtDepositModule,
  ],
})
export class UsdtDepositWorkerModule {}
