process.env.TOSINO_PROCESS_ROLE = 'comp-settlement-worker';

import './bootstrap-env';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CompSettlementWorkerModule } from './comp-settlement-worker.module';

async function bootstrap() {
  const logger = new Logger('CompSettlementWorker');
  const app = await NestFactory.createApplicationContext(CompSettlementWorkerModule, {
    logger: ['error', 'warn', 'log'],
  });
  logger.log('comp-settlement-worker 기동 (Bull 큐 comp-settlement 소비)');

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
