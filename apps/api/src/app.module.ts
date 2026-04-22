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
import { HqHealthController } from './hq-health.controller';
import { AgentModule } from './agent/agent.module';
import { AgentInquiriesModule } from './agent-inquiries/agent-inquiries.module';
import { RateRevisionModule } from './rate-revision/rate-revision.module';
import { DepositEventsModule } from './deposit-events/deposit-events.module';
import { UsdtDepositModule } from './usdt-deposit/usdt-deposit.module';
import { TestScenarioModule } from './test-scenario/test-scenario.module';
import { CreditsModule } from './credits/credits.module';
import { OddsApiWsModule } from './odds-api-ws/odds-api-ws.module';
import { CrawlerMappingsModule } from './crawler-mappings/crawler-mappings.module';
import { SemiVirtualModule } from './semi-virtual/semi-virtual.module';
import { BlacklistModule } from './blacklist/blacklist.module';
import { ReserveBalanceModule } from './reserve-balance/reserve-balance.module';
import { IpAccessModule } from './ip-access/ip-access.module';
@Module({
  controllers: [HealthController, HqHealthController],
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
    UsdtDepositModule,
    TestScenarioModule,
    CreditsModule,
    OddsApiWsModule,
    CrawlerMappingsModule,
    SemiVirtualModule,
    BlacklistModule,
    ReserveBalanceModule,
    IpAccessModule,
  ],
})
export class AppModule {}
