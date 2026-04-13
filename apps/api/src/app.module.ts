import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PublicModule } from './public/public.module';
import { PlatformsModule } from './platforms/platforms.module';
import { UsersModule } from './users/users.module';
import { PaymentModule } from './payment/payment.module';
import { SyncModule } from './sync/sync.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { WalletRequestsModule } from './wallet-requests/wallet-requests.module';
import { MeModule } from './me/me.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { HealthController } from './health.controller';
import { AgentModule } from './agent/agent.module';
import { AgentInquiriesModule } from './agent-inquiries/agent-inquiries.module';
import { RateRevisionModule } from './rate-revision/rate-revision.module';
import { DepositEventsModule } from './deposit-events/deposit-events.module';
@Module({
  controllers: [HealthController],
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
    RateRevisionModule,
    AuthModule,
    PublicModule,
    PlatformsModule,
    UsersModule,
    RegistrationsModule,
    WalletRequestsModule,
    MeModule,
    PaymentModule,
    SyncModule,
    AnnouncementsModule,
    AgentInquiriesModule,
    AgentModule,
    DepositEventsModule,
  ],
})
export class AppModule {}
