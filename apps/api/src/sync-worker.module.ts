import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { SyncModule } from './sync/sync.module';

/** `sync` 큐 소비·ODDS 주기 등록 전용 (PC 분리 시 이 프로세스만 옮기면 됨). */
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
  ],
})
export class SyncWorkerModule {}
