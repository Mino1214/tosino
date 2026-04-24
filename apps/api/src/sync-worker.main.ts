process.env.TOSINO_PROCESS_ROLE = 'sync-worker';
process.env.ODDS_API_WS_AUTOCONNECT = 'false';

import './bootstrap-env';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SyncWorkerModule } from './sync-worker.module';

async function bootstrap() {
  const logger = new Logger('SyncWorker');
  const app = await NestFactory.createApplicationContext(SyncWorkerModule, {
    logger: ['error', 'warn', 'log'],
  });
  logger.log('sync-worker 기동 (Bull 큐 sync)');

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
