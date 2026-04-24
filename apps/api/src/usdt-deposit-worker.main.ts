process.env.TOSINO_PROCESS_ROLE = 'usdt-deposit-worker';

import './bootstrap-env';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { UsdtDepositWorkerModule } from './usdt-deposit-worker.module';

async function bootstrap() {
  const logger = new Logger('UsdtDepositWorker');
  const app = await NestFactory.createApplicationContext(UsdtDepositWorkerModule, {
    logger: ['error', 'warn', 'log'],
  });
  logger.log('usdt-deposit-worker 기동 (Bull 큐 usdt-deposit)');

  const shutdown = async (signal: string) => {
    logger.log(`${signal} 수신 — 종료 중`);
    await app.close();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
