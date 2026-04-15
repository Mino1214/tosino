import { Module } from '@nestjs/common';
import { TestScenarioController } from './test-scenario.controller';
import { TestScenarioService } from './test-scenario.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletRequestsModule } from '../wallet-requests/wallet-requests.module';
import { RollingModule } from '../rolling/rolling.module';
import { PointsModule } from '../points/points.module';
import { UsdtDepositModule } from '../usdt-deposit/usdt-deposit.module';

@Module({
  imports: [
    PrismaModule,
    WalletRequestsModule,
    RollingModule,
    PointsModule,
    UsdtDepositModule,
  ],
  controllers: [TestScenarioController],
  providers: [TestScenarioService],
})
export class TestScenarioModule {}
